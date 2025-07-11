import { ChatInputCommandInteraction, User } from "discord.js";
import { ExecutionError } from "nhandler";

import Blacklist from "@classes/Blacklist";

import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runBlacklistRemove(interaction: ChatInputCommandInteraction, user: User): Promise<void> {
	const blacklist = await Blacklist.findOne({ where: { userId: user.id } });

	if (!blacklist) {
		throw new ExecutionError(
			__("commands.blacklist.remove.errors.person_not_blacklisted", {
				username: user.username,
				mention: user.toString(),
				_locale: interaction.locale,
			}),
		);
	}
	await blacklist.destroy();
	interaction.reply({
		embeds: [
			successEmbed(
				__("commands.blacklist.remove.successful", {
					username: user.username,
					mention: user.toString(),
					_locale: interaction.locale,
				}),
			),
		],

		ephemeral: true,
	});
}
