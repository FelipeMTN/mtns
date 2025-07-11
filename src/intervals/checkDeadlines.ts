import { TextChannel } from "discord.js";

import { CLIENT_INSTANCE } from "@classes/Client";
import Ticket from "@classes/Ticket";

import { infoEmbed } from "@util/embeds";

export async function checkDeadlines() {
	const client = CLIENT_INSTANCE!;
	const tickets = await Ticket.findAll();
	for (let ticket of tickets) {
		if (!ticket.deadline) continue;
		if (ticket.deadline.getTime() >= Date.now()) continue;
		ticket.deadline = null;
		ticket.save();
		const channel = client.channels.cache.get(ticket.channelId);
		if (!channel || !(channel instanceof TextChannel)) continue;
		const msg = await channel.messages.fetch(ticket.deadlineMessage!).catch(() => null);
		if (!msg) continue;
		const deadlineSeconds = Math.floor(ticket.deadline!.getTime() / 1000);
		const embed = infoEmbed(`Deadline: <t:${deadlineSeconds}:F>.\n**The deadline set on this commission is up.**`);
		msg.edit({ embeds: [embed] });
	}
}
