import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import UserPreferences from "@classes/UserPreferences";

import { BaseCommand } from "@util/baseInterfaces";
import { infoEmbed, successEmbed } from "@util/embeds";

export default class LangCommand extends BaseCommand {
	name = "lang";
	description = "Set the language to use when interfacing with the bot.";
	metadata = {
		category: "Configuration",
	};
	options = [
		{
			type: ApplicationCommandOptionType.String,
			name: "language",
			description: "Set the language to use when interfacing with the bot.",
			required: true,
			choices: [
				{ name: "English", value: "en-US" },
				{ name: "Español", value: "es-ES" },
				{ name: "Deutsch", value: "de" },
				{ name: "Français", value: "fr" },
				{ name: "Italiano", value: "it" },
				{ name: "Polski", value: "pl" },
				{ name: "Русский", value: "ru" },
				{ name: "Türkçe", value: "tr" },
				{ name: "Português", value: "pt-BR" },
			],
		},
	];

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const language = interaction.options.getString("language", true);

		if (!this.client.locales[language]) {
			throw new ExecutionError(
				"**This language is not installed.**\nThe bot requires the [Language Pack addon](https://builtbybit.com/resources/light-bot-tickets-paypal-crypto.22995/) for language support.\n\n-# Please notify your server admin to purchase & install this addon. If you're a server admin & own the language pack, follow instructions to install.",
			);
		}

		await UserPreferences.setForcedLanguage(interaction.user.id, language);

		interaction.reply({
			embeds: [successEmbed(`Language set to \`${language}\`.`)],
			ephemeral: true,
		});
	}
}
