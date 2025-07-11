import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import { genId } from "@util/genId";

@Table({
	tableName: "servicecuts",
	freezeTableName: true,
})
export default class ServiceCut extends Model {
	@PrimaryKey
	@AllowNull(false)
	@Default(() => genId())
	@Column(DataType.STRING(10))
	id!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	guildId!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	userId!: string;

	@AllowNull(false)
	@Column(DataType.FLOAT)
	percentage!: number;
}
