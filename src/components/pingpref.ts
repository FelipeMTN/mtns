import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import { TicketManager } from "@classes/TicketManager";

import { BaseComponent } from "@util/baseInterfaces";
import { infoEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class PingPreferenceComponent extends BaseComponent {
	customId = "pingpref";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		const [, commissionRid, type] = interaction.customId.split("-");
		const enable = type === "enable";
		const comm = await TicketManager.fetch({ type: 0, id: commissionRid });
		if (!comm) {
			throw new ExecutionError(__("generic.errors.not_commission", { _locale: interaction.locale }));
		}
		if (comm.authorId !== interaction.user.id) {
			throw new ExecutionError(__("tickets.ping_preference.errors.not_author", { _locale: interaction.locale }));
		}

		comm.mentions = enable;
		await comm.save();

		let updatedRow;
		if (enable) {
			updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`pingpref-${comm.id}-enable`)
					.setLabel(__("generic.already_enabled_text", { _locale: interaction.locale }))
					.setStyle(ButtonStyle.Success)
					.setDisabled(true),
				new ButtonBuilder()
					.setCustomId(`pingpref-${comm.id}-disable`)
					.setLabel(__("generic.disable_text", { _locale: interaction.locale }))
					.setStyle(ButtonStyle.Danger)
					.setDisabled(false),
			);
		} else {
			updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`pingpref-${comm.id}-enable`)
					.setLabel(__("generic.enable_text", { _locale: interaction.locale }))
					.setStyle(ButtonStyle.Success)
					.setDisabled(false),
				new ButtonBuilder()
					.setCustomId(`pingpref-${comm.id}-disable`)
					.setLabel(__("generic.already_disabled_text", { _locale: interaction.locale }))
					.setStyle(ButtonStyle.Danger)
					.setDisabled(true),
			);
		}
		await interaction
			.message!.edit({
				embeds: [
					infoEmbed(
						enable
							? __("tickets.ping_preference.currently_on", { _locale: interaction.locale })
							: __("tickets.ping_preference.currently_off", { _locale: interaction.locale }),
					),
				],

				components: [updatedRow],
			})
			.catch(() => null);
		interaction.deferUpdate();
	}
}
