import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import ServiceCut from "@classes/ServiceCut";

import { successEmbed } from "@util/embeds";

export async function runSet(interaction: ChatInputCommandInteraction): Promise<void> {
	const user = interaction.options.getUser("user", true);
	const serviceCut = await ServiceCut.findOne({ where: { guildId: interaction.guild!.id, userId: user.id } });
	if (!serviceCut) {
		throw new ExecutionError(
			`${user} is not included in the service cut split. Use \`/servicecutsplit add\` to add them.`,
		);
	}

	const percentage = interaction.options.getNumber("percentage", true);
	if (percentage < 1 || percentage > 100) {
		throw new ExecutionError(`The percentage must be within 1 - 100.`);
	}

	const serviceCuts = await ServiceCut.findAll({ where: { guildId: interaction.guild!.id } });
	const totalAllocated = serviceCuts.reduce((acc, cur) => acc + cur.percentage, 0);

	if (totalAllocated + percentage > 100) {
		throw new ExecutionError(
			`The total allocated percentage cannot be greater than 100. You can at max set this user to receive **${
				100 - totalAllocated + serviceCut.percentage
			}%**. Decrease percentages or remove others first.`,
		);
	}

	serviceCut.percentage = percentage;
	await serviceCut.save();

	interaction.reply({
		embeds: [successEmbed(`${user}'s percentage has been set to ${percentage}%.`)],
		ephemeral: true,
	});
}
