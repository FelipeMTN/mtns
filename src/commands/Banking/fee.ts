import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";

import { BaseCommand } from "@util/baseInterfaces";
import { infoEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class FeeCommand extends BaseCommand {
	name = "fee";
	description = "Calculate the service cut for a given price.";
	metadata = {
		category: "Banking",
	};
	options = [
		{
			type: ApplicationCommandOptionType.Integer,
			name: "price",
			description: "The amount.",
			required: true,
		},
	];

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const price = interaction.options.getInteger("price", true);
		const serviceCut = this.client.config.tickets.serviceCut / 100;
		const freelancerCut = 1 - serviceCut;
		const amtToQuote = (price / freelancerCut).toFixed(2);

		await interaction.reply({
			embeds: [
				infoEmbed(
					__("commands.fee", {
						original_amount: price.toFixed(2),
						will_be_paid: (price * freelancerCut).toFixed(2),
						freelancer_cut_percentage: (freelancerCut * 100).toString(),
						amount_to_quote: amtToQuote,
						_locale: interaction.locale,
					}),
				),
			],

			ephemeral: true,
		});
	}
}
