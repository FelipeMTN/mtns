import { AnyComponentInteraction, ExecutionError } from "nhandler";

import Withdrawal from "@classes/Withdrawal";

import { BaseComponent } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class SubmitWithdrawComponent extends BaseComponent {
	customId = "bank-withdraw-submit";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		await interaction.deferReply({ ephemeral: true });
		const requestId = interaction.customId.split("-")[3];
		const withdrawal = await Withdrawal.findOne({ where: { id: requestId } });
		if (!withdrawal) {
			throw new ExecutionError(__("withdrawal.submit.errors.already_complete", { _locale: interaction.locale }));
		}
		const user = await this.client.users.fetch(withdrawal.userId);
		if (!user) {
			throw new ExecutionError(__("withdrawal.submit.errors.invalid_user", { _locale: interaction.locale }));
		}
		await withdrawal.markAsComplete();
		await withdrawal.updateLog();
		await interaction.editReply({
			embeds: [successEmbed(__("withdrawal.submit.successful", { id: requestId, _locale: interaction.locale }))],
		});
	}
}
