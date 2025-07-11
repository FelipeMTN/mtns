import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	TextChannel,
} from "discord.js";
import { ExecutionError } from "nhandler";

import Bank from "@classes/Bank";
import Settings from "@classes/Settings";
import Transaction from "@classes/Transaction";
import Withdrawal from "@classes/Withdrawal";

import { BaseCommand } from "@util/baseInterfaces";
import { disableButtons } from "@util/components/disableButtons";
import { infoEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class BankCommand extends BaseCommand {
	name = "bank";
	category = "Banking";
	description = "Manage your bank.";
	metadata = {
		category: "Banking",
	};
	options = [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "balance",
			description: "View your balance and transaction history.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "withdraw",
			description: "Initialise a withdrawal request. This will not subtract your funds yet.",
			options: [
				{
					type: ApplicationCommandOptionType.Number,
					name: "amount",
					description: "The amount to withdraw. If not specified, will default to available balance.",
					required: false,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "transactions",
			description: "View a full list of transactions.",
		},
	];

	async run(interaction: ChatInputCommandInteraction, { settings }: { settings: Settings }): Promise<void> {
		const sub = interaction.options.getSubcommand();
		if (!interaction.guild) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}
		if (sub === "balance") await this.runBalance(interaction);
		else if (sub === "withdraw") await this.runWithdraw(interaction, { settings });
		else if (sub === "transactions") await this.runTransactions(interaction);
	}

	async runBalance(interaction: ChatInputCommandInteraction): Promise<void> {
		let bank = await Bank.getOrCreate(interaction.user.id);
		const transactions = await Transaction.findAll({
			where: { userId: interaction.user.id },
			order: [["createdAt", "DESC"]],
			limit: 3,
		});
		const transactionsText = transactions
			.map((transaction) => {
				const date = `<t:${Math.floor(transaction.createdAt / 1000)}:D>`;
				const amount =
					transaction.amount > 0
						? `**$${transaction.amount.toFixed(2)}**`
						: `**-$${(transaction.amount * -1).toFixed(2)}**`;
				const note =
					transaction.note || __("commands.bank.transactions.default_note", { _locale: interaction.locale });
				return `${date} | ${amount} | ${note}`;
			})
			.join("\n");
		if (bank.balance < 0) {
			// Negative balance
			const negativeBal = (bank.balance * -1).toFixed(2);
			interaction.reply({
				embeds: [
					successEmbed(
						[
							`${__("commands.bank.balance.balance_text", { _locale: interaction.locale })}: **-$${negativeBal}**`,
							`**${__("commands.bank.balance.last_transactions_text", { _locale: interaction.locale })}:**`,
							`${transactionsText || __("generic.none", { _locale: interaction.locale }).toLowerCase()}`,
						].join("\n"),
					),
				],

				ephemeral: true,
			});
		} else {
			// Zero or positive balance
			const positiveBal = bank.balance.toFixed(2);
			interaction.reply({
				embeds: [
					successEmbed(
						[
							`${__("commands.bank.balance.balance_text", { _locale: interaction.locale })}: **$${positiveBal}**`,
							`**${__("commands.bank.balance.last_transactions_text", { _locale: interaction.locale })}:**`,
							`${transactionsText || __("generic.none", { _locale: interaction.locale }).toLowerCase()}`,
						].join("\n"),
					),
				],

				ephemeral: true,
			});
		}
	}

	async runWithdraw(interaction: ChatInputCommandInteraction, { settings }: { settings: Settings }): Promise<void> {
		if (!interaction.guild) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}
		if (!settings.withdrawalsChannel) {
			throw new ExecutionError(
				__("commands.bank.withdraw.channel_not_configured", { _locale: interaction.locale }),
			);
		}
		const withdrawalChannel = interaction.guild!.channels.cache.get(settings.withdrawalsChannel);
		if (!withdrawalChannel || !(withdrawalChannel instanceof TextChannel)) {
			throw new ExecutionError(__("commands.bank.withdraw.channel_invalid", { _locale: interaction.locale }));
		}
		let bank = await Bank.getOrCreate(interaction.user.id);
		const amount = interaction.options.getNumber("amount") || bank.balance;

		if (amount < 1) {
			throw new ExecutionError(__("commands.bank.withdraw.below_1", { _locale: interaction.locale }));
		}

		if (bank.balance < amount) {
			throw new ExecutionError(
				__("commands.bank.withdraw.not_enough_funds", {
					current_balance: bank.balance.toFixed(2),
					requested_amount: amount.toFixed(2),
					_locale: interaction.locale,
				}),
			);
		}

		const request = await Withdrawal.create({
			guildId: interaction.guild.id,
			userId: interaction.user.id,
			amount: amount,
		});

		await request.send(withdrawalChannel);

		interaction.reply({
			embeds: [successEmbed(__("commands.bank.withdraw.successful", { _locale: interaction.locale }))],
			ephemeral: true,
		});
	}

	async runTransactions(interaction: ChatInputCommandInteraction): Promise<void> {
		let page = 1;
		const perPage = 10;
		const collector = interaction.channel!.createMessageComponentCollector({
			filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith("transactioncommand"),
			time: 30000,
		});

		const transactions = await Transaction.findAll({
			where: { userId: interaction.user.id },
			order: [["createdAt", "DESC"]],
		});

		if (transactions.length === 0) {
			throw new ExecutionError(__("commands.bank.transactions.empty", { _locale: interaction.locale }));
		}

		const genButtons = (firstDisabled: boolean, secondDisabled: boolean): ActionRowBuilder<ButtonBuilder> => {
			return new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder({
					style: ButtonStyle.Secondary,
					customId: "transactioncommand-first",
					emoji: "⏪",
					disabled: firstDisabled,
				}),
				new ButtonBuilder({
					style: ButtonStyle.Secondary,
					customId: "transactioncommand-back",
					emoji: "◀️",
					disabled: firstDisabled,
				}),
				new ButtonBuilder({
					style: ButtonStyle.Secondary,
					customId: "transactioncommand-forward",
					emoji: "▶️",
					disabled: secondDisabled,
				}),
				new ButtonBuilder({
					style: ButtonStyle.Secondary,
					customId: "transactioncommand-last",
					emoji: "⏩",
					disabled: secondDisabled,
				}),
			);
		};

		const displayPage = async (initial = false) => {
			const transactionsOnPage = transactions.slice((page - 1) * perPage, page * perPage);

			const footer = __("generic.pagination", {
				page: page.toString(),
				total_count: Math.ceil(transactions.length / perPage).toString(),
				amount_per_page: perPage.toString(),
				_locale: interaction.locale,
			});

			const transactionsText = transactionsOnPage
				.map((transaction) => {
					const date = `<t:${Math.floor(transaction.createdAt / 1000)}:D>`;
					const amount =
						transaction.amount >= 0
							? `**$${transaction.amount.toFixed(2)}**`
							: `**-$${(transaction.amount * -1).toFixed(2)}**`;
					const note =
						transaction.note ||
						__("commands.bank.transactions.default_note", { _locale: interaction.locale });
					return `${date} | ${amount} | ${note}`;
				})
				.join("\n");

			const data = {
				embeds: [
					infoEmbed(
						`**${__("commands.bank.transactions.title", { _locale: interaction.locale })}**:\n${transactionsText}`,
					).setFooter({
						text: footer,
					}),
				],

				components: [genButtons(page === 1, page === Math.ceil(transactions.length / perPage))],
				ephemeral: true,
			};

			if (initial) interaction.reply(data);
			else interaction.editReply(data);
		};
		displayPage(true);
		collector.on("collect", (int) => {
			int.deferUpdate();
			if (int.customId === "transactioncommand-back") {
				page -= 1;
			} else if (int.customId === "transactioncommand-forward") {
				page += 1;
			} else if (int.customId === "transactioncommand-first") {
				page = 1;
			} else if (int.customId === "transactioncommand-last") {
				page = Math.ceil(transactions.length / perPage);
			}
			displayPage();
		});
		collector.on("end", async () => {
			const original = await interaction.fetchReply();
			interaction.editReply({ components: disableButtons(original.components) });
		});
	}
}
