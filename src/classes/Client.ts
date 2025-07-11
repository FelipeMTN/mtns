import fs from "fs";
import crypto from "node:crypto";
import * as os from "node:os";
import { promisify } from "node:util";
import { gunzip } from "node:zlib";
import path from "path";
import { NConfig } from "@nortex/config";
import { logPrettyZodError, prettifyZodError } from "@nortex/pretty-zod-error";
import { Client as DJSClient, GatewayIntentBits, Partials, WebhookClient } from "discord.js";
import { config } from "dotenv";
import { glob } from "glob";
import * as yaml from "js-yaml";
import { CommandHandler, ComponentHandler, ContextMenuHandler, createCommands, createComponents, createContextMenu, createEvents, EventHandler } from "nhandler";
import { ZodError, ZodType } from "zod";

import { LoggingLevel, loggingLevel } from "@util/loggingLevel";
import { RateLimiter } from "@util/rateLimiter";
import { withCommands, withComponents, withContextMenuActions, withEvents } from "@util/registrars";
import { ensureNodeVersion } from "@util/runtime/ensureNodeVersion";
import { checkFirstRun } from "@util/runtime/firstRun";
import { notifyConfigChanges } from "@util/runtime/notifyConfigChanges";
import { printWelcome } from "@util/runtime/printWelcome";

import { CustomizationConfig, customizationConfig } from "@schemas/customization";
import { MainConfig, mainConfig } from "@schemas/main";
import { PaymentsConfig, paymentsConfig } from "@schemas/payments";
import { promptsConfig, PromptsConfig } from "@schemas/prompts";
import { servicesConfig, ServicesConfig } from "@schemas/services";
import { ticketsConfig, TicketsConfig } from "@schemas/tickets";

import WebServer from "@api/WebServer";

import { Gateway } from "../gateways/base";
import Database from "./Database";
import Logger from "./Logger";

export let CLIENT_INSTANCE: Client | undefined;

export type Config = {
	main: MainConfig;
	tickets: TicketsConfig;
	customization: CustomizationConfig;
	payments: PaymentsConfig;
	prompts: PromptsConfig;
	services: ServicesConfig;
};

export type AiChatHistory = {
	userId: string;
	role: string;
	content: string;
};

config();
export default class Client extends DJSClient {
	public static commandHandler: CommandHandler;
	public static componentHandler: ComponentHandler;
	public static eventHandler: EventHandler;
	public static contextMenuHandler: ContextMenuHandler;
	public config: Config;
	public lang: Record<string, string>;
	public initDate: number;
	public ticketCooldowns: Map<string, number>;
	public logWebhook?: WebhookClient;
	public locales: Record<string, Record<string, string>> = {};
	public gateways: Gateway[] = [];
	public pastAiChats: AiChatHistory[];
	public aiRateLimiter;

	private readonly CONFIG_FOLDER: string = "config";

	constructor() {
		super({
			intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent],
			partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
		});

		CLIENT_INSTANCE = this;

		printWelcome();
		notifyConfigChanges();
		ensureNodeVersion();

		this.CONFIG_FOLDER = process.env.CONFIG_DIR || "config";
		if (this.CONFIG_FOLDER !== "config") Logger.warn(`Using config directory override from env: ${this.CONFIG_FOLDER}.`);

		try {
			this.config = this.setupConfigs();
		} catch (err) {
			if (err instanceof ZodError) {
				Logger.error("Error while parsing the configs:");
				Logger.error(prettifyZodError(err));
			} else {
				Logger.error(err);
			}
			process.exit(1);
		}
		this.lang = this.setupLocale();
		this.initDate = Date.now();
		this.ticketCooldowns = new Map();
		this.pastAiChats = [];

		this.aiRateLimiter = new RateLimiter(60 * 60 * 1000, this.config.main.ai.rateLimitPerHr);
		setInterval(() => this.aiRateLimiter.cleanup(), 3600000);

		if (this.config.tickets.transcripts.downloadAttachments) {
			Logger.warn("Transcript attachment downloading is enabled.");
		}

		const db = new Database(this);
		new WebServer(this.config.main.api.port, this.config.main.api.ssl.port);

		if (this.config.main.process.logging.webhookUrl) this.setupWebhookLogging();
		this.suppressUncaughtExceptions();

		db.on("connected", () => {
			Client.commandHandler = this.createCommandHandler();
			Client.componentHandler = this.createComponentHandler();
			Client.eventHandler = this.createEventHandler();
			Client.contextMenuHandler = this.createContextMenuHandler();
			this.run();
			this.loadGateways();
		});

