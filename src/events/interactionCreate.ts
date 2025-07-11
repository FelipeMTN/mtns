import {
	Interaction,
	InteractionType,
	MessageContextMenuCommandInteraction,
	UserContextMenuCommandInteraction,
} from "discord.js";
import { Event, isAutocompleteInteraction, isCommandInteraction, isComponentInteraction } from "nhandler";

import Blacklist from "@classes/Blacklist";
import Client from "@classes/Client";
import Logger from "@classes/Logger";
import Prompt from "@classes/Prompt";
import Settings from "@classes/Settings";
import { TicketManager } from "@classes/TicketManager";
import UserPreferences from "@classes/UserPreferences";

import { errorEmbed } from "@util/embeds";

export default class InteractionCreateEvent implements Event {
	client!: Client;
	name = "interactionCreate";

	async run(interaction: Interaction): Promise<void> {
		let settings;
		if (interaction.guild) settings = await Settings.getOrCreate(interaction.guild.id);

		await UserPreferences.saveLastLanguage(interaction.user.id, interaction.locale);

		const blacklist = await Blacklist.findOne({ where: { userId: interaction.user.id } });
		if (blacklist && !this.client.config.main.owners.includes(interaction.user.id)) {
			if (isCommandInteraction(interaction) || isComponentInteraction(interaction)) {
				interaction.reply({
					embeds: [errorEmbed("You have been blacklisted from using the bot.")],
					ephemeral: true,
				});
			}
			return;
		}

		this.doPrompting(interaction);

		// Replace discord.js's locale with our own as we've already consumed it
		(interaction as any).locale = await UserPreferences.getLanguage(interaction.user.id);

		if (isComponentInteraction(interaction)) {
			Logger.trace(`Executing component ${interaction.customId} received from ${interaction.user.username}.`);
			Client.componentHandler.runComponent(interaction, { settings });
		}
		if (isCommandInteraction(interaction)) {
			Logger.trace(`Executing command ${interaction.commandName} received from ${interaction.user.username}.`);
			Client.commandHandler.runCommand(interaction, { settings });
		}
		if (isAutocompleteInteraction(interaction)) {
			Logger.trace(
				`Executing autocomplete ${interaction.commandName} received from ${interaction.user.username}.`,
			);
			Client.commandHandler.runAutocomplete(interaction);
		}
		if (
			interaction instanceof MessageContextMenuCommandInteraction ||
			interaction instanceof UserContextMenuCommandInteraction
		) {
			Logger.trace(`Executing action ${interaction.commandName} received from ${interaction.user.username}.`);
			Client.contextMenuHandler.runAction(interaction);
		}
	}

	async doPrompting(interaction: any) {
		const ticket = await TicketManager.fetch({ channelId: interaction.channel.id });
		if (!ticket) return;
		const prompt = await Prompt.findOne({
			where: { ticketId: ticket.id },
		});
		if (!prompt) return;
		if (interaction.type === InteractionType.MessageComponent) {
			if (interaction.isButton()) prompt.onButtonClick({ interaction, ticket });
			if (interaction.isStringSelectMenu()) prompt.onSelectMenu({ interaction, ticket });
		}
	}
}
