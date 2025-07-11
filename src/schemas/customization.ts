import { z } from "zod";

const panelSchema = z.object({
	color: z.number(),
	title: z.string().optional(),
	imageUrl: z.string().optional(),
	description: z.string().optional(),
	buttons: z.object({
		commission: z.object({
			label: z.string(),
			emoji: z.string().optional(),
		}),
		application: z.object({
			label: z.string(),
			emoji: z.string().optional(),
		}),
		support: z.object({
			label: z.string(),
			emoji: z.string().optional(),
		}),
	}),
});

const embedsSchema = z.object({
	footer: z.string().optional(),
	colors: z.object({
		normal: z.number(),
		error: z.number(),
		success: z.number(),
	}),
});

const buttonsSchema = z.object({
	emojis: z.object({
		archive: z.string().default("🗑️"),
		unarchive: z.string().default("📥"),
		quote: z.string().default("💵"),
		message: z.string().default("✉️"),
		cancel: z.string().default("❌"),
	}),
});

export const customizationConfig = z.object({
	panel: panelSchema,
	embeds: embedsSchema,
	buttons: buttonsSchema,
});

export type CustomizationConfig = z.infer<typeof customizationConfig>;
