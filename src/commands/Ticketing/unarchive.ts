import { ChatInputCommandInteraction, GuildMember, PermissionsBitField } from "discord.js";
import { ExecutionError } from "nhandler";

import LateArchive from "@classes/LateArchive";
import { TicketManager } from "@classes/TicketManager";

import { BaseCommand } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class UnarchiveCommand extends BaseCommand {
	name = "unarchive";
	description = "Unarchive a ticket.";
	metadata = {
		category: "Ticketing",
	};

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.member) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}

		if (
			this.client.config.tickets.archive.requireManageGuild &&
			!(interaction.member as GuildMember).permissions.has(PermissionsBitField.Flags.ManageGuild)
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
			const scheduledArchives = await LateArchive.findAll({ where: { ticketId: ticket.id } });
			if (scheduledArchives.length) {
				scheduledArchives.map((l) => l.destroy());
				interaction.reply({
					embeds: [successEmbed(__("commands.unarchive.scheduled_removed", { _locale: interaction.locale }))],
				});
				return;
			} else {
				throw new ExecutionError(__("commands.unarchive.errors.not_archived", { _locale: interaction.locale }));
			}
		}
		ticket
			.unarchive()
			.then(() => {
				interaction.reply({
					embeds: [successEmbed(__("commands.unarchive.successful", { _locale: interaction.locale }))],
					ephemeral: true,
				});
			})
			.catch(async (err: any) => {
				throw new ExecutionError(err.message);
			});
	}
}
