import { AnyComponentInteraction, ExecutionError } from "nhandler";

import Review from "@classes/Review";
import { TicketManager } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseComponent } from "@util/baseInterfaces";
import { disableButtons } from "@util/components/disableButtons";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class CompleteAcceptComponent extends BaseComponent {
	customId = "complete-accept";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		const ticketId = interaction.customId.split("-")[2];
		const comm = await TicketManager.fetch({ type: 0, guildId: interaction.guild!.id, id: ticketId });
		if (!comm || !(comm instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission", { _locale: interaction.locale }));
		}
		if (interaction.user.id !== comm.authorId) {
			throw new ExecutionError(__("completion.errors.not_author", { _locale: interaction.locale }));
		}
		await comm.acceptDelivery().catch(() => {
			throw new ExecutionError(__("completion.accept.errors.already_complete", { _locale: interaction.locale }));
		});
		// Disable buttons
		interaction.message!.edit({ components: disableButtons(interaction.message!.components) });
		interaction.reply({
			embeds: [
				successEmbed(__("completion.accept.successful.content", { _locale: interaction.locale })).setTitle(
					__("completion.accept.successful.title", { _locale: interaction.locale }),
				),
			],

			components: [Review.reviewButtons(comm.id)],
		});
	}
}
