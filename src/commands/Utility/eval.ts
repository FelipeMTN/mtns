import { ApplicationCommandOptionType, ChatInputCommandInteraction, PermissionsBitField } from "discord.js";
import { ExecutionError } from "nhandler";

import Logger from "@classes/Logger";

import { BaseCommand } from "@util/baseInterfaces";
import { errorEmbed, successEmbed } from "@util/embeds";

export default class EvalCommand extends BaseCommand {
	name = "eval";
	description = "Execute code.";
	metadata = {
		category: "Utility",
	};
	options = [
		{
			type: ApplicationCommandOptionType.String,
			name: "code",
			description: "Code to execute.",
			required: true,
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.Administrator;

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!this.client.config.main.owners.includes(interaction.user.id)) {
			throw new ExecutionError("You don't have permission to do that.");
		}
		let code = interaction.options.getString("code", true);
		try {
			Logger.warn(`Eval was ran with code: '${code}'`);
			const evaled = (0, eval)(code);
			interaction.reply({
				embeds: [successEmbed(`**Evaluation Success:**\n\`\`\`\n${evaled.toString().slice(0, 2000)}\`\`\``)],
				ephemeral: true,
			});
		} catch (err: any) {
			interaction.reply({
				embeds: [errorEmbed(`**Evaluation Error:**\n\`\`\`\n${err.toString().slice(0, 2000)}\`\`\``)],
				ephemeral: true,
			});
		}
	}
}
