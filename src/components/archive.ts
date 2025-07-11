import { PermissionsBitField } from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import { TicketManager } from "@classes/TicketManager";

import { BaseComponent } from "@util/baseInterfaces";
import { __ } from "@util/translate";

export default class ArchiveComponent extends BaseComponent {
	customId = "archive";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (!interaction.member) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}

		if (
			this.client.config.tickets.archive.requireManageGuild &&
			!(interaction.member.permissions as PermissionsBitField).has(PermissionsBitField.Flags.ManageGuild)
		) {
			throw new ExecutionError(
				__("commands.archive.errors.requires_manage_guild", { _locale: interaction.locale }),
			);
		}
		const ticket = await TicketManager.fetch({
			guildId: interaction.guild!.id,
			channelId: interaction.channel!.id,
		});

		if (!ticket) {
			throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
		}

		if (ticket.closed) {
			throw new ExecutionError(__("commands.archive.errors.already_archived", { _locale: interaction.locale }));
		}
		ticket
			.archive()
			.then(async (deleted: boolean) => {
				if (deleted) return;
				await interaction.deferUpdate();
			})
			.catch(async (err: any) => {
				throw new ExecutionError(
					__("commands.archive.errors.generic", { message: err.message, _locale: interaction.locale }),
				);
			});
	}
}
