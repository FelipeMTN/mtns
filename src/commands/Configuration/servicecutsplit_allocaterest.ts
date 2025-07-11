import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import ServiceCut from "@classes/ServiceCut";

import { successEmbed } from "@util/embeds";

export async function runAllocateRest(interaction: ChatInputCommandInteraction): Promise<void> {
	const user = interaction.options.getUser("user", true);
	const serviceCut = await ServiceCut.findOne({ where: { guildId: interaction.guild!.id, userId: user.id } });
	if (!serviceCut) {
		throw new ExecutionError(
			`${user} is not included in the service cut split. Use \`/servicecutsplit add\` to add them.`,
		);
	}

	const serviceCuts = await ServiceCut.findAll({ where: { guildId: interaction.guild!.id } });
	const totalAllocated = serviceCuts.reduce((acc, cur) => acc + cur.percentage, 0);

	serviceCut.percentage = 100 - totalAllocated + serviceCut.percentage;
	await serviceCut.save();

	interaction.reply({
		embeds: [
			successEmbed(
				`${user}'s percentage has been allocated to available percentages to a new total of **${serviceCut.percentage}%**.`,
			),
		],

		ephemeral: true,
	});
}
