import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runRepostTicket(interaction: ChatInputCommandInteraction, comm: CommissionTicket): Promise<void> {
	if (comm.freelancerId) {
		throw new ExecutionError(__("commands.repost.errors.already_claimed", { _locale: interaction.locale }));
	}

	comm.repostLog();

	interaction.reply({
		embeds: [successEmbed(__("commands.repost.successful", { _locale: interaction.locale }))],
	});
}
