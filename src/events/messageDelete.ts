import { Message } from "discord.js";
import { Event } from "nhandler";

import Client from "@classes/Client";
import SavedMessage from "@classes/SavedMessage";
import { TicketManager } from "@classes/TicketManager";

export default class MessageDeleteEvent implements Event {
	client!: Client;
	name = "messageDelete";

	async run(msg: Partial<Message>) {
		this.deleteTranscriptMessage(msg);
	}

	async deleteTranscriptMessage(msg: Partial<Message>) {
		const ticket = await TicketManager.fetch({ guildId: msg.guildId, channelId: msg.channelId });
		if (!ticket) return;
		const savedMessage = await SavedMessage.findOne({ where: { discordMessageId: msg.id } });
		if (!savedMessage) return;
		savedMessage.handleDelete();
	}
}
