import { ChatInputCommandInteraction, User } from "discord.js";

import Blacklist from "@classes/Blacklist";

import { infoEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runBlacklistStatus(interaction: ChatInputCommandInteraction, user: User): Promise<void> {
	const blacklist = await Blacklist.findOne({ where: { userId: user.id } });

	interaction.reply({
		embeds: [
			infoEmbed(
				__("commands.blacklist.status.successful", {
					username: user.username,
					mention: user.toString(),
					status: blacklist
						? __("commands.blacklist.status.status_is_blacklisted", { _locale: interaction.locale })
						: __("commands.blacklist.status.status_is_allowed", { _locale: interaction.locale }),
					_locale: interaction.locale,
				}),
			),
		],

		ephemeral: true,
	});
}
