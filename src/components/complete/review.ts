import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import Review from "@classes/Review";
import { TicketManager, TicketType } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseComponent } from "@util/baseInterfaces";
import { disableButtons } from "@util/components/disableButtons";
import { infoEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class CompleteReviewComponent extends BaseComponent {
	customId = "complete-review";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (!(interaction instanceof ButtonInteraction)) return;
		const [ticketId, stars] = interaction.customId.split("-").slice(2, 4);
		const comm = await TicketManager.fetch({
			type: TicketType.Commission,
			guildId: interaction.guild!.id,
			id: ticketId,
		});
		if (!comm || !(comm instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission", { _locale: interaction.locale }));
		}

		if (interaction.user.id !== comm.authorId) {
			throw new ExecutionError(__("completion.errors.not_author", { _locale: interaction.locale }));
		}

		if (!comm.deliveryAccepted) {
			throw new ExecutionError(__("completion.review.errors.not_accepted", { _locale: interaction.locale }));
		}

		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("message")
				.setLabel(__("completion.review.modal_field_message_label", { _locale: interaction.locale }))
				.setMinLength(1)
				.setMaxLength(250)
				.setRequired(true)
				.setStyle(TextInputStyle.Paragraph),
		);
		const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("anonymous")
				.setLabel(__("completion.review.modal_field_anynomous_label", { _locale: interaction.locale }))
				.setMinLength(0)
				.setMaxLength(1)
				.setRequired(false)
				.setStyle(TextInputStyle.Short),
		);

		const modal = new ModalBuilder()
			.setCustomId("submitreview")
			.setTitle(__("completion.review.modal_title", { stars, _locale: interaction.locale }))
			.addComponents(row, row2);
		await interaction.showModal(modal);

		const modalSubmit = await interaction.awaitModalSubmit({
			filter: (i) => i.user.id === interaction.user.id && i.customId === "submitreview",
			time: 120_000,
		});
		const content = modalSubmit.fields.getTextInputValue("message");
		const anonymous = modalSubmit.fields.getTextInputValue("anonymous")?.toLowerCase() === "y";

		await modalSubmit.deferReply({ ephemeral: true });

		const review = await Review.create({
			guildId: interaction.guild!.id,
			commissionId: comm.id,
			freelancerId: comm.freelancerId,
			userId: comm.authorId,
			rating: stars,
			anonymous,
			message: content.length > 500 ? content.slice(0, 497) + "..." : content,
		});

		await review.send(interaction.guild!);

		await modalSubmit.editReply({
			embeds: [
				successEmbed(__("completion.review.successful", { stars, _locale: interaction.locale })).setAuthor({
					name: __("completion.review.successful.embed_title", { _locale: interaction.locale }),
				}),
			],
		});
		await modalSubmit.followUp({
			embeds: [
				infoEmbed(
					__("completion.review.review_in_ticket", {
						stars,
						mention: interaction.user.toString(),
						username: interaction.user.username,
						_locale: interaction.locale,
					}),
				),
			],
		});
		// Disable star buttons
		interaction.message.edit({ components: disableButtons(interaction.message.components) });
	}
}
