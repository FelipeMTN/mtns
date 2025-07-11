import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import ServiceCut from "@classes/ServiceCut";

import { successEmbed } from "@util/embeds";

export async function runDecrease(interaction: ChatInputCommandInteraction): Promise<void> {
	const user = interaction.options.getUser("user", true);
	const serviceCut = await ServiceCut.findOne({ where: { guildId: interaction.guild!.id, userId: user.id } });
	if (!serviceCut) {
		throw new ExecutionError(
			`${user} is not included in the service cut split. Use \`/servicecutsplit add\` to add them.`,
		);
	}

	const by = interaction.options.getNumber("by", true);
	if (by < 1 || by > 100) {
		throw new ExecutionError(`The "by" parameter must be within 1 - 100.`);
	}

	serviceCut.percentage -= by;
	await serviceCut.save();

	interaction.reply({
		embeds: [
			successEmbed(
				`${user}'s percentage has decreased by ${by}% to a new total of **${serviceCut.percentage}%**.`,
			),
		],

		ephemeral: true,
	});
}
