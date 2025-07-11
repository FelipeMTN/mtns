import { ButtonInteraction } from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import { TicketManager, TicketType } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseComponent } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class DenyRejoinComponent extends BaseComponent {
	customId = "denyrejoin";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (!(interaction instanceof ButtonInteraction)) return;
		const commId = interaction.customId.split("-")[1];
		const comm = await TicketManager.fetch({ type: TicketType.Commission, id: commId, closed: false });

		if (!comm || !(comm instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission_or_archived", { _locale: interaction.locale }));
		}

		await comm.rejoinProposal(interaction.user);

		await interaction.reply({
			embeds: [successEmbed(__("commissions.deny.rejoined", { _locale: interaction.locale }))],
			ephemeral: true,
		});
	}
}
