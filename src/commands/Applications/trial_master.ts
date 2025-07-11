import {
	ApplicationCommandOptionType,
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	PermissionsBitField,
} from "discord.js";

import { BaseCommand } from "@util/baseInterfaces";

import { runSend } from "./trial_send";

export default class TrialCommand extends BaseCommand {
	name = "trial";
	description = "Display an application trial in this channel.";
	metadata = {
		category: "Applications Management",
	};
	options = [
		{
			name: "send",
			type: ApplicationCommandOptionType.Subcommand,
			description: "Send a specific trial.",
			options: [
				{
					name: "name",
					type: ApplicationCommandOptionType.String,
					required: true,
					description: "The name of the trial.",
					autocomplete: true,
				},
			],
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		const focusedValue = interaction.options.getFocused();
		let trials = this.client.config.tickets.trials.list.map((t) => ({ name: t.name, value: t.name }));
		const filteredTrials = trials.filter((t) => {
			return t.name.toLowerCase().startsWith(focusedValue.toLowerCase());
		});
		await interaction.respond(filteredTrials);
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const sub = interaction.options.getSubcommand();
		if (sub === "send") await runSend(interaction);
	}
}
