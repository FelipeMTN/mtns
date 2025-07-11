import dayjs from "dayjs";
import { ApplicationCommandOptionType, ChatInputCommandInteraction, GuildMember, PermissionsBitField } from "discord.js";
import ms from "ms";
import { ExecutionError } from "nhandler";
import { Op } from "sequelize";

import SavedMessage from "@classes/SavedMessage";
import Ticket from "@classes/Ticket";
import { TicketManager, TicketType } from "@classes/TicketManager";

import { BaseCommand } from "@util/baseInterfaces";
import { infoEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class PurgeTicketsCommand extends BaseCommand {
	name = "purgetickets";
	description = "Purge inactive tickets by scheduling a 24-hour archive.";
	metadata = {
		category: "Ticketing",
	};
	options = [
		{
			name: "age",
			type: ApplicationCommandOptionType.String,
			description: "The age of tickets to be purged (e.g., 7d, 24h). Default is 7d.",
			required: false,
		},
		{
			name: "archive_time",
			type: ApplicationCommandOptionType.String,
			description: "The time until the ticket is archived (e.g., 24h, 48h). Default is 24h.",
			required: false,
		},
		{
			name: "ticket_type",
			type: ApplicationCommandOptionType.String,
			description: "The type of tickets to be purged.",
			required: false,
			choices: [
				{ name: "support", value: "support" },
				{ name: "applications", value: "applications" },
				{ name: "commissions", value: "commissions" },
			],
		},
		{
			name: "reason",
			type: ApplicationCommandOptionType.String,
			description: "The reason for purging the tickets.",
			required: false,
		},
		{
			name: "dry",
			type: ApplicationCommandOptionType.Boolean,
			description: "Check how many tickets would be purged without actually purging them.",
			required: false,
		},
	];

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply({ ephemeral: true });
		if (!interaction.member) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}

		if (this.client.config.tickets.archive.requireManageGuild && !(interaction.member as GuildMember).permissions.has(PermissionsBitField.Flags.ManageGuild)) {
			throw new ExecutionError(__("commands.archive.errors.requires_manage_guild", { _locale: interaction.locale }));
		}

		const ageInput = interaction.options.getString("age") || "7d";
		const ageMs = ms(ageInput);

		if (isNaN(ageMs)) {
			throw new ExecutionError(__("generic.errors.time.bad_format", { _locale: interaction.locale }));
		}

		const dry = interaction.options.getBoolean("dry") ?? false;
		const reason = interaction.options.getString("reason") || "Automatically purging inactive tickets.";
		const archiveTimeInput = interaction.options.getString("archive_time") || "24h";
		const archiveTimeMs = ms(archiveTimeInput);

		if (isNaN(archiveTimeMs)) {
			throw new ExecutionError(__("generic.errors.time.bad_format", { _locale: interaction.locale }));
		}

		const ticketTypeInput = interaction.options.getString("ticket_type");
		let ticketTypes = [TicketType.Commission, TicketType.Application, TicketType.Support];

		if (ticketTypeInput) {
			switch (ticketTypeInput) {
				case "support":
					ticketTypes = [TicketType.Support];
					break;
				case "applications":
					ticketTypes = [TicketType.Application];
					break;
				case "commissions":
					ticketTypes = [TicketType.Commission];
					break;
			}
		}

		const now = dayjs();
		const ageDate = now.subtract(ageMs, "milliseconds");

		const tickets = await TicketManager.fetchAll({
			closed: false,
			type: {
				[Op.in]: ticketTypes,
			},
		});

		let dryModeTickets: Ticket[] = [];
		let purgedCount = 0;

		for (const ticket of tickets) {
			const lastMessage = await SavedMessage.findOne({
				where: {
					ticketId: ticket.id,
					messageCreatedAt: {
						[Op.gt]: ageDate.toDate(),
					},
				},
				order: [["messageCreatedAt", "DESC"]],
			});

			if (!lastMessage) {
				purgedCount++;

				if (dry) {
					dryModeTickets.push(ticket);
					continue; // Do not actually purge on dry mode
				}

				await ticket.createArchiveScheduler({
					userId: interaction.user.id,
					duration: archiveTimeMs,
					messageCancels: true,
					reason: reason,
				});

				let content = "";
				content += "\n" + __("commands.archive.scheduled.sending_will_cancel", { _locale: interaction.locale });
				content += `\n**${__("commands.archive.reason_text", { _locale: interaction.locale })}:** ${reason}`;

				ticket.channel.send({
					embeds: [
						infoEmbed(content).setAuthor({
							name: __("commands.archive.scheduled.successful", {
								relative: `${ms(archiveTimeMs, { long: true })}`,
								_locale: interaction.locale,
							}),
						}),
					],
				});
			}
		}

		if (!dry) {
			interaction.editReply({
				embeds: [successEmbed(`Scheduled ${purgedCount} tickets for archiving in ${ms(archiveTimeMs, { long: true })}.`)],
			});
		} else {
			let assembledCommand = "`";
			assembledCommand += "/purgetickets";
			if (ageInput !== "7d") assembledCommand += ` age:${ageInput}`;
			if (archiveTimeInput !== "24h") assembledCommand += ` archive_time:${archiveTimeInput}`;
			if (reason !== "Automatically purging inactive tickets.") assembledCommand += ` reason:${reason}`;
			if (ticketTypeInput) assembledCommand += ` ticket_type:${ticketTypeInput}`;
			assembledCommand += "`";
			interaction.editReply({
				embeds: [
					successEmbed(
						`Dry mode found ${purgedCount} tickets eligible for purging.\n> ${dryModeTickets
							.slice(0, 25)
							.map((t) => `<#${t.channelId}>`)
							.join(", ")}${purgedCount > 25 ? ` and ${purgedCount - 25} more...` : ""}\nRun ${assembledCommand} to actually starting purging.`,
					),
				],
			});
		}
	}
}
