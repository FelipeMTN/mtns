import { GuildMember } from "discord.js";
import { Event } from "nhandler";

import Client from "@classes/Client";
import Logger from "@classes/Logger";
import Profile from "@classes/Profile";
import Ticket from "@classes/Ticket";

export default class GuildMemberRemoveEvent implements Event {
	client!: Client;
	name = "guildMemberRemove";

	async run(member: GuildMember) {
		if (!member || !member.user) return;
		if (member.partial) member = await member.fetch();
		Logger.log(`${member.user.username} has left the server.`);
		this.deleteTickets(member);
		this.deleteProfile(member);
	}

	async deleteTickets(member: GuildMember) {
		const tickets = await Ticket.findAll({
			where: { closed: false, guildId: member.guild.id, authorId: member.user.id },
		});
		for (const ticket of tickets) {
			if (!ticket) continue;
			await ticket.archive("User left the server", "halt");
		}
	}

	async deleteProfile(member: GuildMember) {
		const profile = await Profile.findOne({ where: { userId: member.user.id } });
		if (profile) profile.destroy();
	}
}
