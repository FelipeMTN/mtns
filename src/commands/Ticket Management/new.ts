import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";

import { TicketManager, TicketType } from "@classes/TicketManager";

import { BaseCommand } from "@util/baseInterfaces";
import { errorEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class NewCommand extends BaseCommand {
	name = "new";
	description = "Open a new ticket.";
	metadata = {
		category: "Ticket Management",
	};
	options = [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "commission",
			description: "Order quality services.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "application",
			description: "Apply to be a freelancer.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "support",
			description: "Get support from the management team.",
		},
	];

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply({ ephemeral: true });
		let subcommand = interaction.options.getSubcommand();

		let type: TicketType;
		if (subcommand === "commission") type = TicketType.Commission;
		else if (subcommand === "application") type = TicketType.Application;
		else if (subcommand === "support") type = TicketType.Support;
		else type = TicketType.Support;

		TicketManager.create({
			type: type,
			guild: interaction.guild!,
			author: interaction.user,
			locale: interaction.locale,
		})
			.then((ticket) => {
				const embed = successEmbed(
					__("commands.new.ticket_created", {
						mention: interaction.user.toString(),
						username: interaction.user.username,
						link: `https://discord.com/channels/${interaction.guild!.id}/${ticket.channel.id}`,
						type: subcommand,
						_locale: interaction.locale,
					}),
				);
				interaction.editReply({ embeds: [embed] });
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
