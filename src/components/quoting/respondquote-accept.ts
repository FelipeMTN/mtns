import { ButtonInteraction } from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import Quote, { QuoteStatus } from "@classes/Quote";
import { TicketManager, TicketType } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseComponent } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class RespondQuoteAcceptComponent extends BaseComponent {
	customId = "respondquote-accept";

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

		if (comm.type !== TicketType.Commission || !(comm instanceof CommissionTicket)) {
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
		let dmChannel;
		if (!freelancer.dmChannel) dmChannel = await freelancer.createDM().catch(() => null);

		quote.status = QuoteStatus.Accepted;
		await quote.save();
		await quote.updateEmbed();

		interaction.deferUpdate();
		if (dmChannel) {
			await dmChannel.send({
				embeds: [
					successEmbed(
						__("quoting.accept.dm_notification", {
							client_mention: interaction.user.toString(),
							client_username: interaction.user.username,
							quote: quote.price.toFixed(2),
							_locale: interaction.locale,
						}),
					),
				],
			});
		}
		await comm.assign(freelancer);
		await comm.updateLog();
	}
}
