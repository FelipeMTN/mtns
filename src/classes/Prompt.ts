import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	Message,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	TextChannel,
} from "discord.js";
import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import Client, { CLIENT_INSTANCE } from "@classes/Client";
import { AnyTicket, TicketManager, TicketType } from "@classes/TicketManager";

import { cancelButton } from "@util/components/buttons";
import { errorEmbed, infoEmbed } from "@util/embeds";
import trim from "@util/formatters/trim";
import { genId } from "@util/genId";
import { __ } from "@util/translate";
import { decodeGzip } from "@util/web/decodeGzip";
import { encodeGzip } from "@util/web/encodeGzip";

import {
	BooleanPrompt,
	BudgetPrompt,
	ConfigPrompt,
	ConfigSMOption,
	NumberPrompt,
	OptionsPrompt,
	PromptType,
	SelectMenuPrompt,
	ServiceSelectMenuPrompt,
	TextPrompt,
} from "@schemas/prompts";
import { ConfigService } from "@schemas/services";

import UserPreferences from "./UserPreferences";

@Table({
	tableName: "prompts",
	freezeTableName: true,
})
export default class Prompt extends Model {
	client: Client = CLIENT_INSTANCE!;

	@PrimaryKey
	@AllowNull(false)
	@Default(() => genId())
	@Column(DataType.STRING(10))
	id!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	userId!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	guildId!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	ticketId!: string;

	@AllowNull(true)
	@Column(DataType.TEXT)
	messageId!: string | null;

	@AllowNull(true)
	@Column(DataType.TEXT)
	errorMessageId!: string | null;

	@AllowNull(false)
	@Default(0)
	@Column(DataType.TEXT)
	currentQuestionIdx!: number;

	@AllowNull(true)
	@Column(DataType.BLOB)
	responsesJson!: Buffer;

	@AllowNull(true)
	@Column(DataType.BLOB)
	attachments!: Buffer;

	async getListOfPrompts(ticketType: TicketType) {
		const locale = await UserPreferences.getLanguage(this.userId);
		let prompts: ConfigPrompt[];

		if (ticketType === TicketType.Commission) {
			const serviceSelect: ConfigPrompt = {
				label: __("commissions.service_selector.label", { _locale: locale }),
				type: PromptType.SERVICE_SELECT_SELECT_MENU,
				description: __("commissions.service_selector.description", { _locale: locale }),
				selectMenuData: {
					placeholder: __("commissions.service_selector.placeholder", { _locale: locale }),
					minValuesSelected: 1,
					maxValuesSelected: 1,
					options: this.client.config.services.map((s: ConfigService) => ({
						label: s.name,
						value: s.id,
						description: s.description,
						dropdownEmoji: s.dropdownEmoji ?? undefined,
					})),
				},
			};

			prompts = [serviceSelect, ...this.client.config.prompts.commissions];
		} else if (ticketType === TicketType.Application) {
			const serviceSelect: ServiceSelectMenuPrompt = {
				label: __("applications.service_selector.label", { _locale: locale }),
				type: PromptType.SERVICE_SELECT_SELECT_MENU,
				description: __("applications.service_selector.description", {
					_locale: locale,
					min: this.client.config.tickets.applicationMinimumSelectedRoles.toString(),
					max: this.client.config.tickets.applicationMaximumSelectedRoles.toString(),
				}),
				selectMenuData: {
					placeholder: __("applications.service_selector.placeholder", {
						_locale: locale,
						min: this.client.config.tickets.applicationMinimumSelectedRoles.toString(),
						max: this.client.config.tickets.applicationMaximumSelectedRoles.toString(),
					}),
					minValuesSelected: this.client.config.tickets.applicationMinimumSelectedRoles,
					maxValuesSelected:
						this.client.config.services.length > this.client.config.tickets.applicationMaximumSelectedRoles
							? this.client.config.tickets.applicationMaximumSelectedRoles
							: this.client.config.services.length,
					options: this.client.config.services
						.filter((s) => !s.other)
						.map((s: ConfigService) => ({
							label: s.name,
							value: s.id,
							description: s.description,
							dropdownEmoji: s.dropdownEmoji ?? undefined,
						})),
				},
			};

			prompts = [serviceSelect, ...this.client.config.prompts.applications];
		} else {
			prompts = [...(this.client.config.prompts.support || [])];
		}

		return prompts;
	}

