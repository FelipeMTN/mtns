import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import Invoice from "@classes/Invoice";
import { TicketManager } from "@classes/TicketManager";

import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runCancel(interaction: ChatInputCommandInteraction): Promise<void> {
	const ticket = await TicketManager.fetch({
		guildId: interaction.guild!.id,
		channelId: interaction.channel!.id,
	});
	if (!ticket) {
		throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
	}

	if (!ticket.invoiceId) {
		throw new ExecutionError(__("commands.invoice.cancel.errors.no_invoice", { _locale: interaction.locale }));
	}
	const invoice = await Invoice.getActive(ticket.invoiceId);
	if (!invoice) {
		throw new ExecutionError(__("commands.invoice.cancel.errors.no_invoice", { _locale: interaction.locale }));
	}

	invoice.cancelled = true;
	await invoice.save();
	await invoice.updateInvoiceEmbed();

	if (invoice.gateway?.cancelPayment) await invoice.gateway.cancelPayment(invoice);

	interaction.reply({
		embeds: [successEmbed(__("commands.invoice.cancel.successful", { _locale: interaction.locale }))],
	});
}
