import {
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	GuildMember,
	PermissionsBitField,
} from "discord.js";
import ms from "ms";
import { ExecutionError } from "nhandler";

import { TicketManager } from "@classes/TicketManager";

import { BaseCommand } from "@util/baseInterfaces";
import { infoEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class ArchiveCommand extends BaseCommand {
	name = "archive";
	description = "Archive a ticket.";
	metadata = {
		category: "Ticketing",
	};
	options = [
		{
			type: ApplicationCommandOptionType.String,
			name: "reason",
			description: "The reason to archiving this ticket.",
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "delay",
			description: "Delay the archivation of this ticket.",
		},
		{
			type: ApplicationCommandOptionType.Boolean,
			name: "message_cancels_delay",
			description: "If delay is specified, decides whether a message will cancel the delayed archive.",
		},
	];

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const reason: string | null = interaction.options.getString("reason");
		const delay: string | null = interaction.options.getString("delay");
		const messageCancelsDelay: boolean = interaction.options.getBoolean("message_cancels_delay") ?? true;

		if (!interaction.member) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}

		if (
			this.client.config.tickets.archive.requireManageGuild &&
			!(interaction.member as GuildMember).permissions.has(PermissionsBitField.Flags.ManageGuild)
		) {
			throw new ExecutionError(
				__("commands.archive.errors.requires_manage_guild", { _locale: interaction.locale }),
			);
		}

		const ticket = await TicketManager.fetch({
			channelId: interaction.channel!.id,
		});

		if (!ticket) {
			throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
		}

		if (ticket.closed) {
			throw new ExecutionError(__("commands.archive.errors.already_archived", { _locale: interaction.locale }));
		}

		if (delay) {
			const parsedTime: number = ms(delay);
			if (isNaN(parsedTime)) {
				throw new ExecutionError(__("generic.errors.time.bad_format", { _locale: interaction.locale }));
			}
			if (parsedTime > ms("30d")) {
				throw new ExecutionError(
					__("commands.archive.errors.time_exceeds_30_days", { _locale: interaction.locale }),
				);
			}
			if (parsedTime < ms("1m")) {
				throw new ExecutionError(
					__("commands.archive.errors.time_exceeds_1_min", { _locale: interaction.locale }),
				);
			}
			ticket.createArchiveScheduler({
				userId: interaction.user.id,
				duration: parsedTime,
				messageCancels: messageCancelsDelay,
				reason: reason,
			});
			let content = "";
			if (messageCancelsDelay) {
				content += "\n" + __("commands.archive.scheduled.sending_will_cancel", { _locale: interaction.locale });
			}
			if (reason) {
				content += `\n**${__("commands.archive.reason_text", { _locale: interaction.locale })}:** ${reason}`;
			}
			interaction.reply({
				embeds: [
					infoEmbed(content).setAuthor({
						name: __("commands.archive.scheduled.successful", {
							relative: `${ms(parsedTime, { long: true })}`,
							_locale: interaction.locale,
						}),
					}),
				],
			});
		} else {
			ticket
				.archive(reason as string | undefined)
				.then((deleted: boolean) => {
					if (!deleted)
						interaction.reply({
							embeds: [successEmbed(__("commands.archive.successful", { _locale: interaction.locale }))],
							ephemeral: true,
						});
				})
				.catch(async (err: any) => {
					throw new ExecutionError(
						__("commands.archive.errors.generic", { message: err.message, _locale: interaction.locale }),
					);
				});
		}
	}
}
