import { Message } from "discord.js";
import { Event } from "nhandler";

import Client from "@classes/Client";
import SavedMessage from "@classes/SavedMessage";
import { TicketManager } from "@classes/TicketManager";

export default class MessageUpdateEvent implements Event {
	client!: Client;
	name = "messageUpdate";

	async run(oldMsg: Partial<Message>, newMsg: Message) {
		if (newMsg.partial) await newMsg.fetch().catch(() => null);
		if (newMsg.author?.partial) await newMsg.author?.fetch().catch(() => null);
		this.editTranscriptMessage(oldMsg, newMsg);
	}

	async editTranscriptMessage(_oldMsg: Partial<Message>, newMsg: Message) {
		const ticket = await TicketManager.fetch({ guildId: newMsg.guildId, channelId: newMsg.channelId });
		if (!ticket) return;
		const savedMessage = await SavedMessage.findOne({ where: { discordMessageId: newMsg.id } });
		if (!savedMessage) return;
		savedMessage.handleUpdate(newMsg);
	}
}
