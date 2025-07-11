import axios from "axios";
import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import { BaseCommand } from "@util/baseInterfaces";
import { getCurrencySymbol } from "@util/currencies";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class CurrencyCommand extends BaseCommand {
	name = "currency";
	description = "Convert currency units.";
	metadata = {
		category: "Utility",
	};
	options = [
		{
			type: ApplicationCommandOptionType.Number,
			name: "amount",
			description: "The amount of currency to convert.",
			required: true,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "from_currency",
			description: "The currency to convert from.",
			required: true,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "to_currency",
			description: "The currency to convert to.",
			required: true,
		},
	];

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const amount = interaction.options.getNumber("amount", true);
		const fromCurrency = interaction.options.getString("from_currency", true);
		const toCurrency = interaction.options.getString("to_currency", true);
		try {
			axios
				.get(
					`https://api.freecurrencyapi.com/v1/latest?apikey=sgiPfh4j3aXFR3l2CnjWqdKQzxpqGn9pX5b3CUsz&base_currency=${fromCurrency.toUpperCase()}&currencies=${toCurrency.toUpperCase()}`,
				)
				.then((r) => {
					const rate = r.data.data[toCurrency.toUpperCase()];
					if (!rate) {
						throw new ExecutionError(
							__("commands.currency.errors.invalid_currency", { _locale: interaction.locale }),
						);
					}
					const fromCurrencySymbol = getCurrencySymbol(fromCurrency.toUpperCase());
					const toCurrencySymbol = getCurrencySymbol(toCurrency.toUpperCase());
					const fields = [
						`**${amount.toFixed(2)} ${fromCurrencySymbol}** = **${(amount * rate).toFixed(2)} ${toCurrencySymbol}**`,
						`1 ${fromCurrencySymbol} = ${rate.toFixed(2)} ${toCurrencySymbol}`,
					];

					interaction.reply({ embeds: [successEmbed(fields.join("\n"))], ephemeral: true });
				})
				.catch((err) => {
					throw new ExecutionError(
						__("commands.currency.errors.generic", { message: err.message, _locale: interaction.locale }),
					);
				});
		} catch (err) {
			throw new ExecutionError(
				__("commands.currency.errors.generic", {
					message: (err as Error).message,
					_locale: interaction.locale,
				}),
			);
		}
	}
}
