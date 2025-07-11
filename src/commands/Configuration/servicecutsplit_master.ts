import { ApplicationCommandOptionType, ChatInputCommandInteraction, PermissionsBitField } from "discord.js";

import { BaseCommand } from "@util/baseInterfaces";

import { runAdd } from "./servicecutsplit_add";
import { runAllocateRest } from "./servicecutsplit_allocaterest";
import { runDecrease } from "./servicecutsplit_decrease";
import { runIncrease } from "./servicecutsplit_increase";
import { runList } from "./servicecutsplit_list";
import { runRemove } from "./servicecutsplit_remove";
import { runSet } from "./servicecutsplit_set";

export default class ServiceCutSplitCommand extends BaseCommand {
	name = "servicecutsplit";
	description = "Manage the service cut split settings.";
	metadata = {
		category: "Configuration",
	};
	options = [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "list",
			description: "Views all people to receive the split and their percentages.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "remove",
			description: "Removes a user from getting a service cut split.",
			options: [
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					description: "The user to remove from the service cut split.",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "add",
			description: "Adds a user to receive a percentage of the service cut and assigns them a percentage.",
			options: [
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					description: "The user to percentages to.",
					required: true,
				},
				{
					type: ApplicationCommandOptionType.Number,
					name: "percentage",
					description: "The percentage that the user should get.",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "set",
			description: "Sets a person's percentage cut.",
			options: [
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					description: "The user to set the percentage for.",
					required: true,
				},
				{
					type: ApplicationCommandOptionType.Number,
					name: "percentage",
					description: "The percentage to set the user to.",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "increase",
			description: "Increases a person's percentage cut.",
			options: [
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					description: "The user to increase the percentage for.",
					required: true,
				},
				{
					type: ApplicationCommandOptionType.Number,
					name: "by",
					description: "The percentage to increase the user by.",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "decrease",
			description: "Decreases a person's percentage cut.",
			options: [
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					description: "The user to decrease the percentage for.",
					required: true,
				},
				{
					type: ApplicationCommandOptionType.Number,
					name: "by",
					description: "The percentage to decrease the user by.",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "allocaterest",
			description: "Allocates the rest of the service cut to a user.",
			options: [
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					description: "The user to allocate the rest to.",
					required: true,
				},
			],
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const sub = interaction.options.getSubcommand();
		if (sub === "list") await runList(interaction);
		else if (sub === "remove") await runRemove(interaction);
		else if (sub === "add") await runAdd(interaction);
		else if (sub === "set") await runSet(interaction);
		else if (sub === "increase") await runIncrease(interaction);
		else if (sub === "decrease") await runDecrease(interaction);
		else if (sub === "allocaterest") await runAllocateRest(interaction);
	}
}
