import { z } from "zod";

export const mainConfig = z.object({
	token: z.string(),
	dbUrl: z.string(),
	language: z.string().default("en-US"),
	dynamicLanguage: z.boolean().default(true),
	owners: z.array(z.string()),
	guilds: z.array(z.string()).default([]),
	updateCommands: z.boolean().default(true),
	status: z
		.object({
			status: z.enum(["online", "idle", "dnd", "invisible"]),
			activity: z.string().optional(),
		})
		.default({
			status: "online",
			activity: "",
		}),
	process: z.object({
		purgeDatabaseOnRun: z.boolean().default(false),
		logging: z.object({
			level: z.enum(["minimal", "normal", "debug"]).default("normal"),
			connectionDebug: z.boolean().default(false),
			databaseDebug: z.boolean().default(false),
			handlerDebug: z.boolean().default(false),
			webhookUrl: z.string().optional(),
		}),
	}),
	api: z.object({
		url: z.string().url().default("http://localhost:2020"),
		port: z.number(),
		keys: z.array(z.string()).default([]),
		ssl: z.object({
			enabled: z.boolean().default(false),
			port: z.number().optional(),
			key: z.string().optional(),
			cert: z.string().optional(),
		}),
		endpoints: z.object({
			tickets: z.object({
				enabled: z.boolean().default(true),
			}),
			transcripts: z.object({
				enabled: z.boolean().default(true),
			}),
			bank: z.object({
				enabled: z.boolean().default(true),
			}),
			users: z.object({
				enabled: z.boolean().default(true),
			}),
		}),
	}),
	ai: z
		.object({
			enabled: z.boolean().default(false),
			model: z.string().default("llama3.2"),
			historyLength: z.number().default(10),
			rateLimitPerHr: z.number().default(5),
			openai: z
				.object({
					key: z.string(),
				})
				.optional(),
			systemText: z.string().optional(),
		})
		.default({
			enabled: false,
			model: "llama3.2",
			historyLength: 10,
		}),
});

export type MainConfig = z.infer<typeof mainConfig>;
