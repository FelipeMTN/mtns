import { User } from "discord.js";
import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import { CLIENT_INSTANCE } from "@classes/Client";

import { genId } from "@util/genId";

@Table({ tableName: "blacklists", freezeTableName: true })
export default class Blacklist extends Model {
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

	constructor(...args: any[]) {
		super(...args);
		this.assignProperties();
	}

	async assignProperties() {
		this.user = await this.client.users.fetch(this.userId).catch(() => null);
	}
}
