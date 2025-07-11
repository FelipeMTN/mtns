import { Message } from "discord.js";
import { Event } from "nhandler";

import Client from "@classes/Client";
import LateArchive from "@classes/LateArchive";
import Logger from "@classes/Logger";
import Prompt from "@classes/Prompt";
import SavedMessage from "@classes/SavedMessage";
import { TicketManager } from "@classes/TicketManager";

import { infoEmbed } from "@util/embeds";

export default class MessageCreateEvent implements Event {
	client!: Client;
	name = "messageCreate";

	async run(msg: Message) {
		if (msg.partial) await msg.fetch();
		if (msg.author.partial) await msg.author.fetch();
		if (msg.author.bot) return;
		this.saveMessage(msg);
		this.cancelScheduledArchives(msg);
		this.doPrompting(msg);
		this.setFresh(msg);
	}

	async saveMessage(msg: Message) {
		const ticket = await TicketManager.fetch({ guildId: msg.guildId, channelId: msg.channelId });
		if (!ticket) return;
		SavedMessage.handleSend(msg, ticket);
	}

	async cancelScheduledArchives(msg: Message) {
		if (msg.content.startsWith("@")) return;
		const ticket = await TicketManager.fetch({ channelId: msg.channel.id });
		if (!ticket) return;
		const lateArchive = await LateArchive.findOne({ where: { ticketId: ticket.id } });
		if (!lateArchive) return;
		if (!lateArchive.messageCancels) return;
		await lateArchive.destroy();
		msg.channel.send({ embeds: [infoEmbed(`Scheduled archive was cancelled because a message was sent.`)] });
	}

	async doPrompting(msg: Message) {
		const ticket = await TicketManager.fetch({ channelId: msg.channel.id });
		if (!ticket) return;
		const prompt = await Prompt.findOne({ where: { ticketId: ticket.id } });
		if (!prompt) return;
		prompt.onMessageInput({ message: msg, ticket });
	}

	async setFresh(msg: Message) {
		const ticket = await TicketManager.fetch({ channelId: msg.channel.id });
		if (!ticket) return;
		if (msg.author.bot) return;
		if (msg.author.id === ticket.authorId) return;
		if (!ticket.isFresh) return;
		Logger.trace("Setting ticket as unfresh because a message was sent.");
		ticket.isFresh = false;
		await ticket.save();
	}
}
