import { ApplicationCommandOptionType, ChatInputCommandInteraction, User } from "discord.js";
import { ExecutionError } from "nhandler";

import Profile from "@classes/Profile";
import Settings from "@classes/Settings";

import { BaseCommand } from "@util/baseInterfaces";
import { __ } from "@util/translate";

export default class ProfileCommand extends BaseCommand {
	name = "profile";
	description = "View your profile of a freelancer.";
	metadata = {
		category: "Profiles",
	};
	options = [
		{
			type: ApplicationCommandOptionType.User,
			name: "freelancer",
			description: "The user to show the profile of.",
			required: true,
		},
	];

	async run(
		interaction: ChatInputCommandInteraction,
		{ settings, lookupUser }: { settings: Settings; lookupUser: User },
	): Promise<void> {
		const user = lookupUser || interaction.options.getUser("freelancer", true);
		const member = interaction.guild!.members.cache.get(user.id);
		if (!member) {
			throw new ExecutionError(__("generic.errors.member_undefined", { _locale: interaction.locale }));
		}
		if (!member.roles.cache.some((r) => r.id === settings.freelancerRole)) {
			throw new ExecutionError(
				__("commands.profile.errors.not_freelancer", {
					mention: member.user.toString(),
					username: member.user.username,
					_locale: interaction.locale,
				}),
			);
		}
		const profile = await Profile.getOrCreate(user.id);
		const embed = await profile.createEmbed(member.user, interaction.locale);
		interaction.reply({ embeds: [embed], ephemeral: true });
	}
}
