import { ChatInputCommandInteraction } from "discord.js";
import { AnyComponentInteraction, Command } from "nhandler";

import Client from "@classes/Client";
import Settings from "@classes/Settings";

import { BaseComponent } from "@util/baseInterfaces";

export default class ProfilePanelViewSelfProfileComponent extends BaseComponent {
	customId = "profilepanel-lookupotherself";
	findFn = (event: AnyComponentInteraction) => event.customId === this.customId;

	async run(interaction: AnyComponentInteraction, { settings }: { settings: Settings }): Promise<void> {
		const profileCmd = Client.commandHandler.commands.find((cmd: Command) => cmd.name === "profile");
		if (!profileCmd) return;
		await profileCmd.run(interaction as unknown as ChatInputCommandInteraction, {
			settings,
			lookupUser: interaction.user,
		});
	}
}
