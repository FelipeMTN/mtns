import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import Client, { CLIENT_INSTANCE } from "@classes/Client";
import { TicketManager } from "@classes/TicketManager";
import Trial from "@classes/Trial";

import { infoEmbed, successEmbed } from "@util/embeds";
import { badge } from "@util/formatters/badge";
import { __ } from "@util/translate";

export async function runSend(interaction: ChatInputCommandInteraction): Promise<void> {
	const client: Client = CLIENT_INSTANCE!;

	const ticket = await TicketManager.fetch({
		type: 1,
		guildId: interaction.guild!.id,
		channelId: interaction.channel!.id,
	});
	if (!ticket) {
		throw new ExecutionError(__("generic.errors.not_application", { _locale: interaction.locale }));
	}
	const trial = client.config.tickets.trials.list.find((t) => t.name === interaction.options.getString("name", true));
	if (!trial) {
		throw new ExecutionError(__("commands.trial.errors.not_found", { _locale: interaction.locale }));
	}
	const deadlinePeriodMs = trial.deadline * 60 * 60 * 1000;
	const deadlineSecFromNow = Math.floor((Date.now() + deadlinePeriodMs) / 1000);
	let desc =
		badge(
			__("commands.trial.trial_title", {
				_locale: interaction.locale,
				name: trial.name,
				deadline: `<t:${deadlineSecFromNow}:R>`,
			}),
		) +
		"\n\n" +
		trial.content.withPlaceholders({
			deadline: `<t:${deadlineSecFromNow}:R>`,
			deadline_short: `<t:${deadlineSecFromNow}:d>`,
			deadline_date: `<t:${deadlineSecFromNow}:D>`,
		});
	if (client.config.tickets.trials?.footer) {
		desc += "\n\n" + client.config.tickets.trials.footer;
	}
	const embed = infoEmbed(desc);
	await interaction.channel!.send({
		embeds: [embed],
	});

	await Trial.create({ ticketId: ticket.id, name: trial.name, deadline: Date.now() + deadlinePeriodMs });

	await interaction.reply({
		embeds: [successEmbed(__("commands.trial.created", { _locale: interaction.locale }))],
		ephemeral: true,
	});
}
