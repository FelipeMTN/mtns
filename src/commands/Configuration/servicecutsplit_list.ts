import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import { CLIENT_INSTANCE } from "@classes/Client";
import ServiceCut from "@classes/ServiceCut";

import { infoEmbed } from "@util/embeds";

export async function runList(interaction: ChatInputCommandInteraction): Promise<void> {
	const client = CLIENT_INSTANCE!;

	const serviceCuts = await ServiceCut.findAll({ where: { guildId: interaction.guild!.id } });

	if (!serviceCuts.length) {
		throw new ExecutionError(`Service cuts are not set up. Add a person with \`/servicecutsplit add\`.`);
	}

	const totalAllocated = serviceCuts.reduce((acc, cur) => acc + cur.percentage, 0);

	const title = `**${totalAllocated}%** is allocated. You can allocate ${100 - totalAllocated}%.`;
	const cutsText = serviceCuts
		.map((cut) => {
			const user = client.users.cache.get(cut.userId) || { tag: cut.userId };
			return `${user} receives **${cut.percentage}%**`;
		})
		.join("\n");

	const embed = infoEmbed()
		.setAuthor({ name: "Service Cut Split Configuration:" })
		.setDescription(`${title}\n\n${cutsText}`);

	interaction.reply({ embeds: [embed] });
}
