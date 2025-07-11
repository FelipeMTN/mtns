import { AnyComponentInteraction, ExecutionError } from "nhandler";

import Invoice from "@classes/Invoice";
import Logger from "@classes/Logger";
import { TicketManager } from "@classes/TicketManager";

import { BaseComponent } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class GenerateInvoiceComponent extends BaseComponent {
	customId = "generateinvoice";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		const [, gatewayId, invoiceId] = interaction.customId.split("-");
		const invoice = await Invoice.findOne({ where: { id: invoiceId } });
		if (!invoice) {
			throw new ExecutionError(__("invoice.create.errors.no_invoice", { _locale: interaction.locale }));
		}
		if (invoice.paid) {
			throw new ExecutionError(__("invoice.create.errors.already_paid", { _locale: interaction.locale }));
		}
		const gateway = this.client.gateways.find((g) => g.metadata.id === gatewayId);
		if (!gateway) {
			throw new ExecutionError(__("invoice.create.errors.invalid_gateway", { _locale: interaction.locale }));
		}

		await interaction.deferReply({ ephemeral: true });
		invoice.started = true;
		await invoice.save();
		const ticket = await TicketManager.fetch({ id: invoice.ticketId });

		invoice
			.createPayment(gateway, {
				amount: invoice.amount,
				title: __("invoice.gateway_note", { ticket_name: ticket?.channelName || "Unknown" }),
				description: __("invoice.gateway_note", { ticket_name: ticket?.channelName || "Unknown" }),
			})
			.then(async () => {
				interaction.editReply({
					embeds: [successEmbed(__("invoice.create.successful", { _locale: interaction.locale }))],
				});
			})
			.catch((err) => {
				Logger.error(err);
				throw new ExecutionError(__("invoice.create.errors.generic", { _locale: interaction.locale }));
			});
	}
}
