import {
	ActionRowBuilder,
	ButtonInteraction,
	Guild,
	GuildMember,
	ModalBuilder,
	ModalSubmitInteraction,
	Role,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import Logger from "@classes/Logger";
import Profile from "@classes/Profile";
import Quote from "@classes/Quote";
import { TicketManager, TicketType } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseComponent } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { findServiceData } from "@util/findServiceData";
import { __ } from "@util/translate";

import { ConfigService } from "@schemas/services";

// Handle quote submission from freelancers
export default class QuoteOpenComponent extends BaseComponent {
	customId = "quote";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (this.client.config.tickets.profiles.enforceSetupToQuote) {
			const profile = await Profile.findOne({ where: { userId: interaction.user.id } });
			if (!profile) {
				throw new ExecutionError(__("quoting.errors.no_profile", { _locale: interaction.locale }));
			}
			if (!profile.bio) {
				throw new ExecutionError(__("quoting.errors.no_bio", { _locale: interaction.locale }));
			}
		}

		const commId = interaction.customId.split("-")[1];
		const comm = await TicketManager.fetch({ type: TicketType.Commission, id: commId, closed: false });

		if (!comm || !(comm instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission_or_archived", { _locale: interaction.locale }));
		}
		if (comm.freelancerId) {
			throw new ExecutionError(__("quoting.errors.already_claimed", { _locale: interaction.locale }));
		}

		if (interaction instanceof ButtonInteraction) {
			await this.openModal(interaction, comm);
		} else if (interaction instanceof ModalSubmitInteraction) {
			await this.onSubmit(interaction, comm);
		}
	}

	async openModal(interaction: ButtonInteraction, comm: CommissionTicket): Promise<void> {
		const serviceData: ConfigService | undefined = findServiceData(this.client, comm.selectedService!);
		if (serviceData && !serviceData.other && serviceData.roleId) {
			const guild = this.client.guilds.cache.find((g: Guild) => g.id === comm.guildId);
			if (guild) {
				const member = guild.members.cache.find((m: GuildMember) => m.id === interaction.user.id);
				if (!member) return;
				if (!member.roles.cache.some((r: Role) => r.id === serviceData.roleId)) {
					throw new ExecutionError(
						__("quoting.errors.wrong_service_roles", {
							service_name: serviceData.name,
							_locale: interaction.locale,
						}),
					);
				}
			}
		}

		const quoteRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("value")
				.setLabel(__("quoting.modal_field_quote_label", { _locale: interaction.locale }))
				.setMinLength(1)
				.setMaxLength(20)
				.setRequired(true)
				.setStyle(TextInputStyle.Short),
		);

		const messageRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("message")
				.setLabel(__("quoting.modal_field_attached_msg_label", { _locale: interaction.locale }))
				.setMaxLength(500)
				.setRequired(false)
				.setStyle(TextInputStyle.Paragraph),
		);

		const modal = new ModalBuilder()
			.setCustomId(`quote-${comm.id}`)
			.setTitle(__("quoting.modal_title", { _locale: interaction.locale }))
			.addComponents(quoteRow, messageRow);

		await interaction.showModal(modal);
	}

	async onSubmit(interaction: ModalSubmitInteraction, comm: CommissionTicket): Promise<void> {
		const freelancer = interaction.user;
		const quote = parseInt(interaction.fields.getTextInputValue("value")?.replace(/\$/g, ""));
		const message = interaction.fields.getTextInputValue("message");
		if (isNaN(quote)) {
			throw new ExecutionError(__("generic.errors.not_number", { _locale: interaction.locale }));
		}

		const guild = this.client.guilds.cache.get(comm.guildId);
		if (!guild) return;
		const commChannel = await guild.channels.fetch(comm.channelId).catch(() => {});
		if (!commChannel) return;

		Logger.trace(`Creating quote from ${freelancer.username} for commission ${comm.id}.`);

		const quoteDoc = Quote.build({
			commissionId: comm.id,
			freelancerId: freelancer.id,
			price: quote,
			message: message,
		});

		const quoteMsg = await quoteDoc.sendEmbed();
		if (!quoteMsg) {
			throw new ExecutionError(__("quoting.errors.message_wasnt_created", { _locale: interaction.locale }));
		}

		quoteDoc.incomingQuoteMsg = quoteMsg.id;
		await quoteDoc.save();
		comm.lastQuoted = new Date();
		await comm.save();

		await interaction.reply({
			embeds: [
				successEmbed(
					__("quoting.successful", { quote: quoteDoc.price.toFixed(2), _locale: interaction.locale }),
				),
			],
			ephemeral: true,
		});
	}
}
