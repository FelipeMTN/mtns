import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import ServiceCut from "@classes/ServiceCut";

import { successEmbed } from "@util/embeds";

export async function runRemove(interaction: ChatInputCommandInteraction): Promise<void> {
	const user = interaction.options.getUser("user", true);
	const serviceCut = await ServiceCut.findOne({ where: { guildId: interaction.guild!.id, userId: user.id } });
	if (!serviceCut) {
		throw new ExecutionError(
			`${user} is not included in the service cut split. Use \`/servicecutsplit add\` to add them.`,
		);
	}

	serviceCut.destroy();

	interaction.reply({
		embeds: [successEmbed(`${user} has been removed from the service cut split.`)],
		ephemeral: true,
	});
}
