import { EmbedBuilder } from "discord.js";

import { CLIENT_INSTANCE } from "@classes/Client";

const baseEmbed = (content?: string) => {
	const client = CLIENT_INSTANCE!;
	let embed = new EmbedBuilder().setTimestamp();
	if (content) embed.setDescription(content).setColor(client.config.customization.embeds.colors.normal);
	if (client.config.customization.embeds.footer) embed.setFooter({ text: client.config.customization.embeds.footer });
	return embed;
};

export const infoEmbed = (content?: string) => {
	const client = CLIENT_INSTANCE!;
	return baseEmbed(content).setColor(client.config.customization.embeds.colors.normal);
};

export const errorEmbed = (content?: string) => {
	const client = CLIENT_INSTANCE!;
	return baseEmbed(content).setColor(client.config.customization.embeds.colors.error);
};

export const warnEmbed = (content?: string) => {
	return baseEmbed(content).setColor(0xbe7a22);
};

export const successEmbed = (content?: string) => {
	const client = CLIENT_INSTANCE!;
	return baseEmbed(content).setColor(client.config.customization.embeds.colors.success);
};
