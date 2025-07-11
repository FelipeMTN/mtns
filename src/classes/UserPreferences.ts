import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import { CLIENT_INSTANCE } from "@classes/Client";

import { genId } from "@util/genId";

import Logger from "./Logger";

@Table({
	tableName: "userpreferences",
	freezeTableName: true,
})
export default class UserPreferences extends Model {
	@PrimaryKey
	@AllowNull(false)
	@Default(() => genId())
	@Column(DataType.STRING(10))
	id!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	userId!: string;

	@AllowNull(false)
	@Default("en-US")
	@Column(DataType.TEXT)
	language!: string;

	@AllowNull(true)
	@Column(DataType.TEXT)
	forcedLanguage!: string;

	static async saveLastLanguage(userId: string, language: string): Promise<void> {
		let userPreferences = await UserPreferences.findOne({ where: { userId } });
		if (!userPreferences) {
			Logger.trace(`Saving new user preferences for ${userId}.`);
			userPreferences = await UserPreferences.create({ userId, language });
		}
		if (!userPreferences.forcedLanguage || !CLIENT_INSTANCE!.locales[language]) return;
		Logger.trace(`Saving last locale for user ${userId} as ${language}.`);
		userPreferences.language = language;
		userPreferences.save();
	}

	static async setForcedLanguage(userId: string, language: string): Promise<void> {
		const userPreferences = await UserPreferences.findOne({ where: { userId } });
		if (!userPreferences) return;
		userPreferences.forcedLanguage = language;
		await userPreferences.save();
	}

	static async getLanguage(userId: string): Promise<string> {
		if (!CLIENT_INSTANCE!.config.main.dynamicLanguage) return "en-US";
		const userPreferences = await UserPreferences.findOne({ where: { userId } });
		if (!userPreferences) return "en-US";
		if (userPreferences.forcedLanguage) return userPreferences.forcedLanguage;
		return userPreferences.language;
	}
}
