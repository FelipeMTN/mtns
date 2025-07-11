import { ChatInputCommandInteraction } from "discord.js";

import Profile from "@classes/Profile";

import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runTimezone(interaction: ChatInputCommandInteraction, profile: Profile): Promise<void> {
	const timezone = interaction.options.getString("timezone", true);
	profile.timezone = timezone;
	await profile.save();
	interaction.reply({
		embeds: [
			successEmbed(__("commands.set.timezone.successful", { value: timezone, _locale: interaction.locale })),
		],
		ephemeral: true,
	});
}
