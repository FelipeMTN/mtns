import dayjs from "dayjs";
import { Channel, Guild, TextChannel, User } from "discord.js";

import { CLIENT_INSTANCE } from "@classes/Client";
import Ticket from "@classes/Ticket";
import ApplicationTicket from "@classes/Tickets/ApplicationTicket";
import CommissionTicket from "@classes/Tickets/CommissionTicket";
import SupportTicket from "@classes/Tickets/SupportTicket";
import UserPreferences from "@classes/UserPreferences";

import { __ } from "@util/translate";

import Logger from "./Logger";

export enum TicketType {
	Commission,
	Application,
	Support,
}
export type AnyTicket = CommissionTicket | ApplicationTicket | SupportTicket;

export class CooldownError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CooldownError";
	}
}

export class TicketManager {
	static create({ type, guild, author, startQuestions = true, locale }: { type: TicketType; guild: Guild; author: User; startQuestions?: boolean; locale: string }): Promise<AnyTicket> {
		return new Promise<AnyTicket>(async (res, rej) => {
			const client = CLIENT_INSTANCE;
			if (!client) return rej("Client not ready.");
			try {
				if (type === TicketType.Commission && !client.config.tickets.enabled.commissions) {
					return rej(new Error("Commission tickets are disabled."));
				}
				if (type === TicketType.Application && !client.config.tickets.enabled.applications) {
					return rej(new Error("Application tickets are disabled."));
				}
				if (type === TicketType.Support && !client.config.tickets.enabled.support) {
					return rej(new Error("Support tickets are disabled."));
				}

				const cooldown = client.ticketCooldowns.get(author.id);

				if (cooldown && cooldown > Date.now()) {
					return rej(
						new CooldownError(
							__("tickets.on_cooldown", {
								_locale: locale,
								relative: dayjs(cooldown).fromNow(true),
								seconds: dayjs(cooldown).get("seconds").toString(),
								minutes: dayjs(cooldown).get("minutes").toString(),
								hours: dayjs(cooldown).get("hours").toString(),
								ms: cooldown.toString(),
							}),
						),
					);
				}

				client.ticketCooldowns.set(author.id, Date.now() + 1000 * client.config.tickets.cooldown);

				if (type === TicketType.Commission) {
					const currentCount = await Ticket.count({
						where: { type: 0, guildId: guild.id },
					});
					let serial = currentCount + 1;
					let ticket: CommissionTicket = CommissionTicket.build({
						type: type,
						serial: serial,
						guildId: guild.id,
						authorId: author.id,
					});
					ticket.client = client;
					ticket.guild = guild;
					ticket.author = author;
					ticket.locale = locale;

					const channel = await ticket.createChannel(serial);
					ticket.channelId = channel.id;
					ticket.channelName = channel.name;
					ticket.channel = channel;

					await ticket.save();

					await ticket.start(startQuestions);
					return res(ticket);
				}
				if (type === TicketType.Application) {
					const currentCount = await Ticket.count({
						where: { type: 1, guildId: guild.id },
					});
					let serial = currentCount + 1;
					let ticket: ApplicationTicket = ApplicationTicket.build({
						type: type,
						serial: serial,
						guildId: guild.id,
						authorId: author.id,
					});
					ticket.client = client;
					ticket.guild = guild;
					ticket.author = author;
					ticket.locale = locale;

					const channel = await ticket.createChannel(serial);
					ticket.channelId = channel.id;
					ticket.channelName = channel.name;
					ticket.channel = channel;

					await ticket.save();

					await ticket.start(startQuestions);
					return res(ticket);
				}
				if (type === TicketType.Support) {
					const currentCount = await Ticket.count({
						where: { type: 2, guildId: guild.id },
					});
					let serial = currentCount + 1;
					let ticket: SupportTicket = SupportTicket.build({
						type: type,
						serial: serial,
						guildId: guild.id,
						authorId: author.id,
					});
					ticket.client = client;
					ticket.guild = guild;
					ticket.author = author;
					ticket.locale = locale;

					const channel = await ticket.createChannel(serial);
					ticket.channelId = channel.id;
					ticket.channelName = channel.name;
					ticket.channel = channel;

					await ticket.save();

					await ticket.start(startQuestions);
					return res(ticket);
				}
			} catch (err) {
				rej(err);
			}
		});
	}

	static async resolve(ticket: any, { guildOverride, channelOverride, authorOverride }: { guildOverride?: Guild; channelOverride?: Channel; authorOverride?: User } = {}): Promise<AnyTicket | null> {
		const client = CLIENT_INSTANCE;
		if (!client) {
			Logger.trace("Client not ready.");
			return null;
		}
		const guild = guildOverride ?? client.guilds.cache.get(ticket.guildId);
		if (!guild) {
			Logger.trace(`resolve() for #${ticket.id} failed: Guild not found.`);
			return null;
		}
		const channel: Channel | null = channelOverride ?? (await client.channels.fetch(ticket.channelId).catch(() => null));
		if (!channel || !(channel instanceof TextChannel)) {
			Logger.trace(`resolve() for #${ticket.id} failed: Channel not found. Was the channel deleted without the ticket?`);
			return null;
		}
		const author = authorOverride ?? (await client.users.fetch(ticket.authorId).catch(() => null));
		if (!author) {
			Logger.trace(`resolve() for #${ticket.id} failed: Author not found. Did the user leave?`);
			return null;
		}
		ticket.client = client;
		ticket.channel = channel;
		ticket.guild = guild;
		ticket.author = author;
		ticket.locale = await UserPreferences.getLanguage(ticket.authorId);
		return ticket;
	}

	/**
	 * @param where - The where clause to use when fetching the ticket.
	 * @param overrides - If the ticket doesn't have a channel (for example, it just got deleted), doesn't have an assigned guild or ticket author is not present (left?), you can provide these overrides.
	 * */
	static async fetch(where: any, overrides: { guildOverride?: Guild; channelOverride?: Channel; authorOverride?: User } = {}): Promise<AnyTicket | null> {
		const baseTicket = await Ticket.findOne({ where: where });
		if (!baseTicket) return null;
		if (baseTicket.type === TicketType.Commission) {
			const ticket = await CommissionTicket.findOne({ where: where });
			if (!ticket) return null;
			return await TicketManager.resolve(ticket, overrides);
		}
		if (baseTicket.type === TicketType.Application) {
			const ticket = await ApplicationTicket.findOne({ where: where });
			if (!ticket) return null;
			return await TicketManager.resolve(ticket, overrides);
		}
		if (baseTicket.type === TicketType.Support) {
			const ticket = await SupportTicket.findOne({ where: where });
			if (!ticket) return null;
			return await TicketManager.resolve(ticket, overrides);
		}
		return null;
	}

	/**
	 * @param where
	 */
	static async fetchAll(where: any): Promise<AnyTicket[]> {
		const tickets = await Ticket.findAll({ where: where });
		const resolvedTickets = await Promise.all(tickets.map((ticket) => TicketManager.resolve(ticket)));
		return resolvedTickets.filter((ticket) => ticket !== null) as AnyTicket[];
	}
}
