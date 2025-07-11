import {
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	GuildMember,
	PermissionsBitField,
	Role,
} from "discord.js";
import { ExecutionError } from "nhandler";

import Settings from "@classes/Settings";
import { TicketManager } from "@classes/TicketManager";

import { BaseCommand } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class AddCommand extends BaseCommand {
	name = "add";
	description = "Add a user to the ticket.";
	metadata = {
		category: "Ticketing",
	};
	options = [
		{ name: "user", type: ApplicationCommandOptionType.User, required: true, description: "The user to add." },
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async run(interaction: ChatInputCommandInteraction, { settings }: { settings: Settings }): Promise<void> {
		if (!interaction.member) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}
		const ticket = await TicketManager.fetch({
			guildId: interaction.guild!.id,
			channelId: interaction.channel!.id,
			closed: false,
		});
		if (!ticket) {
			throw new ExecutionError(__("generic.errors.not_commission_or_archived", { _locale: interaction.locale }));
		}
		if (!(interaction.member as GuildMember).roles.cache.some((role: Role) => role.id === settings.managerRole)) {
			throw new ExecutionError(__("generic.errors.must_be_manager", { _locale: interaction.locale }));
		}

		const user = interaction.options.getUser("user", true);

		const added = await ticket.addUser(user);
		if (!added) {
			throw new ExecutionError(
				__("commands.add.errors.already_in_ticket", {
					username: user.username,
					mention: user.toString(),
					_locale: interaction.locale,
				}),
			);
		}

		interaction.reply({
			embeds: [
				successEmbed(
					__("commands.add.successful", {
						username: user.username,
						mention: user.toString(),
						_locale: interaction.locale,
					}),
				),
			],
		});
	}
}
