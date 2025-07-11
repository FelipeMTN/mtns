import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import ServiceCut from "@classes/ServiceCut";

import { successEmbed } from "@util/embeds";

export async function runAdd(interaction: ChatInputCommandInteraction): Promise<void> {
	const user = interaction.options.getUser("user", true);
	const serviceCut = await ServiceCut.findOne({ where: { guildId: interaction.guild!.id, userId: user.id } });
	if (serviceCut) {
		throw new ExecutionError(
			`${user} already has a service cut split. Use \`/servicecutsplit set | increase | decrease\` to change their percentage.`,
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
			`The total allocated percentage cannot be greater than 100. You can only allocate **${100 - totalAllocated}%**.`,
		);
	}

	await ServiceCut.create({
		guildId: interaction.guild!.id,
		userId: user.id,
		percentage: percentage,
	});

	interaction.reply({
		embeds: [successEmbed(`${user} has been added to the service cut split with a percentage of ${percentage}%.`)],
		ephemeral: true,
	});
}