		Logger.trace("Debug logging enabled.");
	}

	async run() {
		try {
			await super.login(this.config.main.token);
			checkFirstRun();
		} catch (err) {
			Logger.error("Can't login as the bot.", err);
		}
	}

	createCommandHandler() {
		if (loggingLevel() > LoggingLevel.MINIMAL) Logger.runtime("Loading commands...");
		return withCommands(
			createCommands<Client>({
				client: this,
				debug: this.config.main.process.logging.handlerDebug || undefined,
			}),
		);
	}

	createEventHandler() {
		if (loggingLevel() > LoggingLevel.MINIMAL) Logger.runtime("Loading events...");
		return withEvents(
			createEvents({
				client: this,
				debug: this.config.main.process.logging.handlerDebug || undefined,
			}),
		);
	}

	createComponentHandler() {
		if (loggingLevel() > LoggingLevel.MINIMAL) Logger.runtime("Loading components...");
		return withComponents(
			createComponents({
				client: this,
				debug: this.config.main.process.logging.handlerDebug || undefined,
			}),
		);
	}

	createContextMenuHandler() {
		if (loggingLevel() > LoggingLevel.MINIMAL) Logger.runtime("Loading context menu actions...");
		return withContextMenuActions(
			createContextMenu({
				client: this,
				debug: this.config.main.process.logging.handlerDebug || undefined,
			}),
		);
	}

	suppressUncaughtExceptions() {
		process.on("uncaughtException", (err) => {
			Logger.error("Uncaught exception:", err);
		});
	}

	setupWebhookLogging() {
		this.logWebhook = new WebhookClient({
			url: this.config.main.process.logging.webhookUrl!,
		});
	}

	setupConfigs(): Config {
		const getConfigPath = (file: string) => {
			return path.join(process.cwd(), `./${this.CONFIG_FOLDER}/${file}`);
		};

		const nconfig = new NConfig();
		const mainConfigInst = nconfig.parse<MainConfig>(mainConfig as any, { filePath: getConfigPath("main.yml") });
		const ticketsConfigInst = nconfig.parse<TicketsConfig>(ticketsConfig as any, {
			filePath: getConfigPath("tickets.yml"),
		});
		const custConfigInst = nconfig.parse<CustomizationConfig>(customizationConfig as any, {
			filePath: getConfigPath("customization.yml"),
		});
		const paymentsConfigInst = nconfig.parse<PaymentsConfig>(paymentsConfig as any, {
			filePath: getConfigPath("payments.yml"),
		});
		const promptsConfigInst = nconfig.parse<PromptsConfig>(promptsConfig as any, {
			filePath: getConfigPath("prompts.yml"),
		});
		const servicesConfigInst = nconfig.parse<ServicesConfig>(servicesConfig as any, {
			filePath: getConfigPath("services.yml"),
		});

		return {
			main: mainConfigInst,
			tickets: ticketsConfigInst,
			payments: paymentsConfigInst,
			customization: custConfigInst,
			prompts: promptsConfigInst,
			services: servicesConfigInst,
		};
	}

	setupLocale(): Record<string, string> {
		const localesDirPath = path.join(process.cwd(), this.CONFIG_FOLDER, "locales");
		if (!fs.existsSync(localesDirPath)) {
			Logger.error("Locales directory does not exist. Please copy the 'config/locales' folder from the downloaded files.");
			process.exit(1);
		}

		Logger.runtime(`Using default locale ${this.config.main.language}.`);

		fs.readdirSync(localesDirPath).forEach((file) => {
			if (file.endsWith(".yml")) {
				const localeName = path.basename(file, ".yml");
				try {
					const langData = fs.readFileSync(path.join(localesDirPath, file), "utf8");
					this.locales[localeName] = yaml.load(langData) as Record<string, string>;
				} catch (err: any) {
					Logger.error(`Failed to load language file for "${localeName}": ${err.message}`);
				}
			}
		});

		if (this.locales[this.config.main.language]) {
			return this.locales[this.config.main.language];
		} else {
			Logger.error(`Language file for "${this.config.main.language}" does not exist.`);
			process.exit(1);
		}
	}

	private async loadGateways() {
		const gunzipAsync = promisify(gunzip);
		try {
			const extFiles = await glob("extensions/**/*.ext", {
				cwd: process.cwd(),
				absolute: true,
			});

			for (const file of extFiles) {
				try {
					const compressedContent = fs.readFileSync(file);
					const decompressedContent = await gunzipAsync(compressedContent);

					let tempPath = path.join(os.tmpdir(), `gateway-${crypto.randomBytes(16).toString("hex")}.js`);
					fs.writeFileSync(tempPath, decompressedContent);

					const gatewayModule = await import("file://" + tempPath);
					// const gatewayModule = require(tempPath);

					const GatewayClass = Object.values(gatewayModule)[0];

					fs.unlinkSync(tempPath);

					if (typeof GatewayClass !== "function") {
						Logger.error(`Bad extension loaded: Invalid gateway class in ${file}`);
						continue;
					}

					if (!("configShape" in GatewayClass) || !GatewayClass.configShape) {
						Logger.error(`Bad extension loaded: Extension lacks a config schema: ${file}.`);
						continue;
					}
					const configSchema = GatewayClass.configShape as ZodType;
					if (!configSchema) {
						Logger.error(`Bad extension loaded: Invalid config schema in ${file}.`);
						continue;
					}

					const gatewayName = path.basename(file, ".ext");
					const gatewayConfig = this.config.payments[gatewayName];

					if (!gatewayConfig) {
						Logger.error(
							`No config found for gateway '${gatewayName}'. Define an object for it in payments.yml to start this extension. Available configs from payments.yml: ${Object.keys(this.config.payments)
								.map((d) => `'${d}'`)
								.join(", ")}.`,
						);
						continue;
					}

					const configResult = configSchema.safeParse(gatewayConfig);

					if (!configResult.success) {
						Logger.error(`Config validation failed for ${gatewayName}:`);
						logPrettyZodError(configResult.error);
						continue;
					}

					// @ts-expect-error This will always be a class
					const gateway = new GatewayClass(configResult.data);

					this.gateways.push(gateway);

					Logger.trace(`Loaded gateway ${gatewayName}. Initializing.`);
					gateway.initialize(this);
				} catch (err) {
					Logger.error(`Failed to load gateway ${file}:`, err);
				}
			}

			Logger.runtime(`Loaded ${this.gateways.length} payment gateway extensions.`);
		} catch (err) {
			Logger.error("Failed to load gateways:", err);
			throw err;
		}
	}
}
