import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { ExecutionError } from "nhandler";

import Client, { CLIENT_INSTANCE } from "@classes/Client";
import Invoice from "@classes/Invoice";
import Settings from "@classes/Settings";
import { TicketManager } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { errorEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runCreate(
	interaction: ChatInputCommandInteraction,
	{ settings }: { settings: Settings },
): Promise<void> {
	const client: Client = CLIENT_INSTANCE!;

	if (!(interaction.member as GuildMember).roles.cache.some((r) => r.id === settings.managerRole)) {
		throw new ExecutionError(__("generic.errors.must_be_manager", { _locale: interaction.locale }));
	}
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
	const amount = interaction.options.getNumber("amount", true);
	if (amount <= 0) {
		throw new ExecutionError(__("commands.invoice.create.errors.must_be_gt_0", { _locale: interaction.locale }));
	}
	if (amount > 10_000) {
		throw new ExecutionError(
			__("commands.invoice.create.errors.must_be_lt_10000", { _locale: interaction.locale }),
		);
	}

	if (!client.gateways.length) {
		throw new ExecutionError(
			__("commands.invoice.create.errors.all_gateways_disabled", { _locale: interaction.locale }),
		);
	}

	try {
		await interaction.deferReply({ ephemeral: true });

		const invoice = await Invoice.create({
			ticketId: ticket.id,
			userId: ticket.authorId,
			amount,
			invoiceMsgChannelId: interaction.channel!.id,
		});

		ticket.invoiceId = invoice.id;
		await ticket.save();

		await invoice.updateInvoiceEmbed();

		interaction.editReply({
			embeds: [
				successEmbed(
					__("commands.invoice.create.successful", {
						price: invoice.amount.toFixed(2),
						id: invoice.id,
						_locale: interaction.locale,
					}),
				),
			],
		});
	} catch (err: any) {
		console.log(err);
		const data = {
			embeds: [
				errorEmbed(
					__("commands.invoice.create.errors.generic", { message: err.message, _locale: interaction.locale }),
				),
			],
		};
		if (interaction.replied || interaction.deferred) interaction.editReply(data);
		else interaction.reply(data);
	}
}
