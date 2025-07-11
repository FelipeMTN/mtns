import {
	ActionRowBuilder,
	ModalBuilder,
	StringSelectMenuInteraction,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import Logger from "@classes/Logger";
import { TicketManager } from "@classes/TicketManager";

import { BaseComponent } from "@util/baseInterfaces";
import { __ } from "@util/translate";

export default class CustomerPanelComponent extends BaseComponent {
	customId = "customerpanel";
	findFn = (event: AnyComponentInteraction) => event.customId === this.customId;

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (!(interaction instanceof StringSelectMenuInteraction)) {
			Logger.error(`Received interaction customerpanelaction with unexpected type ${interaction.type}`);
			throw new ExecutionError("Something went wrong.");
		}

		const selectedAction = interaction.values[0];

		if (!interaction.guild) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}

		const ticket = await TicketManager.fetch({ guildId: interaction.guild.id, channelId: interaction.channel?.id });
		if (!ticket || ticket.closed) {
			throw new ExecutionError(__("customerpanel.errors.not_valid_ticket", { _locale: interaction.locale }));
		}
		if (selectedAction === "add") await this.runAddUser(interaction);
		if (selectedAction === "remove") await this.runRemoveUser(interaction);
	}

	async runAddUser(interaction: StringSelectMenuInteraction): Promise<void> {
		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("user")
				.setLabel(__("customerpanel.action.add.field_label_user", { _locale: interaction.locale }))
				.setPlaceholder(__("customerpanel.action.add.field_placeholder_user", { _locale: interaction.locale }))
				.setMinLength(1)
				.setMaxLength(250)
				.setRequired(true)
				.setStyle(TextInputStyle.Short),
		);

		const modal = new ModalBuilder()
			.setCustomId("customerpanelaction-add")
			.setTitle(__("customerpanel.action.add.title", { _locale: interaction.locale }))
			.addComponents(row);
		interaction.showModal(modal);
	}

	async runRemoveUser(interaction: StringSelectMenuInteraction): Promise<void> {
		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("user")
				.setLabel(__("customerpanel.action.remove.field_label_user", { _locale: interaction.locale }))
				.setPlaceholder(
					__("customerpanel.action.remove.field_placeholder_user", { _locale: interaction.locale }),
				)
				.setMinLength(1)
				.setMaxLength(250)
				.setRequired(true)
				.setStyle(TextInputStyle.Short),
		);

		const modal = new ModalBuilder()
			.setCustomId("customerpanelaction-remove")
			.setTitle(__("customerpanel.action.remove.title", { _locale: interaction.locale }))
			.addComponents(row);

		interaction.showModal(modal);
	}
}
