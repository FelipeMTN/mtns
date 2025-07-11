import { clearLine, moveCursor } from "node:readline";
import { inspect } from "node:util";
import c, { stripColor } from "ansi-colors";
import dayjs from "dayjs";
import { Colors, EmbedBuilder } from "discord.js";

import { LoggingLevel, loggingLevel } from "@util/loggingLevel";

import { CLIENT_INSTANCE } from "./Client";

let lastMessage: string = "";
let times = 1;

export default class Logger {
	// UTILS
	private static readonly PREFIX_WIDTH = 7;

	static getDate() {
		return `${c.dim("[" + dayjs().format("DD MMM YYYY HH:mm:ss") + "]")}`;
	}

	private static sendWh(embed: EmbedBuilder) {
		if (!CLIENT_INSTANCE) return;
		if (CLIENT_INSTANCE.logWebhook) CLIENT_INSTANCE.logWebhook.send({ embeds: [embed] });
	}

	private static getRightPadding(len: number) {
		return this.PREFIX_WIDTH - len > 0 ? " ".repeat(this.PREFIX_WIDTH - len) : "";
	}

	private static send(message: any[], type: string) {
		if (message.join(" ") === lastMessage) {
			moveCursor(process.stdout as any, 0, -1);
			clearLine(process.stdout as any, 1);
			times++;
		} else {
			times = 1;
		}
		lastMessage = message.join(" ");

		const logPrefix = `${this.getDate()} ${type}${this.getRightPadding(stripColor(type).length)}`;
		const separator = "|";
		const content = message.map((m: any) => (typeof m === "string" ? m : inspect(m))).join(" ");
		const timesFormatted = times > 1 ? c.dim(`(${times}x)`) : "";

		process.stdout.write([logPrefix, separator, content, timesFormatted].join(" ") + "\n");
	}
	// END UTILS

	static runtime(...message: any) {
		this.send(message, c.magenta.italic("Boot"));
	}

	static trace(...message: any) {
		if (loggingLevel() < LoggingLevel.DEBUG) return;
		this.send(message, c.dim.italic("Trace"));
	}

	static log(...message: any) {
		if (CLIENT_INSTANCE?.config.main.process.logging.level !== "debug") return;
		this.send(message, c.cyan.italic("Log"));
		this.sendWh(new EmbedBuilder().setAuthor({ name: "Log" }).setDescription(message.join(" ")).setColor(Colors.White));
	}

	static info(...message: any) {
		this.send(message, c.blueBright.italic("Info"));
		this.sendWh(new EmbedBuilder().setAuthor({ name: "Info" }).setDescription(message.join(" ")).setColor(Colors.Blue));
	}

	static warn(...message: any) {
		this.send(message, c.yellowBright.italic("Warning"));
		this.sendWh(new EmbedBuilder().setAuthor({ name: "Warn" }).setDescription(message.join(" ")).setColor(Colors.Orange));
	}

	static success(...message: any) {
		this.send(message, c.greenBright.italic("Success"));
		this.sendWh(new EmbedBuilder().setAuthor({ name: "Success" }).setDescription(message.join(" ")).setColor(Colors.Green));
	}

	static error(...message: any) {
		this.send(message, c.red.italic("Error"));
		this.sendWh(new EmbedBuilder().setAuthor({ name: "Error" }).setDescription(message.join(" ")).setColor(Colors.Red));
	}
}
