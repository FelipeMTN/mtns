import { ApplicationCommandOptionType, ChatInputCommandInteraction, PermissionsBitField } from "discord.js";
import { ExecutionError } from "nhandler";

import Settings from "@classes/Settings";
import { TicketManager, TicketType } from "@classes/TicketManager";
import ApplicationTicket from "@classes/Tickets/ApplicationTicket";

import { BaseCommand } from "@util/baseInterfaces";
import { __ } from "@util/translate";

import { runAccept } from "./application_accept";
import { runDeny } from "./application_deny";

export default class ApplicationsCommand extends BaseCommand {
	name = "application";
	description = "Accept or deny applications.";
	metadata = {
		category: "Applications Management",
	};
	options = [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "accept",
			description: "Accept this application.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "deny",
			description: "Deny this application.",
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "reason",
					description: "The reason for denying this application.",
					required: true,
				},
			],
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async run(interaction: ChatInputCommandInteraction, { settings }: { settings: Settings }): Promise<void> {
		if (!interaction.channel) return;
		await interaction.deferReply();

		const application = await TicketManager.fetch({
			type: TicketType.Application,
			guildId: interaction.guild!.id,
			channelId: interaction.channel!.id,
		});

		if (!application || !(application instanceof ApplicationTicket)) {
			throw new ExecutionError(__("generic.errors.not_application", { _locale: interaction.locale }));
		}

		const member = await interaction.guild!.members.fetch(application.authorId);
		if (!member) {
			throw new ExecutionError(__("generic.errors.member_undefined", { _locale: interaction.locale }));
		}

		const sub = interaction.options.getSubcommand();
		if (sub === "accept") await runAccept(interaction, application, member, settings);
		else if (sub === "deny") await runDeny(interaction, member);
	}
}
