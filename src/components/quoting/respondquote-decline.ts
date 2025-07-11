import { ButtonInteraction } from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import Quote, { QuoteStatus } from "@classes/Quote";
import { TicketManager } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseComponent } from "@util/baseInterfaces";
import { errorEmbed, infoEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class RespondQuoteDenyComponent extends BaseComponent {
	customId = "respondquote-decline";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (!(interaction instanceof ButtonInteraction)) return;
		const quoteId = interaction.customId.split("-")[2];

		const quote = await Quote.findOne({ where: { id: quoteId } });
		if (!quote) {
			throw new ExecutionError(__("quoting.responding.errors.quote_invalid", { _locale: interaction.locale }));
		}

		const comm = await TicketManager.fetch({ type: 0, id: quote.commissionId });
		if (!comm) {
			throw new ExecutionError(__("generic.errors.not_commission", { _locale: interaction.locale }));
		}
		if (comm.type !== 0 || !(comm instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission", { _locale: interaction.locale }));
		}

		if (comm.author.id !== interaction.user.id) {
			throw new ExecutionError(__("quoting.responding.errors.not_author", { _locale: interaction.locale }));
		}
		if (comm.freelancerId) {
			throw new ExecutionError(
				__("quoting.responding.errors.commission_already_assigned", { _locale: interaction.locale }),
			);
		}

		// Query the freelancer user
		const freelancer = await this.client.users.fetch(quote.freelancerId).catch(() => {});
		if (!freelancer) {
			throw new ExecutionError(
				__("quoting.responding.errors.freelancer_invalid", { _locale: interaction.locale }),
			);
		}

		// Create DM channel if it doesn't exist
		if (!freelancer.dmChannel) await freelancer.createDM();

		interaction.reply({
			embeds: [infoEmbed(__("quoting.deny.provide_reason", { _locale: interaction.locale }))],
			ephemeral: true,
		});
		const reasons = await interaction
			.channel!.awaitMessages({
				filter: (m) => m.author.id === interaction.user.id,
				max: 1,
				time: 120 * 1000,
			})
			.catch(() => null);

		if (!reasons?.first()) {
			interaction.editReply({
				embeds: [errorEmbed(__("quoting.deny.timed_out", { _locale: interaction.locale }))],
			});
			return;
		}
		reasons.first()!.delete();
		if (!freelancer.dmChannel) await freelancer.createDM();
		await freelancer.dmChannel!.send({
			embeds: [
				errorEmbed(
					`${__("quoting.deny.dm_notification", {
						client_mention: interaction.user.toString(),
						client_username: interaction.user.username,
						quote: quote.price.toFixed(2),
						_locale: interaction.locale,
					})}\n**${__("quoting.deny.reason_text", { _locale: interaction.locale })}:**\n\`\`\`\n${reasons.first()!.content}\`\`\``,
				),
			],
		});
		await interaction.editReply({
			embeds: [successEmbed(__("quoting.deny.successful", { _locale: interaction.locale }))],
			components: [],
		});
		quote.status = QuoteStatus.Declined;
		await quote.save();
		await quote.updateEmbed();
	}
}