	async sendNext() {
		const ticket = await TicketManager.fetch({ id: this.ticketId });
		if (!ticket) return;

		const guild = this.client.guilds.cache.get(this.guildId);
		if (!guild) return;

		const channel = guild.channels.cache.get(ticket.channelId);
		if (!channel || !(channel instanceof TextChannel)) return;

		const prompts = await this.getListOfPrompts(ticket.type);
		if (!prompts) return;

		const locale = await UserPreferences.getLanguage(this.userId);

		// Skip prompts that don't meet their showIf conditions
		while (this.currentQuestionIdx < prompts.length) {
			const currentPrompt = prompts[this.currentQuestionIdx];

			if (currentPrompt.showIf) {
				const responses = this.decodeResponses();
				const previousPromptIndex = prompts.findIndex(p => p.label === currentPrompt.showIf!.previousPromptLabel);

				// Skip if the referenced prompt doesn't exist or comes after current prompt
				if (previousPromptIndex === -1 || previousPromptIndex >= this.currentQuestionIdx) {
					this.currentQuestionIdx++;
					continue;
				}

				const previousResponse = responses[previousPromptIndex]?.value;
				if (!previousResponse || !currentPrompt.showIf.value.includes(previousResponse)) {
					this.currentQuestionIdx++;
					continue;
				}
			}
			break;
		}

		if (this.currentQuestionIdx >= prompts.length) {
			const existingMessage = this.messageId ? channel.messages.cache.get(this.messageId) : null;
			if (existingMessage) existingMessage.delete().catch(() => null);

			this.messageId = null;
			this.errorMessageId = null;
			await this.save();

			ticket.finalizePrompts(this);
			return;
		}

		let prompt = prompts[this.currentQuestionIdx];
		if (!prompt) return;

		const embed = infoEmbed(prompt.description);
		if (prompt.label) embed.setTitle(prompt.label);

		let components = [];

		if (prompt.type === PromptType.SERVICE_SELECT_SELECT_MENU) {
			if (!prompt.selectMenuData) {
				throw new Error(
					`Prompt with type "service select" requires "selectMenuData" to be defined. (at: "${prompt.label}")`,
				);
			}

			const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId("newTicket-selection")
					.setPlaceholder(prompt.selectMenuData.placeholder || "Select an option here...")
					.setMinValues(prompt.selectMenuData.minValuesSelected)
					.setMaxValues(prompt.selectMenuData.maxValuesSelected)
					.addOptions(
						prompt.selectMenuData.options.map((opt: ConfigSMOption) => ({
							label: opt.label,
							value: opt.value || opt.label,
							description: opt.description,
							emoji: opt.dropdownEmoji || undefined,
						})),
					),
			);
			components.push(selectMenu);
		} else if (prompt.type === PromptType.SELECT_MENU) {
			if (!prompt.selectMenuData) {
				throw new Error(
					`Prompt with type "select menu" requires "selectMenuData" to be defined. (at: "${prompt.label}")`,
				);
			}

			const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId("newTicket-selection")
					.setPlaceholder(prompt.selectMenuData.placeholder || "Select an option here...")
					.setMinValues(prompt.selectMenuData.minValuesSelected)
					.setMaxValues(prompt.selectMenuData.maxValuesSelected)
					.addOptions(
						prompt.selectMenuData.options.map((opt: ConfigSMOption) => ({
							label: opt.label,
							value: opt.value || opt.label,
							description: opt.description,
							emoji: opt.dropdownEmoji || undefined,
						})),
					),
			);
			components.push(selectMenu);
		} else if (prompt.type === PromptType.OPTION_SELECT) {
			let buttonRows = [];
			for (let i = 0; i < prompt.options.length; i += 5) {
				const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
					...prompt.options.slice(i, i + 5).map((opt: string, j: number) => {
						return new ButtonBuilder()
							.setCustomId(`newTicket-option-${i + j}`)
							.setLabel(opt)
							.setStyle(ButtonStyle.Secondary);
					}),
				);
				buttonRows.push(row);
			}

			components.push(...buttonRows);
		} else if (prompt.type === PromptType.BOOLEAN) {
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId("newTicket-boolean-yes")
					.setLabel(prompt.yesLabel || __("generic.yes", { _locale: locale }))
					.setStyle(ButtonStyle.Success),
				new ButtonBuilder()
					.setCustomId("newTicket-boolean-no")
					.setLabel(prompt.noLabel || __("generic.no", { _locale: locale }))
					.setStyle(ButtonStyle.Secondary),
			);
			components.push(row);
		}

		if (this.client.config.tickets.allowPromptCancellation) components.push(cancelButton());

		const existingMessage = this.messageId ? channel.messages.cache.get(this.messageId) : null;

		if (!existingMessage) {
			// This is either a first prompt or the other message was lost, create a new one.
			const newMessage = await channel.send({ embeds: [embed], components: components });
			this.messageId = newMessage.id;
			await this.save();
		} else {
			// Found existing message, edit it.
			await existingMessage.edit({ embeds: [embed], components: components });
		}
	}

	async onMessageInput({ message, ticket }: { message: Message; ticket: any }) {
		const precheckSuccess = this.checkLocation({
			userId: message.author.id,
			guildId: message.guild!.id,
			channelId: message.channel.id,
			ticket: ticket,
		});
		if (!precheckSuccess) {
			return;
		}

		const prompts = await this.getListOfPrompts(ticket.type);
		if (!prompts) return;

		let prompt = prompts[this.currentQuestionIdx];
		if (!prompt) return;

		const locale = await UserPreferences.getLanguage(message.author.id);

		if (![PromptType.TEXT, PromptType.NUMBER, PromptType.BUDGET].includes(prompt.type)) return;
		prompt = prompt as TextPrompt | NumberPrompt | BudgetPrompt; // safe to cast because of check above

		const responsesSoFar = this.decodeResponses();

		message.delete().catch(() => null);

		// Validate and if there's an error, send it and stop further action.
		const error: string | null = await this.validateMessageInput(message, prompt, locale);
		if (error) {
			const errorMsg = await message.channel.send({ embeds: [errorEmbed(error)] });
			this.errorMessageId = errorMsg.id;
			await this.save();
			return;
		}

		// Delete the previous error message if it exists.
		if (this.errorMessageId) {
			const errorMessage = this.messageId ? message.channel.messages.cache.get(this.errorMessageId) : null;
			if (errorMessage) {
				errorMessage.delete().catch(() => null);
				this.errorMessageId = null;
			}
		}

		// If the prompt is "text" and there are attachments, save them.
		if (prompt.type === PromptType.TEXT) {
			if (message.attachments.size > 0) {
				const attachments = decodeGzip(this.attachments) || [];
				attachments.push(...[...message.attachments.values()]);
				this.attachments = encodeGzip(attachments);
			}
		}

		responsesSoFar.push({
			name: prompt.label,
			value: trim(message.content, prompt.max || 2048),
		});
		this.responsesJson = encodeGzip(responsesSoFar);

		this.currentQuestionIdx++;
		await this.save();
		await this.sendNext();
	}

	async onButtonClick({ interaction, ticket }: { interaction: ButtonInteraction; ticket: AnyTicket }) {
		const locale = await UserPreferences.getLanguage(interaction.user.id);

		const precheckSuccess = this.checkLocation({
			userId: interaction.user.id,
			guildId: interaction.guild!.id,
			channelId: interaction.channel!.id,
			ticket: ticket,
		});
		if (!precheckSuccess) {
			return;
		}

		const prompts = await this.getListOfPrompts(ticket.type);
		if (!prompts) return;

		let prompt = prompts[this.currentQuestionIdx];
		if (!prompt) return;

		if (![PromptType.BOOLEAN, PromptType.OPTION_SELECT].includes(prompt.type)) return;
		prompt = prompt as BooleanPrompt | OptionsPrompt; // safe to cast because of check above

		if (interaction.customId.startsWith("newTicket-boolean-")) {
			prompt = prompt as BooleanPrompt;
			const [, , yesOrNo] = interaction.customId.split("-");
			const isYes = yesOrNo === "yes";
			const responsesSoFar = this.decodeResponses();
			responsesSoFar.push({
				name: prompt.label,
				value: isYes ? __("generic.yes", { _locale: locale }) : __("generic.no", { _locale: locale }),
			});
			this.responsesJson = encodeGzip(responsesSoFar);
		} else if (interaction.customId.startsWith("newTicket-option-")) {
			prompt = prompt as OptionsPrompt;
			const [, , optionIdx] = interaction.customId.split("-");
			const option = prompt.options[parseInt(optionIdx)];
			if (!option) return;

			const responsesSoFar = this.decodeResponses();
			responsesSoFar.push({
				name: prompt.label,
				value: option,
			});
			this.responsesJson = encodeGzip(responsesSoFar);
		}

		this.currentQuestionIdx++;
		await this.save();
		await this.sendNext();

		await interaction.deferUpdate();
	}

	async onSelectMenu({ interaction, ticket }: { interaction: StringSelectMenuInteraction; ticket: AnyTicket }) {
		const precheckSuccess = this.checkLocation({
			userId: interaction.user.id,
			guildId: interaction.guild!.id,
			channelId: interaction.channel!.id,
			ticket: ticket,
		});
		if (!precheckSuccess) {
			return;
		}

		const prompts = await this.getListOfPrompts(ticket.type);
		if (!prompts) return;

		let prompt = prompts[this.currentQuestionIdx];
		if (!prompt) return;

		if (![PromptType.SELECT_MENU, PromptType.SERVICE_SELECT_SELECT_MENU].includes(prompt.type)) return;
		prompt = prompt as SelectMenuPrompt | ServiceSelectMenuPrompt; // safe to cast because of check above

		if (!interaction.customId.startsWith("newTicket-selection")) return;
		const values = interaction.values;

		if (prompt.type === PromptType.SERVICE_SELECT_SELECT_MENU) {
			ticket.selectedService = interaction.values.join(", ");
			await ticket.save();
		} else {
			// Don't push service to responses, as it will be set in ticket.selectedService
			const responsesSoFar = this.decodeResponses();
			responsesSoFar.push({
				name: prompt.label,
				value: values.join(", "),
			});
			this.responsesJson = encodeGzip(responsesSoFar);
		}

		this.currentQuestionIdx++;
		await this.save();
		await this.sendNext();

		await interaction.deferUpdate();
	}

	async validateMessageInput(message: Message, prompt: ConfigPrompt, locale: string): Promise<string | null> {
		if (prompt.type === PromptType.TEXT) {
			if (!message.content) {
				return __("prompt.validation.text.no_content", { _locale: locale });
			}
			if (prompt.min && message.content.length < prompt.min) {
				return __("prompt.validation.text.min_exceeded", { _locale: locale, min: prompt.min.toString() });
			}
			if (prompt.max && message.content.length > prompt.max) {
				return __("prompt.validation.text.max_exceeded", { _locale: locale, max: prompt.max.toString() });
			}
		}

		if (prompt.type === PromptType.NUMBER) {
			const sanitisedNumber = message.content.replace(new RegExp(",", "g"), "");
			const parsed = parseInt(sanitisedNumber);
			if (isNaN(parsed)) {
				return __("prompt.validation.number.not_number", { _locale: locale });
			}
			if (prompt.min && parsed < prompt.min) {
				return __("prompt.validation.number.min_exceeded", { _locale: locale, min: prompt.min.toString() });
			}
			if (prompt.max && parsed > prompt.max) {
				return __("prompt.validation.number.max_exceeded", { _locale: locale, max: prompt.max.toString() });
			}
		}

		if (prompt.type === PromptType.BUDGET) {
			const budgetNumberOrText = message.content
				.replace(new RegExp("$", "g"), "")
				.replace(new RegExp(",", "g"), "");
			const parsed = parseInt(budgetNumberOrText);

			if (budgetNumberOrText.toLowerCase() !== "quote") {
				if (isNaN(parsed)) {
					return __("prompt.validation.budget.not_number", { _locale: locale });
				}
				if (prompt.min && parsed < prompt.min) {
					return __("prompt.validation.budget.min_exceeded", { _locale: locale, min: prompt.min.toString() });
				}
				if (prompt.max && parsed > prompt.max) {
					return __("prompt.validation.budget.max_exceeded", { _locale: locale, max: prompt.max.toString() });
				}
			}
		}

		return null;
	}

	decodeResponses(): any[] {
		if (!this.responsesJson) return [];
		return decodeGzip(this.responsesJson);
	}

	checkLocation({
		userId,
		guildId,
		channelId,
		ticket,
	}: {
		userId: string;
		guildId: string;
		channelId: string;
		ticket: AnyTicket;
	}) {
		if (this.userId !== userId) return false;
		if (this.guildId !== guildId) return false;
		if (this.ticketId !== ticket.id) return false;
		if (ticket.channelId !== channelId) return false;
		return true;
	}
}
