import { AnyComponentInteraction } from "nhandler";

import { TicketManager, TicketType } from "@classes/TicketManager";

import { BaseComponent } from "@util/baseInterfaces";
import { errorEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class NewCommissionComponent extends BaseComponent {
	customId = "panel-new-commission";
	findFn = (event: AnyComponentInteraction) => event.customId === this.customId;

	async run(interaction: AnyComponentInteraction): Promise<void> {
		await interaction.deferReply({ ephemeral: true });
		TicketManager.create({
			type: TicketType.Commission,
			guild: interaction.guild!,
			author: interaction.user,
			locale: interaction.locale,
		})
			.then((ticket) => {
				interaction.editReply({
					embeds: [
						successEmbed(
							__("commands.new.ticket_created", {
								type: "commission",
								mention: interaction.user.toString(),
								username: interaction.user.username,
								link: `https://discord.com/channels/${interaction.guild!.id}/${ticket.channel.id}`,
								_locale: interaction.locale,
							}),
						),
					],
				});
			})
			.catch((err) => {
				interaction.editReply({
					embeds: [
						errorEmbed(
							__("commands.new.errors.generic", { message: err.message, _locale: interaction.locale }),
						),
					],
				});
			});
	}
}
