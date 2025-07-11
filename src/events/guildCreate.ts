import { Guild } from "discord.js";
import { Event } from "nhandler";

import Client from "@classes/Client";
import Logger from "@classes/Logger";

export default class GuildCreateEvent implements Event {
	client!: Client;
	name = "guildCreate";

	async run(guild: Guild) {
		this.leaveIfUnauthorized(guild);
	}

	async leaveIfUnauthorized(guild: Guild) {
		const guilds = this.client.config.main.guilds;
		if (!guilds.length) return; // If the list is empty, allow any.
		if (!guilds.includes(guild.id)) {
			await guild.leave();
			Logger.info(
				`Left unauthorized guild ${guild.name} (${guild.id}). If you wish to allow this guild, add it to the config (under the 'guilds' key).`,
			);
		}
	}
}
