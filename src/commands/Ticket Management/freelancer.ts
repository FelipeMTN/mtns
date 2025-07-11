import { ApplicationCommandOptionType, ChatInputCommandInteraction, PermissionsBitField } from "discord.js";
import { ExecutionError } from "nhandler";

import { TicketManager, TicketType } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseCommand } from "@util/baseInterfaces";
import { errorEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class FreelancerCommand extends BaseCommand {
	name = "freelancer";
	description = "Assign, unassign or transfer freelancers to the ticket.";
	metadata = {
		category: "Ticket Management",
	};
	options = [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "assign",
			description: "Force assign a freelancer to this commission.",
			options: [
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					description: "The user to assign to the ticket.",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "unassign",
			description: "Unassign the freelancer of this commission.",
			options: [],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "transfer",
			description: "Transfer the commission to another freelancer.",
			options: [
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					description: "The user to transfer the ticket to.",
					required: true,
				},
			],
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const sub = interaction.options.getSubcommand();
		if (sub === "assign") await this.runAssign(interaction);
		if (sub === "unassign") await this.runUnassign(interaction);
		if (sub === "transfer") await this.runTransfer(interaction);
	}

	async runAssign(interaction: ChatInputCommandInteraction) {
		const user = interaction.options.getUser("user", true);
		const ticket = await TicketManager.fetch({ channelId: interaction.channelId });
		if (!ticket) {
			throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
		}
		if (ticket.type !== 0 || !(ticket instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission", { _locale: interaction.locale }));
		}
		if (ticket.freelancerId) {
			throw new ExecutionError(
				__("commands.freelancer.assign.errors.already_has_freelancer", { _locale: interaction.locale }),
			);
		}
		ticket
			.assign(user)
			.then(() => {
				ticket.updateLog();
				interaction.reply({
					embeds: [
						successEmbed(
							__("commands.freelancer.assign.successful", {
								mention: user.toString(),
								username: user.username,
								_locale: interaction.locale,
							}),
						),
					],
				});
			})
			.catch((err) => {
				interaction.reply({
					embeds: [
						errorEmbed(
							__("commands.freelancer.assign.errors.generic", {
								message: err.message,
								_locale: interaction.locale,
							}),
						),
					],
				});
			});
	}

	async runUnassign(interaction: ChatInputCommandInteraction) {
		const ticket = await TicketManager.fetch({ channelId: interaction.channelId });
		if (!ticket) {
			throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
		}
		if (ticket.type !== 0 || !(ticket instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission", { _locale: interaction.locale }));
		}
		if (!ticket.freelancerId) {
			throw new ExecutionError(
				__("commands.freelancer.unassign.errors.no_freelancer_assigned", { _locale: interaction.locale }),
			);
		}
		ticket
			.unassign()
			.then(() => {
				ticket.updateLog();
				interaction.reply({
					embeds: [
						successEmbed(__("commands.freelancer.unassign.successful", { _locale: interaction.locale })),
					],
				});
			})
			.catch((err) => {
				interaction.reply({
					embeds: [
						errorEmbed(
							__("commands.freelancer.unassign.errors.generic", {
								message: err.message,
								_locale: interaction.locale,
							}),
						),
					],
				});
			});
	}

	async runTransfer(interaction: ChatInputCommandInteraction) {
		const user = interaction.options.getUser("user", true);
		const ticket = await TicketManager.fetch({ channelId: interaction.channelId });
		if (!ticket) {
			throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
		}
		if (ticket.type !== TicketType.Commission || !(ticket instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission", { _locale: interaction.locale }));
		}
		if (!ticket.freelancerId) {
			throw new ExecutionError(
				__("commands.freelancer.transfer.errors.no_freelancer_assigned", { _locale: interaction.locale }),
			);
		}

		ticket
			.unassign()
			.then(() => {
				ticket.assign(user).then(() => {
					interaction.reply({
						embeds: [
							successEmbed(
								__("commands.freelancer.transfer.successful", {
									username: user.username,
									mention: user.toString(),
									_locale: interaction.locale,
								}),
							),
						],
					});
				});
			})
			.catch((err) => {
				interaction.reply({
					embeds: [
						errorEmbed(
							__("commands.freelancer.transfer.errors.generic", {
								message: err.message,
								_locale: interaction.locale,
							}),
						),
					],
				});
			});
	}
}
