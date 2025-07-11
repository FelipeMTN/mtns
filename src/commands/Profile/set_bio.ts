import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import Profile from "@classes/Profile";

import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runBio(interaction: ChatInputCommandInteraction, profile: Profile): Promise<void> {
	const value = interaction.options.getString("content", true);
	if (value.length > 500) {
		throw new ExecutionError(__("commands.set.bio.errors.exceeded_500", { _locale: interaction.locale }));
	}
	profile.bio = value;
	await profile.save();
	interaction.reply({
		embeds: [successEmbed(__("commands.set.bio.successful", { value, _locale: interaction.locale }))],
		ephemeral: true,
	});
}
