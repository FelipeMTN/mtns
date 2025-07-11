import { ApplicationCommandOptionType, ChatInputCommandInteraction, PermissionsBitField, User } from "discord.js";

import { BaseCommand } from "@util/baseInterfaces";

import { runBlacklistAdd } from "./blacklist_add";
import { runBlacklistRemove } from "./blacklist_remove";
import { runBlacklistStatus } from "./blacklist_status";

const userOption = {
	type: ApplicationCommandOptionType.User,
	name: "user",
	description: "The user to perform the operation on.",
	required: true,
};

export default class BlacklistCommand extends BaseCommand {
	name = "blacklist";
	description = "Blacklist a user from using the bot.";
	metadata = {
		category: "Configuration",
	};
	options = [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "add",
			description: "Blacklist a user.",
			options: [userOption],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "remove",
			description: "Unblacklist a user.",
			options: [userOption],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "status",
			description: "Check the blacklist status a user.",
			options: [userOption],
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const sub = interaction.options.getSubcommand();
		const user: User = interaction.options.getUser("user", true);
		if (sub === "add") await runBlacklistAdd(interaction, user);
		else if (sub === "remove") await runBlacklistRemove(interaction, user);
		else if (sub === "status") await runBlacklistStatus(interaction, user);
	}
}
