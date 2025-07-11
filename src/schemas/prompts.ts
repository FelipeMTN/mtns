import { z } from "zod";

export enum PromptType {
	SERVICE_SELECT_SELECT_MENU = "service select",
	SELECT_MENU = "select menu",
	OPTION_SELECT = "option",
	TEXT = "text",
	BUDGET = "budget",
	NUMBER = "number",
	BOOLEAN = "boolean",
}

const selectMenuOptionSchema = z.object({
	label: z.string(),
	value: z.string().optional(),
	description: z.string().optional(),
	dropdownEmoji: z.string().optional(),
});
export type ConfigSMOption = z.infer<typeof selectMenuOptionSchema>;

const serviceSelectMenuPrompt = z.object({
	type: z.literal(PromptType.SERVICE_SELECT_SELECT_MENU),
	label: z.string(),
	description: z.string().optional(),
	selectMenuData: z.object({
		placeholder: z.string(),
		minValuesSelected: z.number().min(1).max(25).default(1),
		maxValuesSelected: z.number().min(1).max(25).default(1),
		options: z.array(selectMenuOptionSchema),
	}),
});

const selectMenuPrompt = z.object({
	type: z.literal(PromptType.SELECT_MENU),
	label: z.string(),
	description: z.string().optional(),
	selectMenuData: z.object({
		placeholder: z.string(),
		minValuesSelected: z.number().min(1).max(25).default(1),
		maxValuesSelected: z.number().min(1).max(25).default(1),
		options: z.array(selectMenuOptionSchema),
	}),
});

const optionsPrompt = z.object({
	type: z.literal(PromptType.OPTION_SELECT),
	label: z.string(),
	description: z.string().optional(),
	options: z.array(z.string()),
});

const textPrompt = z.object({
	type: z.literal(PromptType.TEXT),
	label: z.string(),
	description: z.string().optional(),
	min: z.number().min(0).max(2048).default(0).optional(),
	max: z.number().min(0).max(2048).default(1000).optional(),
});

const budgetPrompt = z.object({
	type: z.literal(PromptType.BUDGET),
	label: z.string(),
	description: z.string().optional(),
	min: z.number().optional(),
	max: z.number().optional(),
});

const numberPrompt = z.object({
	type: z.literal(PromptType.NUMBER),
	label: z.string(),
	description: z.string().optional(),
	min: z.number().optional(),
	max: z.number().optional(),
});

const booleanPrompt = z.object({
	type: z.literal(PromptType.BOOLEAN),
	label: z.string(),
	description: z.string().optional(),
	yesLabel: z.string().optional(),
	noLabel: z.string().optional(),
});

const showIfSchema = z.object({
	previousPromptLabel: z.string(),
	value: z.array(z.string()),
});

const promptSchema = z.discriminatedUnion("type", [
	serviceSelectMenuPrompt.extend({ showIf: showIfSchema.optional() }),
	selectMenuPrompt.extend({ showIf: showIfSchema.optional() }),
	optionsPrompt.extend({ showIf: showIfSchema.optional() }),
	textPrompt.extend({ showIf: showIfSchema.optional() }),
	budgetPrompt.extend({ showIf: showIfSchema.optional() }),
	numberPrompt.extend({ showIf: showIfSchema.optional() }),
	booleanPrompt.extend({ showIf: showIfSchema.optional() }),
]);
export type ConfigPrompt = z.infer<typeof promptSchema>;

export const promptsConfig = z.object({
	commissions: z.array(promptSchema),
	applications: z.array(promptSchema),
	support: z.array(promptSchema).optional(),
});

export type PromptsConfig = z.infer<typeof promptsConfig>;

export type SelectMenuPrompt = z.infer<typeof selectMenuPrompt>;
export type ServiceSelectMenuPrompt = z.infer<typeof serviceSelectMenuPrompt>;
export type OptionsPrompt = z.infer<typeof optionsPrompt>;
export type TextPrompt = z.infer<typeof textPrompt>;
export type BudgetPrompt = z.infer<typeof budgetPrompt>;
export type NumberPrompt = z.infer<typeof numberPrompt>;
export type BooleanPrompt = z.infer<typeof booleanPrompt>;
