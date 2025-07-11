import { ApplicationCommandOptionType, ChatInputCommandInteraction, PermissionsBitField } from "discord.js";
import { Op } from "sequelize";

import Bank from "@classes/Bank";
import Transaction from "@classes/Transaction";
import Withdrawal, { WithdrawalStatus } from "@classes/Withdrawal";

import { BaseCommand } from "@util/baseInterfaces";
import { infoEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class ManageBanksCommand extends BaseCommand {
	name = "managebanks";
	description = "Manage other's banks.";
	metadata = {
		category: "Banking",
	};
	options = [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "add",
			description: "Add balance to someone.",
			options: [
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					description: "The user to add balance to.",
					required: true,
				},
				{
					type: ApplicationCommandOptionType.Number,
					name: "amount",
					description: "The amount to add.",
					required: true,
				},
				{
					type: ApplicationCommandOptionType.String,
					name: "note",
					description: "Optional note to attach to this transaction.",
					required: false,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "subtract",
			description: "Subtract balance from someone.",
			options: [
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					description: "The user to subtract balance from.",
					required: true,
				},
				{
					type: ApplicationCommandOptionType.Number,
					name: "amount",
					description: "The amount to subtract.",
					required: true,
				},
				{
					type: ApplicationCommandOptionType.String,
					name: "note",
					description: "Optional note to attach to this transaction.",
					required: false,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "view",
			description: "View someone's balance.",
			options: [
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					description: "The user to look up.",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "withdrawals",
			description: "Display (pending or all) withdrawal requests.",
			options: [
				{
					type: ApplicationCommandOptionType.Boolean,
					name: "show_complete",
					description:
						"Whether or not to also show completed withdrawal requests. If not, pending only will be shown.",
					required: false,
				},
			],
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const subcommand = interaction.options.getSubcommand();
		if (subcommand === "add") await this.runAdd(interaction);
		else if (subcommand === "subtract") await this.runSubtract(interaction);
		else if (subcommand === "view") await this.runView(interaction);
		else if (subcommand === "withdrawals") await this.runDisplayWithdrawals(interaction);
	}

	async runAdd(interaction: ChatInputCommandInteraction): Promise<void> {
		const user = interaction.options.getUser("user", true);
		const amount = interaction.options.getNumber("amount", true);
		const note =
			interaction.options.getString("note") ||
			__("commands.managebanks.add.default_note", { _locale: interaction.locale });
		const bank = await Bank.getOrCreate(user.id);
		bank.balance += amount;
		await bank.save();
		await Transaction.create({
			type: "ADD_ADMIN",
			userId: user.id,
			amount: amount,
			note,
		});
		interaction.reply({
			embeds: [
				successEmbed(
					__("commands.managebanks.add.successful", {
						amount: amount.toFixed(2),
						mention: user.toString(),
						username: user.username,
						_locale: interaction.locale,
					}),
				),
			],

			ephemeral: true,
		});
	}

	async runSubtract(interaction: ChatInputCommandInteraction): Promise<void> {
		const user = interaction.options.getUser("user", true);
		const amount = interaction.options.getNumber("amount", true);
		const note =
			interaction.options.getString("note") ||
			__("commands.managebanks.subtract.default_note", { _locale: interaction.locale });
		const bank = await Bank.getOrCreate(user.id);
		bank.balance -= amount;
		await bank.save();
		await Transaction.create({
			type: "SUBTRACT_ADMIN",
			userId: user.id,
			amount: -amount,
			note,
		});
		interaction.reply({
			embeds: [
				successEmbed(
					__("commands.managebanks.subtract.successful", {
						amount: amount.toFixed(2),
						mention: user.toString(),
						username: user.username,
						_locale: interaction.locale,
					}),
				),
			],

			ephemeral: true,
		});
	}

	async runView(interaction: ChatInputCommandInteraction): Promise<void> {
		const user = interaction.options.getUser("user", true);
		const bank = await Bank.getOrCreate(user.id);

		const transactions = await Transaction.findAll({
			where: { userId: user.id },
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

		interaction.reply({
			embeds: [
				infoEmbed(
					`${__("commands.managebanks.view.successful", {
						balance: bank.balance.toFixed(2),
						mention: user.toString(),
						username: user.username,
						_locale: interaction.locale,
					})}\n\n${transactionsText}`,
				),
			],

			ephemeral: true,
		});
	}

	async runDisplayWithdrawals(interaction: ChatInputCommandInteraction): Promise<void> {
		const any = interaction.options.getBoolean("show_complete") ?? false;
		const withdrawals = await Withdrawal.findAll({
			where: {
				status: any ? {} : { [Op.eq]: WithdrawalStatus.Pending },
			},
			order: [["createdAt", "DESC"]],
			limit: 10,
			// Optionally add pagination
		});
		const embed = successEmbed().setAuthor({
			name: `${any ? __("commands.managebanks.withdrawals.title.all", { _locale: interaction.locale }) : __("commands.managebanks.withdrawals.title.pending", { _locale: interaction.locale })}:`,
		});
		for (const withdrawal of withdrawals) {
			const user = await this.client.users.fetch(withdrawal.userId);
			const amount = `$${withdrawal.amount.toFixed(2)}`;
			const status = withdrawal.status.charAt(0) + withdrawal.status.toLowerCase().slice(1);
			const createdAt = `<t:${Math.floor(withdrawal.createdAt / 1000)}:D>`;
			embed.addFields([
				{
					name: __("commands.managebanks.withdrawals.field_name", {
						username: user.username,
						mention: user.toString(),
						amount: amount,
						_locale: interaction.locale,
					}),
					value: __("commands.managebanks.withdrawals.field_value", {
						status: status,
						created_at: createdAt,
						_locale: interaction.locale,
					}),
					inline: true,
				},
			]);
		}
		interaction.reply({ embeds: [embed] });
	}
}
