import {
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	GuildMemberRoleManager,
	PermissionsBitField,
} from "discord.js";
import { ExecutionError } from "nhandler";

import Settings from "@classes/Settings";
import { TicketManager } from "@classes/TicketManager";

import { BaseCommand } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class RemoveCommand extends BaseCommand {
	name = "remove";
	description = "Remove a user from the ticket.";
	metadata = {
		category: "Ticketing",
	};
	options = [
		{ name: "user", type: ApplicationCommandOptionType.User, required: true, description: "The user to remove." },
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
			throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
		}
		if (!(interaction.member.roles as GuildMemberRoleManager).cache.some((r) => r.id === settings.managerRole)) {
			throw new ExecutionError(__("generic.errors.must_be_manager", { _locale: interaction.locale }));
		}

		const user = interaction.options.getUser("user", true);

		if (user.id === interaction.user.id) {
			throw new ExecutionError(__("commands.remove.errors.cant_remove_self", { _locale: interaction.locale }));
		}
		if (user.id === ticket.authorId) {
			throw new ExecutionError(__("commands.remove.errors.cant_remove_author", { _locale: interaction.locale }));
		}

		const removed = await ticket.removeUser(user);
		if (!removed) {
			throw new ExecutionError(__("commands.remove.errors.not_in_ticket", { _locale: interaction.locale }));
		}

		interaction.reply({
			embeds: [
				successEmbed(
					__("commands.remove.successful", {
						username: user.username,
						mention: user.toString(),
						_locale: interaction.locale,
					}),
				),
			],
		});
	}
}
