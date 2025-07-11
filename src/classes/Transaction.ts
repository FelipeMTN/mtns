import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import { genId } from "@util/genId";

@Table({
	tableName: "transactions",
	freezeTableName: true,
})
export default class Transaction extends Model {
	@PrimaryKey
	@AllowNull(false)
	@Default(() => genId())
	@Column(DataType.STRING(10))
	id!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	userId!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	type!: string;

	@AllowNull(false)
	@Column(DataType.FLOAT)
	amount!: number;

	@Column(DataType.TEXT)
	note?: string;

	@Column(DataType.TEXT)
	noteHtml?: string;
}
