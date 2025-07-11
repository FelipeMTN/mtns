import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import Profile from "@classes/Profile";

import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runPayPalEmail(interaction: ChatInputCommandInteraction, profile: Profile): Promise<void> {
	const email = interaction.options.getString("email", true);
	if (email.length > 50) {
		throw new ExecutionError(__("commands.set.paypal.errors.exceeded_50", { _locale: interaction.locale }));
	}
	profile.paypalEmail = email;
	await profile.save();
	interaction.reply({
		embeds: [successEmbed(__("commands.set.paypal.successful", { value: email, _locale: interaction.locale }))],
		ephemeral: true,
	});
}
