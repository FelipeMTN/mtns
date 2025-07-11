import { PermissionsBitField } from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import { TicketManager } from "@classes/TicketManager";

import { BaseComponent } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class UnarchiveComponent extends BaseComponent {
	customId = "unarchive";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (!interaction.member) {
			throw new ExecutionError("This command can only be used in a server.");
		}
		if (
			this.client.config.tickets.archive.requireManageGuild &&
			typeof interaction.member.permissions !== "string" && // Weird discord.js typing bug
			!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
		) {
			throw new ExecutionError(
				__("commands.unarchive.errors.requires_manage_guild", { _locale: interaction.locale }),
			);
		}
		const ticket = await TicketManager.fetch({
			guildId: interaction.guild!.id,
			channelId: interaction.channel!.id,
		});
		if (!ticket) {
			throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
		}
		if (!ticket.closed) {
			throw new ExecutionError(__("commands.unarchive.errors.not_archived", { _locale: interaction.locale }));
		}
		await interaction.deferReply({ ephemeral: true });
		ticket
			.unarchive()
			.then(() => {
				interaction.editReply({
					embeds: [successEmbed(__("commands.unarchive.successful", { _locale: interaction.locale }))],
				});
			})
			.catch(async (err: any) => {
				throw new ExecutionError(err.message);
			});
	}
}
