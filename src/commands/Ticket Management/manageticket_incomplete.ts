import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runIncomplete(interaction: ChatInputCommandInteraction, comm: CommissionTicket): Promise<void> {
	if (!comm.complete && !comm.deliveryAccepted) {
		throw new ExecutionError(__("commands.incomplete.errors.not_completed", { _locale: interaction.locale }));
	}
	comm.complete = false;
	comm.deliveryAccepted = false;
	await comm.save();
	interaction.reply({
		embeds: [
			successEmbed(
				__("commands.incomplete.successful", {
					serial: comm.serial.toString(),
					id: comm.id,
					_locale: interaction.locale,
				}),
			),
		],
		ephemeral: true,
	});
}
