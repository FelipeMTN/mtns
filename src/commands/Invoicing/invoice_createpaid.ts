import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import Invoice from "@classes/Invoice";
import { TicketManager } from "@classes/TicketManager";

import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runCreatePaid(interaction: ChatInputCommandInteraction): Promise<void> {
	const ticket = await TicketManager.fetch({
		guildId: interaction.guild!.id,
		channelId: interaction.channel!.id,
	});
	if (!ticket) {
		throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
	}
	if (ticket.invoiceId) {
		const existingInvoice = await Invoice.getActive(ticket.invoiceId);
		if (existingInvoice) {
			throw new ExecutionError(
				__("commands.invoice.create.errors.existing_active_invoice", { _locale: interaction.locale }),
			);
		}
	}
	const newInvoice = await Invoice.create({
		userId: ticket.authorId,
		ticketId: ticket.id,
		amount: interaction.options.getNumber("amount") || 0,
		tax: 0,
		paid: true,
		paidAmount: interaction.options.getNumber("amount") || 0,
		manual: true,
		started: true,
		cancelled: false,
	});

	ticket.invoiceId = newInvoice.id;
	await ticket.save();

	await newInvoice.updateInvoiceEmbed();

	interaction.reply({
		embeds: [
			successEmbed(
				__("commands.invoice.createpaid.successful", {
					price: newInvoice.amount.toFixed(2),
					id: newInvoice.id,
					_locale: interaction.locale,
				}),
			),
		],

		ephemeral: true,
	});
}
