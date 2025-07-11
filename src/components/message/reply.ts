import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ModalBuilder,
	ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
	User,
} from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import { TicketManager } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseComponent } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

/*
 * CLIENT (from "Reply" button on OP) >>> FREELANCER (dm)
 * */
export default class ReplyComponent extends BaseComponent {
	customId = "message-reply";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (interaction instanceof ButtonInteraction) {
			await this.openModal(interaction);
		} else if (interaction instanceof ModalSubmitInteraction) {
			await this.onSubmit(interaction);
		}
	}

	async openModal(interaction: ButtonInteraction): Promise<void> {
		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("value")
				.setLabel(__("messaging.c2f.modal_field_message_label", { _locale: interaction.locale }))
				.setMinLength(1)
				.setMaxLength(1000)
				.setRequired(true)
				.setStyle(TextInputStyle.Paragraph),
		);

		const commId = interaction.customId.split("-")[2];
		const freelancerId = interaction.customId.split("-")[3];

		const modal = new ModalBuilder()
			.setCustomId(`message-reply-${commId}-${freelancerId}`)
			.setTitle(__("messaging.c2f.modal_title", { _locale: interaction.locale }))
			.addComponents(row);

		await interaction.showModal(modal);
	}

	async onSubmit(interaction: ModalSubmitInteraction): Promise<void> {
		const commId = interaction.customId.split("-")[2];
		const freelancerId = interaction.customId.split("-")[3];

		const comm = await TicketManager.fetch({ type: 0, id: commId, closed: false });
		if (!comm || !(comm instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission_or_archived", { _locale: interaction.locale }));
		}
		const freelancer: User | null = await this.client.users.fetch(freelancerId).catch(() => null);
		if (!freelancer) {
			throw new ExecutionError(__("generic.errors.member_undefined", { _locale: interaction.locale }));
		}

		const client = interaction.user;

		const msgContent = interaction.fields.getTextInputValue("value");

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				customId: `message-new-${comm.id}`,
				label: "Message",
				style: ButtonStyle.Secondary,
				emoji: "✉️",
			}),
		);
		const content = `**${__("messaging.c2f.message", {
			service: comm.selectedService || "unknown",
			serial: comm.serial.toString(),
			client_username: client.username,
			client_mention: client.toString(),
			_locale: interaction.locale,
		})}:**\n${msgContent}`;
		let dm = await freelancer.createDM().catch(() => null);
		if (dm) {
			await dm.send({
				content,
				components: [row],
			});
		}
		await comm.channel.send({ content });
		await interaction.reply({
			embeds: [successEmbed(__("messaging.c2f.successful", { _locale: interaction.locale }))],
			ephemeral: true,
		});
	}
}
