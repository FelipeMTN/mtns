import { ApplicationCommandOptionType, ChatInputCommandInteraction, PermissionsBitField } from "discord.js";
import { ExecutionError } from "nhandler";

import Settings from "@classes/Settings";
import { TicketManager, TicketType } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseCommand } from "@util/baseInterfaces";
import { __ } from "@util/translate";

import { runForceComplete } from "./manageticket_forcecomplete";
import { runIncomplete } from "./manageticket_incomplete";
import { runRepostTicket } from "./manageticket_repost_commission";
import { runRepostReview } from "./manageticket_repost_review";

export default class ManageTicketCommand extends BaseCommand {
	name = "manageticket";
	description = "Manage this commission as an admin.";
	metadata = {
		category: "Ticket Management",
	};
	options = [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "complete",
			description: "Mark the ticket as complete.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "incomplete",
			description: "Revert the status of this ticket's completeness.",
		},
		{
			type: ApplicationCommandOptionType.SubcommandGroup,
			name: "repost",
			description: "Manage this ticket's completion status.",
			options: [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "commission",
					description: "Repost the commission log.",
				},
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "review",
					description: "Repost this ticket's review, if given previously.",
				},
			],
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async run(interaction: ChatInputCommandInteraction, { settings }: { settings: Settings }): Promise<void> {
		if (!interaction.guild) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}
		if (!interaction.channel) {
			throw new ExecutionError(__("generic.errors.not_commission", { _locale: interaction.locale }));
		}
		const comm = await TicketManager.fetch({
			type: TicketType.Commission,
			channelId: interaction.channel!.id,
			pending: false,
			closed: false,
		});
		if (!comm || !(comm instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission", { _locale: interaction.locale }));
		}
		const group = interaction.options.getSubcommandGroup();
		const sub = interaction.options.getSubcommand();
		if (sub === "complete") await runForceComplete(interaction, comm);
		if (sub === "incomplete") await runIncomplete(interaction, comm);
		if (group === "repost" && sub === "commission") await runRepostTicket(interaction, comm);
		if (group === "repost" && sub === "review") await runRepostReview(interaction, comm, settings);
	}
}
