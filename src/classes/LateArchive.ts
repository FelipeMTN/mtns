import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import { genId } from "@util/genId";

@Table({
	tableName: "latearchives",
	freezeTableName: true,
})
export default class LateArchive extends Model {
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
	ticketId!: string;

	@AllowNull(false)
	@Column(DataType.DATE)
	archiveAfter!: Date;

	@AllowNull(false)
	@Default(true)
	@Column(DataType.BOOLEAN)
	messageCancels!: boolean;

	@AllowNull(true)
	@Column(DataType.TEXT)
	reason!: string;
}
