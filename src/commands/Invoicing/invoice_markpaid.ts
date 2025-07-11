import { ChatInputCommandInteraction, GuildMemberRoleManager } from "discord.js";
import { ExecutionError } from "nhandler";

import Invoice from "@classes/Invoice";
import Settings from "@classes/Settings";
import { TicketManager } from "@classes/TicketManager";

import { errorEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runMarkPaid(
	interaction: ChatInputCommandInteraction,
	{ settings }: { settings: Settings },
): Promise<void> {
	if (!interaction.member) {
		throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
	}
	const ticket = await TicketManager.fetch({
		guildId: interaction.guild!.id,
		channelId: interaction.channel!.id,
	});
	if (!ticket) {
		throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
	}
	if (!(interaction.member.roles as GuildMemberRoleManager).cache.some((r) => r.id === settings.managerRole)) {
		interaction.reply({
			embeds: [errorEmbed(__("generic.errors.must_be_manager", { _locale: interaction.locale }))],
			ephemeral: true,
		});
		return;
	}
	if (!ticket.invoiceId) {
		interaction.reply({
			embeds: [errorEmbed(__("commands.invoice.markpaid.errors.no_invoice", { _locale: interaction.locale }))],
			ephemeral: true,
		});
		return;
	}
	const invoice = await Invoice.getActive(ticket.invoiceId);
	if (!invoice) {
		throw new ExecutionError(__("commands.invoice.markpaid.errors.no_invoice", { _locale: interaction.locale }));
	}
	if (invoice.paid) {
		throw new ExecutionError(__("commands.invoice.markpaid.errors.already_paid", { _locale: interaction.locale }));
	}
	await invoice.markPaid();
	await invoice.updateInvoiceEmbed();
	interaction.reply({
		embeds: [successEmbed(__("commands.invoice.markpaid.successful", { _locale: interaction.locale }))],
		ephemeral: true,
	});
}
