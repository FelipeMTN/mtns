import {
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	EmbedBuilder,
	PermissionsBitField,
} from "discord.js";
import { ExecutionError } from "nhandler";

import { BaseCommand } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class EmbedCommand extends BaseCommand {
	name = "embed";
	description = "Create an embed.";
	metadata = {
		category: "Utility",
	};
	options = [
		{
			type: ApplicationCommandOptionType.String,
			name: "title",
			description: "Embed title.",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "description",
			description: "Embed description.",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "color",
			description: "Embed color.",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "author_name",
			description: "Embed author tag.",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "author_image_url",
			description: "Embed author image url.",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "footer_text",
			description: "Embed footer text.",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "footer_image_url",
			description: "Embed footer image url.",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "image_url",
			description: "Embed main image url.",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "thumbnail_url",
			description: "Embed thumbnail url.",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "title_url",
			description: "Embed title url.",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.Boolean,
			name: "timestamp",
			description: "Whether or not to add a timestamp.",
			required: false,
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageMessages;

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const embed = new EmbedBuilder();
		const title = interaction.options.getString("title");
		const description = interaction.options.getString("description");
		const color = interaction.options.getString("color");
		const authorName = interaction.options.getString("author_name");
		const authorImageUrl = interaction.options.getString("author_image_url");
		const footerText = interaction.options.getString("footer_text");
		const footerImageUrl = interaction.options.getString("footer_image_url");
		const imageUrl = interaction.options.getString("image_url");
		const thumbnailUrl = interaction.options.getString("thumbnail_url");
		const titleUrl = interaction.options.getString("title_url");
		const timestamp = interaction.options.getBoolean("timestamp");
		if (!description && !title && !authorName) {
			throw new ExecutionError(__("commands.embed.errors.invalid_embed", { _locale: interaction.locale }));
		}
		try {
			if (title) embed.setTitle(title);
			if (description) embed.setDescription(description);
			if (color) {
				const colorHex = parseInt(color.replace(new RegExp("#", "g"), ""), 16);
				if (color) embed.setColor(colorHex);
			}
			if (authorName) embed.setAuthor({ name: authorName, iconURL: authorImageUrl ?? undefined });
			if (footerText) embed.setFooter({ text: footerText, iconURL: footerImageUrl ?? undefined });
			if (imageUrl) embed.setImage(imageUrl);
			if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
			if (titleUrl) embed.setURL(titleUrl);
			if (timestamp) embed.setTimestamp();
			await interaction.reply({
				embeds: [successEmbed(__("commands.embed.successful", { _locale: interaction.locale }))],
				ephemeral: true,
			});
			interaction.channel!.send({ embeds: [embed] });
		} catch (err: unknown) {
			if (!(err instanceof Error)) return;
			throw new ExecutionError(
				__("commands.embed.errors.generic", { message: err.message, _locale: interaction.locale }),
			);
		}
	}
}
