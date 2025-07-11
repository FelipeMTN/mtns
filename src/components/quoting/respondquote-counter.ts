import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import Quote from "@classes/Quote";
import { TicketManager } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseComponent } from "@util/baseInterfaces";
import { __ } from "@util/translate";

export default class RespondQuoteCounterComponent extends BaseComponent {
	customId = "respondquote-counter";

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
				__("quoting.responding.errors.freelancer_invalid", { _locale: interaction.locale }),
			);
		}

		// Query the freelancer user
		const freelancer = await this.client.users.fetch(quote.freelancerId).catch(() => {});
		if (!freelancer) {
			throw new ExecutionError(
				__("quoting.responding.errors.freelancer_invalid", { _locale: interaction.locale }),
			);
		}

		// Preamptively create DM channel if it doesn't exist
		if (!freelancer.dmChannel) await freelancer.createDM().catch(() => null);

		// Open modal
		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("value")
				.setLabel(__("quoting.counter.modal_field_price_label", { _locale: interaction.locale }))
				.setMinLength(1)
				.setMaxLength(20)
				.setRequired(true)
				.setStyle(TextInputStyle.Short),
		);

		const modal = new ModalBuilder()
			.setCustomId(`counteroffer-counter-submit-${quote.id}`)
			.setTitle(
				__("quoting.counter.modal_title", {
					quote: quote.price.toFixed(2),
					_locale: interaction.locale,
				}),
			)
			.addComponents(row);
		await interaction.showModal(modal);
	}
}
