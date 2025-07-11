import { Guild, TextChannel } from "discord.js";
import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import { CLIENT_INSTANCE } from "@classes/Client";

import { genId } from "@util/genId";

import Settings from "./Settings";

@Table({ tableName: "commissionlogchannels", freezeTableName: true })
export default class CommissionLogChannel extends Model {
	client = CLIENT_INSTANCE!;

	@PrimaryKey
	@AllowNull(false)
	@Default(() => genId())
	@Column(DataType.STRING(10))
	id!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	guildId!: string;
	guild: Guild | null = null;

	@AllowNull(false)
	@Column(DataType.TEXT)
	channelId!: string;
	channel: TextChannel | null = null;

	@AllowNull(false)
	@Column(DataType.TEXT)
	serviceId!: string;

	constructor(...args: any[]) {
		super(...args);
		this.assignProperties();
	}

	async assignProperties() {
		this.guild = await this.client.guilds.fetch(this.guildId).catch(() => null);
		if (!this.guild) return;

		this.channel = !this.channelId
			? null
			: await this.guild.channels
					.fetch(this.channelId)
					.then((c) => (c instanceof TextChannel ? c : null))
					.catch(() => null);
	}

	static async set(serviceId: string, channel: TextChannel) {
		const existing = await this.findOne({ where: { serviceId: serviceId } });
		if (existing) {
			await existing.update({ channelId: channel.id });
			return existing;
		}
		return await this.create({ serviceId: serviceId, channelId: channel.id, guildId: channel.guild.id });
	}

	static async get(serviceId: string, guildId: string): Promise<CommissionLogChannel | null> {
		return await this.findOne({ where: { serviceId: serviceId, guildId: guildId } });
	}

	static async getChannel(serviceId: string, guildId: string): Promise<TextChannel | null> {
		const existingExplicitelySetChannel = await this.findOne({ where: { serviceId: serviceId } });
		if (existingExplicitelySetChannel) {
			return await this.fetchChannel(existingExplicitelySetChannel.channelId);
		} else {
			const settings = await Settings.findOne({ where: { guildId } });
			if (!settings || !settings.commissionLog) return null;
			return await this.fetchChannel(settings.commissionLog);
		}
	}

	private static async fetchChannel(channelId: string): Promise<TextChannel | null> {
		const channel = await CLIENT_INSTANCE!.channels.fetch(channelId).catch(() => null);
		if (!channel) return null;
		if (!(channel instanceof TextChannel)) return null;
		return channel;
	}
}
