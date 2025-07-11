import { ChatInputCommandInteraction, GuildMember } from "discord.js";

import { archiveButton } from "@util/components/buttons";
import { errorEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runDeny(interaction: ChatInputCommandInteraction, member: GuildMember): Promise<void> {
	const reason = interaction.options.getString("reason", true);

	interaction.editReply({
		embeds: [
			errorEmbed(
				__("commands.application.denied", {
					_locale: interaction.locale,
					username: member.user.username,
					reason: reason,
				}),
			).setAuthor({ name: __("commands.application.denied_short", { _locale: interaction.locale }) }),
		],

		components: [archiveButton()],
	});
}
