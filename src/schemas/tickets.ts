import { z } from "zod";

const trialSchema = z.object({
	name: z.string(),
	deadline: z.number(),
	content: z.string(),
});

const trialsSchema = z.object({
	footer: z.string().optional(),
	reminders: z.object({
		enabled: z.boolean().default(true),
		interval: z.number().min(0).max(120).default(24),
	}),
	list: z.array(trialSchema).default([]),
});

export const ticketsConfig = z.object({
	enabled: z
		.object({
			commissions: z.boolean().default(true),
			applications: z.boolean().default(true),
			support: z.boolean().default(true),
		})
		.default({}),
	cooldown: z.number().default(60),
	quotesInChannels: z.boolean().default(false),
	sendNewUserWelcome: z.boolean().default(true),
	channelNameTemplates: z.object({
		commissions: z.string().default("{SERVICE}-{SERIALID}"),
		applications: z.string().default("{TYPE}-{SERIALID}"),
		support: z.string().default("{TYPE}-{SERIALID}"),
		pending: z.string().default("pending-{SERIALID}"),
		archived: z.string().default("archived-{SERIALID}"),
		quote: z.string().default("quote-{USERNAME}"),
	}),
	allowInvoicesOutsideCommissions: z.boolean().default(false),
	archive: z.object({
		action: z.enum(["categorize", "delete", "none"]).default("delete"),
		requireManageGuild: z.boolean().default(true),
		sendTranscriptToAuthorDms: z.boolean().default(true),
	}),
	transcripts: z.object({
		downloadAttachments: z.boolean().default(false),
		includeDeletedMessages: z.boolean().default(true),
	}),
	serviceCut: z.number().min(0).max(100).default(15),
	allowCompletionWithoutInvoice: z.boolean().default(false),
	allowPromptCancellation: z.boolean().default(true),
	enableMentionOnCreate: z.boolean().default(true),
	sendPingPrefSelection: z.boolean().default(true),
	sendReminderAboutNoQuotes: z.boolean().default(true),
	applicationMinimumSelectedRoles: z.number().min(0).max(25).default(1),
	applicationMaximumSelectedRoles: z.number().min(0).max(25).default(5),

	reviews: z.object({
		amountPerPage: z.number().min(1).max(10).default(10),
	}),

	profiles: z.object({
		displayTip: z.boolean().default(true),
		enforceSetupToQuote: z.boolean().default(true),
	}),

	trials: trialsSchema,
});

export type TicketsConfig = z.infer<typeof ticketsConfig>;
