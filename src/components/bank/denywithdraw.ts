import { ButtonInteraction } from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import Withdrawal from "@classes/Withdrawal";

import { BaseComponent } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class DenyWithdrawComponent extends BaseComponent {
	customId = "bank-withdraw-deny";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (!(interaction instanceof ButtonInteraction)) return;
		const requestId = interaction.customId.split("-")[3];
		const withdrawal = await Withdrawal.findOne({ where: { id: requestId } });
		if (!withdrawal) {
			throw new ExecutionError(__("withdrawal.deny.errors.already_denied", { _locale: interaction.locale }));
		}
		const user = await this.client.users.fetch(withdrawal.userId);
		if (!user) {
			throw new ExecutionError(__("withdrawal.deny.errors.invalid_user", { _locale: interaction.locale }));
		}
		withdrawal.markAsDenied();
		await withdrawal.updateLog();
		interaction.reply({
			embeds: [successEmbed(__("withdrawal.deny.successful", { id: requestId, _locale: interaction.locale }))],
			ephemeral: true,
		});
	}
}
