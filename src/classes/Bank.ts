import { User } from "discord.js";
import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import { CLIENT_INSTANCE } from "@classes/Client";
import ServiceCut from "@classes/ServiceCut";
import Transaction from "@classes/Transaction";
import UserPreferences from "@classes/UserPreferences";

import { successEmbed } from "@util/embeds";
import { genId } from "@util/genId";
import { __ } from "@util/translate";

@Table({ tableName: "banks", freezeTableName: true })
export default class Bank extends Model {
	client = CLIENT_INSTANCE!;

	@PrimaryKey
	@AllowNull(false)
	@Default(() => genId())
	@Column(DataType.STRING(10))
	id!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	userId!: string;
	user: User | null = null;

	@AllowNull(false)
	@Default(0)
	@Column(DataType.FLOAT)
	balance!: number;

	locale: string = "en-US";

	constructor(...args: any[]) {
		super(...args);
		this.assignProperties();
	}

	async assignProperties() {
		this.user = await this.client.users.fetch(this.userId).catch(() => null);
		this.locale = await UserPreferences.getLanguage(this.userId);
	}

	static async getOrCreate(userId: string) {
		let bank = await Bank.findOne({ where: { userId } });
		if (!bank) bank = await Bank.create({ userId });
		return bank;
	}

	static async creditService({
		amount,
		guildId,
		note,
		noteHtml,
	}: {
		amount: number;
		guildId: string;
		note: string;
		noteHtml: string;
	}) {
		const serviceCuts = await ServiceCut.findAll({ where: { guildId } });
		for (let cut of serviceCuts) {
			const bank = await Bank.getOrCreate(cut.userId);
			bank.balance += amount * (cut.percentage / 100);
			await bank.save();
			await Transaction.create({
				type: "SERVICE_CUT_REVENUE",
				userId: cut.userId,
				amount: amount * (cut.percentage / 100),
				note: note,
				noteHtml: noteHtml,
			});
		}
	}

	async creditRevenue({ amount, note, noteHtml }: { amount: number; note: string; noteHtml: string }) {
		this.balance += amount;
		await this.save();
		await Transaction.create({
			type: "COMMISSION_REVENUE",
			userId: this.userId,
			amount: amount,
			note: note,
			noteHtml: noteHtml,
		});

		await this.dmUserAboutRevenue(amount);
	}

	private async dmUserAboutRevenue(amount: number) {
		if (!this.user) return;
		const dmChannel = await this.user.createDM().catch(() => null);
		if (dmChannel) {
			const embed = successEmbed(
				__("completion.bank.dm_notification", { _locale: this.locale, amount: amount.toString() }),
			);
			embed.setTitle(__("completion.bank.dm_notification.title", { _locale: this.locale }));
			embed.addFields({
				name: __("completion.bank.label_new_balance", { _locale: this.locale }),
				value: `$${this.balance.toFixed(2)}`,
			});
			await dmChannel.send({ embeds: [embed] });
		}
	}
}
