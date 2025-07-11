import { ActionRowBuilder, ButtonBuilder, ComponentType, StringSelectMenuBuilder } from "discord.js";

export const disableButtons = (rows: any[]): any => {
	return rows.map((row: any) => {
		const components = row.components
			.map((cmp: any) => {
				if (cmp.type === ComponentType.Button) return ButtonBuilder.from(cmp);
				else if (cmp.type === ComponentType.StringSelect) return StringSelectMenuBuilder.from(cmp);
			})
			.map((b: any) => b.setDisabled(true));
		return new ActionRowBuilder().addComponents(...components);
	});
};
