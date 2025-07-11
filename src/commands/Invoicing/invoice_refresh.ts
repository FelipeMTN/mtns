import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import { CLIENT_INSTANCE } from "@classes/Client";
import Invoice from "@classes/Invoice";
import { TicketManager } from "@classes/TicketManager";

import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runRefresh(interaction: ChatInputCommandInteraction): Promise<void> {
	const client = CLIENT_INSTANCE!;
	const comm = await TicketManager.fetch({
		guildId: interaction.guild!.id,
		channelId: interaction.channel!.id,
	});
	if (!comm) {
		throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
	}

	if (!comm.invoiceId) {
		throw new ExecutionError(__("commands.invoice.refresh.errors.no_invoice", { _locale: interaction.locale }));
	}

	const invoice = await Invoice.findOne({ where: { id: comm.invoiceId } });

	if (!invoice) {
		throw new ExecutionError(__("commands.invoice.refresh.errors.no_invoice", { _locale: interaction.locale }));
	}

	if (
		!invoice.gatewayId ||
		!client.gateways
			.filter((g) => g.metadata.supportsRefresh)
			.map((g) => g.metadata.id)
			.includes(invoice.gatewayId)
	) {
		throw new ExecutionError(
			__("commands.invoice.refresh.errors.invalid_gateway_type", { _locale: interaction.locale }),
		);
	}

	const status = await invoice.refreshProperties();
	if (!status) {
		throw new ExecutionError(__("commands.invoice.refresh.errors.generic", { _locale: interaction.locale }));
	}
	await invoice.updateInvoiceEmbed();

	const formattedStatus = status
		.toLowerCase()
		.replace(new RegExp("_", "g"), " ")
		.split(" ")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
	const link = `https://discord.com/channels/${comm.guildId}/${invoice.invoiceMsgChannelId}/${invoice.invoiceMsgId}`;

	interaction.reply({
		embeds: [
			successEmbed(
				__("commands.invoice.refresh.successful", {
					status: formattedStatus,
					link,
					_locale: interaction.locale,
				}),
			),
		],

		ephemeral: true,
	});
}
