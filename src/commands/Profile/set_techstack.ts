import { ChatInputCommandInteraction } from "discord.js";

import Profile from "@classes/Profile";

import { errorEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runTechstack(interaction: ChatInputCommandInteraction, profile: Profile): Promise<void> {
	const value = interaction.options.getString("stack", true);
	if (value.length > 100) {
		interaction.reply({
			embeds: [errorEmbed(__("commands.set.techstack.errors.exceeded_100", { _locale: interaction.locale }))],
			ephemeral: true,
		});
		return;
	}
	profile.stack = value;
	await profile.save();
	interaction.reply({
		embeds: [successEmbed(__("commands.set.techstack.successful", { value: value, _locale: interaction.locale }))],
		ephemeral: true,
	});
}
