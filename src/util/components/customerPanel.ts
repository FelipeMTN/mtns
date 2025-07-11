import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";

import { __ } from "@util/translate";

export const customerPanel = (locale: string) => {
	let options = [];

	options.push(
		new StringSelectMenuOptionBuilder()
			.setLabel(__("customerpanel.action.add.label", { _locale: locale }))
			.setDescription(__("customerpanel.action.add.description", { _locale: locale }))
			.setValue("add"),
		new StringSelectMenuOptionBuilder()
			.setLabel(__("customerpanel.action.remove.label", { _locale: locale }))
			.setDescription(__("customerpanel.action.remove.description", { _locale: locale }))
			.setValue("remove"),
	);

	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		new StringSelectMenuBuilder()
			.setPlaceholder(__("customerpanel.placeholder", { _locale: locale }))
			.setCustomId("customerpanel")
			.addOptions(...options),
	);
};
