import { ChatInputCommandInteraction, User } from "discord.js";
import { ExecutionError } from "nhandler";

import Blacklist from "@classes/Blacklist";

import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runBlacklistAdd(interaction: ChatInputCommandInteraction, user: User): Promise<void> {
	const blacklist = await Blacklist.findOne({ where: { userId: user.id } });

	if (user.id === interaction.user.id) {
		throw new ExecutionError(__("commands.blacklist.add.errors.self_blacklist", { _locale: interaction.locale }));
	}
	if (blacklist) {
		throw new ExecutionError(
			__("commands.blacklist.add.errors.person_already_blacklisted", {
				username: user.username,
				mention: user.toString(),
				_locale: interaction.locale,
			}),
		);
	}
	await Blacklist.create({ userId: user.id });
	interaction.reply({
		embeds: [
			successEmbed(
				__("commands.blacklist.add.successful", {
					username: user.username,
					mention: user.toString(),
					_locale: interaction.locale,
				}),
			),
		],

		ephemeral: true,
	});
}
