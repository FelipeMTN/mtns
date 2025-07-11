import {
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	GuildMemberRoleManager,
	PermissionsBitField,
} from "discord.js";
import { ExecutionError } from "nhandler";

import Profile from "@classes/Profile";
import Settings from "@classes/Settings";

import { BaseCommand } from "@util/baseInterfaces";
import { errorEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class ViewPayPalCommand extends BaseCommand {
	name = "viewpaypal";
	description = "View PayPal email address of a user.";
	metadata = {
		category: "Profiles",
	};
	options = [
		{
			type: ApplicationCommandOptionType.User,
			name: "user",
			description: "The user to view the PayPal email of.",
			required: true,
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async run(interaction: ChatInputCommandInteraction, { settings }: { settings: Settings }): Promise<void> {
		if (!interaction.member || !interaction.guild) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}
		if (
			settings.managerRole &&
			!(interaction.member.roles as GuildMemberRoleManager).cache.has(settings.managerRole)
		) {
			throw new ExecutionError(__("generic.errors.must_be_manager", { _locale: interaction.locale }));
		}
		const user = interaction.options.getUser("user", true);
		const profile = await Profile.findOne({ where: { userId: user.id } });
		if (!profile) {
			interaction.reply({
				embeds: [
					errorEmbed(
						__("commands.viewpaypal.errors.profile_not_created", {
							username: user.username,
							mention: user.toString(),
							_locale: interaction.locale,
						}),
					),
				],

				ephemeral: true,
			});
			return;
		}
		if (!profile.paypalEmail) {
			interaction.reply({
				embeds: [
					errorEmbed(
						__("commands.viewpaypal.errors.paypal_not_set", {
							username: user.username,
							mention: user.toString(),
							_locale: interaction.locale,
						}),
					),
				],
			});
			return;
		}
		interaction.reply({
			embeds: [
				successEmbed(
					__("commands.viewpaypal.successful", {
						username: user.username,
						mention: user.toString(),
						paypal_email: profile.paypalEmail,
						_locale: interaction.locale,
					}),
				),
			],
		});
	}
}
