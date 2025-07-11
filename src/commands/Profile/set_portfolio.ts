import { ChatInputCommandInteraction } from "discord.js";

import Profile from "@classes/Profile";

import { errorEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runPortfolio(interaction: ChatInputCommandInteraction, profile: Profile): Promise<void> {
	const value = interaction.options.getString("link", true);
	try {
		const url = new URL(value);
		profile.portfolio = url.href;
		await profile.save();
		interaction.reply({
			embeds: [
				successEmbed(__("commands.set.portfolio.successful", { value: url.href, _locale: interaction.locale })),
			],
			ephemeral: true,
		});
	} catch (err: any) {
		interaction.reply({
			embeds: [errorEmbed(__("commands.set.portfolio.errors.invalid_url", { _locale: interaction.locale }))],
			ephemeral: true,
		});
		return;
	}
}
