import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import { TicketManager } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseComponent } from "@util/baseInterfaces";
import { disableButtons } from "@util/components/disableButtons";
import { errorEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class CompleteDenyComponent extends BaseComponent {
	customId = "complete-deny";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (!(interaction instanceof ButtonInteraction)) return;
		const ticketId = interaction.customId.split("-")[2];
		const comm = await TicketManager.fetch({ type: 0, guildId: interaction.guild!.id, id: ticketId });
		if (!comm || !(comm instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission", { _locale: interaction.locale }));
		}
		if (interaction.user.id !== comm.authorId) {
			throw new ExecutionError(__("completion.errors.not_author", { _locale: interaction.locale }));
		}

		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("message")
				.setLabel(__("completion.deny.reason_modal_field_label", { _locale: interaction.locale }))
				.setMinLength(1)
				.setMaxLength(250)
				.setRequired(true)
				.setStyle(TextInputStyle.Paragraph),
		);

		const modal = new ModalBuilder()
			.setCustomId("denydelivery")
			.setTitle(__("completion.deny.reason_modal_title", { _locale: interaction.locale }))
			.addComponents(row);
		await interaction.showModal(modal);

		const modalSubmit = await interaction
			.awaitModalSubmit({
				filter: (i) => i.user.id === interaction.user.id && i.customId === "denydelivery",
				time: 120_000,
			})
			.catch(() => {
				throw new ExecutionError(__("completion.deny.errors.timed_out", { _locale: interaction.locale }));
			});
		const content = modalSubmit.fields.getTextInputValue("message");

		await comm.denyDelivery().catch(() => {
			throw new ExecutionError(__("completion.deny.errors.already_complete", { _locale: interaction.locale }));
		});

		// Disable buttons
		interaction.message.edit({ components: disableButtons(interaction.message.components) });

		modalSubmit.reply({
			embeds: [successEmbed(__("completion.deny.successful", { _locale: interaction.locale }))],
			ephemeral: true,
		});
		interaction.followUp({
			embeds: [
				errorEmbed(
					`**${__("completion.deny.successful.reason_for_denying", { _locale: interaction.locale })}:** ${content}`,
				).setTitle(__("completion.deny.successful.embed_title", { _locale: interaction.locale })),
			],
		});
	}
}
