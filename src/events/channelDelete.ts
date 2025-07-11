import { ChannelType, TextBasedChannel } from "discord.js";
import { Event } from "nhandler";

import Client from "@classes/Client";
import Logger from "@classes/Logger";
import { TicketManager } from "@classes/TicketManager";

export default class ChannelDeleteEvent implements Event {
	client!: Client;
	name = "channelDelete";

	async run(channel: TextBasedChannel) {
		if (channel.type !== ChannelType.GuildText) return;
		const ticket = await TicketManager.fetch(
			{
				guildId: channel.guild.id,
				channelId: channel.id,
				closed: false,
			},
			{
				guildOverride: channel.guild,
				channelOverride: channel,
			},
		);
		if (!ticket) return;
		Logger.info(`Archiving ticket ${ticket.id} in database because the channel was deleted.`);
		await ticket.archive("Channel deleted", "halt");
	}
}
