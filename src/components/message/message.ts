import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	Guild,
	GuildMember,
	ModalBuilder,
	ModalSubmitInteraction,
	Role,
	TextChannel,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import { TicketManager } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseComponent } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { findServiceData } from "@util/findServiceData";
import { __ } from "@util/translate";

import { ConfigService } from "@schemas/services";

/*
 * FREELANCER (from "Message" button on quote) >>> CLIENT (commission channel)
 * */
export default class NewMessageComponent extends BaseComponent {
	customId = "message-new";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		const commId = interaction.customId.split("-")[2];
		const comm = await TicketManager.fetch({ type: 0, id: commId, closed: false });
		if (!comm || !(comm instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission_or_archived", { _locale: interaction.locale }));
		}

		const serviceData: ConfigService | undefined = findServiceData(this.client, comm.selectedService!);
		if (serviceData && !serviceData.other && serviceData.roleId) {
			const guild = this.client.guilds.cache.find((g: Guild) => g.id === comm.guildId);
			if (guild) {
				const member = guild.members.cache.find((m: GuildMember) => m.id === interaction.user.id);
				if (!member) return;
				if (!member.roles.cache.some((r: Role) => r.id === serviceData.roleId)) {
					throw new ExecutionError(
						__("messaging.errors.wrong_service_roles", {
							serviceName: serviceData.name,
							_locale: interaction.locale,
						}),
					);
				}
			}
		}

		if (interaction instanceof ButtonInteraction) {
			await this.openModal(interaction, comm);
		} else if (interaction instanceof ModalSubmitInteraction) {
			await this.onSubmit(interaction, comm);
		}
	}

	async openModal(interaction: ButtonInteraction, comm: CommissionTicket): Promise<void> {
		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("value")
				.setLabel(__("messaging.f2c.modal_field_message_label", { _locale: interaction.locale }))
				.setMinLength(1)
				.setMaxLength(1000)
				.setRequired(true)
				.setStyle(TextInputStyle.Paragraph),
		);

		const modal = new ModalBuilder()
			.setCustomId(`message-new-${comm.id}`)
			.setTitle(__("messaging.f2c.modal_title", { _locale: interaction.locale }))
			.addComponents(row);
		await interaction.showModal(modal);
	}

	async onSubmit(interaction: ModalSubmitInteraction, comm: CommissionTicket): Promise<void> {
		const ticketChannel = await this.client.channels.fetch(comm.channelId);
		if (!ticketChannel || !(ticketChannel instanceof TextChannel)) {
			throw new ExecutionError(__("generic.errors.channel_invalid", { _locale: interaction.locale }));
		}
		const freelancer = interaction.user;
		const msgContent = interaction.fields.getTextInputValue("value");

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				label: __("messaging.f2c.button_label", { _locale: interaction.locale }),
				emoji: "📨",
				style: ButtonStyle.Primary,
				customId: `message-reply-${comm.id}-${freelancer.id}`,
			}),
		);
		let ping = comm.mentions ? `<@${comm.authorId}> | ` : "";
		await ticketChannel.send({
			content: `${ping}**${__("messaging.f2c.message", {
				service: comm.selectedService || "unknown",
				serial: comm.serial.toString(),
				freelancer_username: freelancer.username,
				freelancer_mention: freelancer.toString(),
				_locale: interaction.locale,
			})}:**\n${msgContent}`,
			components: [row],
		});
		await interaction.reply({
			embeds: [successEmbed(__("messaging.f2c.successful", { _locale: interaction.locale }))],
			ephemeral: true,
		});
	}
}
