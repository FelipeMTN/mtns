import { ApplicationCommandOptionType, ChatInputCommandInteraction, PermissionsBitField } from "discord.js";

import Profile from "@classes/Profile";

import { BaseCommand } from "@util/baseInterfaces";
import { errorEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class CreateProfileCommand extends BaseCommand {
	name = "createprofile";
	description = "Create a profile for a user.";
	metadata = {
		category: "Profiles",
	};
	options = [
		{
			type: ApplicationCommandOptionType.User,
			name: "user",
			description: "The user to create profile for.",
			required: true,
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const user = interaction.options.getUser("user", true);
		const profile = await Profile.findOne({ where: { userId: user.id } });
		if (profile) {
			interaction.reply({
				embeds: [
					errorEmbed(
						__("commands.createprofile.errors.profile_already_exists", {
							mention: user.toString(),
							username: user.username,
							_locale: interaction.locale,
						}),
					),
				],

				ephemeral: true,
			});
			return;
		}
		await Profile.create({
			userId: user.id,
		});
		interaction.reply({
			embeds: [successEmbed(__("commands.createprofile.successful", { _locale: interaction.locale }))],
			ephemeral: true,
		});
	}
}
