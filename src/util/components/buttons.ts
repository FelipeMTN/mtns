import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

import { CLIENT_INSTANCE } from "@classes/Client";

import { __ } from "@util/translate";

export const archiveButton = () => {
	const client = CLIENT_INSTANCE!;
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setEmoji(client.config.customization.buttons.emojis.archive)
			.setLabel(__("tickets.archive.button_label"))
			.setCustomId("archive")
			.setStyle(ButtonStyle.Secondary),
	);
};

export const unarchiveButton = () => {
	const client = CLIENT_INSTANCE!;
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setEmoji(client.config.customization.buttons.emojis.unarchive)
			.setLabel(__("tickets.unarchive.button_label"))
			.setCustomId("unarchive")
			.setStyle(ButtonStyle.Secondary),
	);
};

export const cancelButton = () => {
	const client = CLIENT_INSTANCE!;
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setEmoji(client.config.customization.buttons.emojis.cancel)
			.setLabel(__("tickets.cancel.button_label"))
			.setCustomId("cancel")
			.setStyle(ButtonStyle.Secondary),
	);
};
