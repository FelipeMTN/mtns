import { ApplicationCommandOptionType, ChatInputCommandInteraction, GuildMemberRoleManager } from "discord.js";
import { ExecutionError } from "nhandler";

import Profile from "@classes/Profile";
import Settings from "@classes/Settings";

import { BaseCommand } from "@util/baseInterfaces";
import { __ } from "@util/translate";

import { runBio } from "./set_bio";
import { runPayPalEmail } from "./set_paypalEmail";
import { runPortfolio } from "./set_portfolio";
import { runTechstack } from "./set_techstack";
import { runTimezone } from "./set_timezone";

export default class SetCommand extends BaseCommand {
	name = "set";
	description = "Update your profile.";
	metadata = {
		category: "Profiles",
	};
	options = [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "portfolio",
			description: `Update the portfolio link.`,
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "link",
					description: "The new portfolio link.",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "bio",
			description: "Update your bio.",
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "content",
					description: "The new bio.",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "timezone",
			description: "Update your timezone.",
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "timezone",
					description: "The new timezone.",
					required: true,
					choices: [
						{ name: "GMT -11:00", value: "-11:00" },
						{ name: "GMT -10:00", value: "-10:00" },
						{ name: "GMT -09:00", value: "-09:00" },
						{ name: "GMT -08:00", value: "-08:00" },
						{ name: "GMT -07:00", value: "-07:00" },
						{ name: "GMT -06:00", value: "-06:00" },
						{ name: "GMT -05:00", value: "-05:00" },
						{ name: "GMT -04:00", value: "-04:00" },
						{ name: "GMT -03:30", value: "-03:30" },
						{ name: "GMT -03:00", value: "-03:00" },
						{ name: "GMT -02:00", value: "-02:00" },
						{ name: "GMT -01:00", value: "-01:00" },
						{ name: "GMT 00:00", value: "00:00" },
						{ name: "GMT +01:00", value: "+01:00" },
						{ name: "GMT +02:00", value: "+02:00" },
						{ name: "GMT +03:00", value: "+03:00" },
						{ name: "GMT +03:30", value: "+03:30" },
						{ name: "GMT +04:00", value: "+04:00" },
						{ name: "GMT +04:30", value: "+04:30" },
						{ name: "GMT +05:00", value: "+05:00" },
						{ name: "GMT +06:00", value: "+06:00" },
						{ name: "GMT +07:00", value: "+07:00" },
						{ name: "GMT +08:00", value: "+08:00" },
						{ name: "GMT +09:00", value: "+09:00" },
						{ name: "GMT +10:00", value: "+10:00" },
					],
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "techstack",
			description: `Set your tech stack (for example the programming language, database etc.).`,
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "stack",
					description: "The programming language you use, databases or similiar...",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "paypal",
			description: `Set your PayPal email to accept withdrawals.`,
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "email",
					description: "The email to set. This is not shown anywhere except managers.",
					required: true,
				},
			],
		},
	];

	async run(interaction: ChatInputCommandInteraction, { settings }: { settings: Settings }): Promise<void> {
		if (!interaction.member) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}
		if (
			settings.freelancerRole &&
			!(interaction.member.roles as GuildMemberRoleManager).cache.has(settings.freelancerRole)
		) {
			throw new ExecutionError(__("generic.errors.must_be_freelancer", { _locale: interaction.locale }));
		}
		const sub = interaction.options.getSubcommand();
		const profile = await Profile.getOrCreate(interaction.user.id);
		if (sub === "portfolio") await runPortfolio(interaction, profile);
		else if (sub === "bio") await runBio(interaction, profile);
		else if (sub === "timezone") await runTimezone(interaction, profile);
		else if (sub === "techstack") await runTechstack(interaction, profile);
		else if (sub === "paypal") await runPayPalEmail(interaction, profile);
	}
}
