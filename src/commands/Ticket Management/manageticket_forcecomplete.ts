import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import Review from "@classes/Review";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runForceComplete(
	interaction: ChatInputCommandInteraction,
	comm: CommissionTicket,
): Promise<void> {
	if (comm.complete && comm.deliveryAccepted) {
		throw new ExecutionError(__("commands.forcecomplete.errors.already_complete", { _locale: interaction.locale }));
	}
	if (!comm.freelancerId) {
		throw new ExecutionError(
			__("generic.errors.commission_not_assigned_to_freelancer", { _locale: interaction.locale }),
		);
	}
	await comm.acceptDelivery().catch(() => {
		throw new ExecutionError(__("completion.accept.errors.already_complete", { _locale: interaction.locale }));
	});
	interaction.reply({
		embeds: [
			successEmbed(__("completion.accept.successful.content", { _locale: interaction.locale })).setTitle(
				__("completion.accept.successful.title", { _locale: interaction.locale }),
			),
		],

		components: [Review.reviewButtons(comm.id)],
	});
}
