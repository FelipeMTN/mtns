import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import ServiceCut from "@classes/ServiceCut";

import { successEmbed } from "@util/embeds";

export async function runIncrease(interaction: ChatInputCommandInteraction): Promise<void> {
	const user = interaction.options.getUser("user", true);
	const serviceCut = await ServiceCut.findOne({ where: { guildId: interaction.guild!.id, userId: user.id } });
	if (!serviceCut) {
		throw new ExecutionError(
			`${user} is not included in the service cut split. Use \`/servicecutsplit add\` to add them.`,
		);
	}

	const by = interaction.options.getNumber("by", true);
	if (by < 1 || by > 100) {
		throw new ExecutionError('The "by" parameter must be within 1 - 100.');
	}

	const serviceCuts = await ServiceCut.findAll({ where: { guildId: interaction.guild!.id } });
	const totalAllocated = serviceCuts.reduce((acc, cur) => acc + cur.percentage, 0);

	if (totalAllocated + by > 100) {
		throw new ExecutionError(
			`The total allocated percentage cannot be greater than 100. You can at max increase this user's percentage by **${
				100 - totalAllocated
			}%**. Decrease percentages or remove others first.`,
		);
	}

	serviceCut.percentage += by;
	await serviceCut.save();

	interaction.reply({
		embeds: [
			successEmbed(
				`${user}'s percentage has increased by ${by}% to a new total of **${serviceCut.percentage}%**.`,
			),
		],

		ephemeral: true,
	});
}
