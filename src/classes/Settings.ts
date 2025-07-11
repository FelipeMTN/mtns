import { MessageCreateOptions, TextChannel } from "discord.js";
import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import { CLIENT_INSTANCE } from "@classes/Client";

import { genId } from "@util/genId";

@Table({
	tableName: "guilds",
	freezeTableName: true,
})
export default class Settings extends Model {
	@PrimaryKey
	@AllowNull(false)
	@Default(() => genId())
	@Column(DataType.STRING(10))
	id!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	guildId!: string;

	@Column(DataType.TEXT)
	commissionLog?: string;

	@Column(DataType.TEXT)
	adminLog?: string;

	@Column(DataType.TEXT)
	reviewChannel?: string;

	@Column(DataType.TEXT)
	withdrawalsChannel?: string;

	@Column(DataType.TEXT)
	clientRole?: string;

	@Column(DataType.TEXT)
	freelancerRole?: string;

	@Column(DataType.TEXT)
	managerRole?: string;

	@Column(DataType.TEXT)
	commissionCategory?: string;

	@Column(DataType.TEXT)
	applicationCategory?: string;

	@Column(DataType.TEXT)
	supportCategory?: string;

	@Column(DataType.TEXT)
	closedCategory?: string;

	@Column(DataType.TEXT)
	quotesCategory?: string;

	static async getOrCreate(guildId: string) {
		let settings = await Settings.findOne({ where: { guildId } });
		if (!settings) settings = await Settings.create({ guildId });
		return settings;
	}

	static async sendAdminLog(guildId: string, opts: MessageCreateOptions) {
		const settings = await Settings.getOrCreate(guildId);
		if (!settings.adminLog) return;
		const channel = await CLIENT_INSTANCE!.channels.fetch(settings.adminLog).catch(() => null);
		if (!channel || !(channel instanceof TextChannel)) return;
		await channel.send(opts);
	}
}
