import * as express from "express";
import { Request, Response } from "express";

import { CLIENT_INSTANCE } from "@classes/Client";
import Invoice from "@classes/Invoice";
import SavedMessage from "@classes/SavedMessage";
import Ticket from "@classes/Ticket";
import { AnyTicket, CooldownError, TicketManager, TicketType } from "@classes/TicketManager";

import { infoEmbed } from "@util/embeds";
import { __ } from "@util/translate";
import { authorizeApiKey } from "@util/web/authorizeApiKey";

const router = express.Router();
export { router as ticketsRouter };

router.get("/", authorizeApiKey, async (req: Request, res: Response) => {
	const type = req.query.type;

	const where: { type?: TicketType } = {};
	if (type === "commission") where.type = TicketType.Commission;
	else if (type === "application") where.type = TicketType.Application;
	else if (type === "support") where.type = TicketType.Support;

	const page = req.query.page ? parseInt(req.query.page as string) : 1;
	const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

	let tickets = await Ticket.findAll({ where, limit, offset: (page - 1) * limit, order: [["createdAt", "DESC"]] });

	if (!tickets) return res.status(404).json({ ok: false, message: "Tickets not found." });
	if (!tickets.length) return res.status(200).json({ ok: true, data: [] });

	// @ts-ignore
	const resolvedTickets = await Promise.all(tickets.map(TicketManager.resolve));
	const mappedTickets = resolvedTickets
		.filter((t): t is AnyTicket => t !== null)
		.map((t) => ({
			...t.toJSON(),
			author: t.author,
			channel: t.channel,
		}));

	res.status(200).json({ ok: true, data: mappedTickets });
});

router.get("/count", authorizeApiKey, async (req: Request, res: Response) => {
	let count = await Ticket.count();
	if (count === null) return res.status(404).json({ ok: false, message: "No tickets found." });
	res.status(200).json({ ok: true, count });
});

router.get("/:id", authorizeApiKey, async (req: Request, res: Response) => {
	const id = req.params.id;
	const type = req.query.type;
	if (!id) return res.status(400).json({ ok: false, message: "No ID provided." });

	const where: { id: string; type?: TicketType } = { id };
	if (type === "commission") where.type = TicketType.Commission;
	else if (type === "application") where.type = TicketType.Application;
	else if (type === "support") where.type = TicketType.Support;
	const ticket = await TicketManager.fetch(where);

	if (!ticket) return res.status(404).json({ ok: false, message: "Ticket not found." });
	const invoice = await Invoice.findOne({ where: { ticketId: ticket.id } });
	const data = {
		...ticket.toJSON(),
		author: ticket.author,
		channel: ticket.channel.toJSON(),
		invoice: invoice?.toJSON(),
	};

	res.status(200).json({ ok: true, data });
});

router.get("/by/:userId", authorizeApiKey, async (req: Request, res: Response) => {
	const client = CLIENT_INSTANCE!;
	const userId = req.params.userId;
	const guildId = req.query.guildId;
	const type = req.query.type;

	const page = req.query.page ? parseInt(req.query.page as string) : 1;
	const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

	if (!userId) return res.status(400).json({ ok: false, message: "No user ID provided." });

	let where: { type?: TicketType; authorId: string; guildId?: string } = { authorId: userId };
	if (type === "commission") where.type = TicketType.Commission;
	else if (type === "application") where.type = TicketType.Application;
	else if (type === "support") where.type = TicketType.Support;
	if (guildId) where.guildId = guildId as string;

	let tickets = await Ticket.findAll({
		where: where,
		limit,
		offset: (page - 1) * limit,
		order: [["createdAt", "DESC"]],
	});

	if (!tickets) return res.status(404).json({ ok: false, message: "Tickets not found." });

	let mappedTickets = await Promise.all(
		tickets.map(async (ticket) => {
			const author = client.users.cache.get(ticket.authorId);
			const channel = client.channels.cache.get(ticket.channelId);
			return {
				...ticket.toJSON(),
				channel: channel,
				author: author,
			};
		}),
	);

	mappedTickets = mappedTickets.filter((t) => t.author !== undefined && t.channel !== undefined);

	res.status(200).json({ ok: true, data: mappedTickets });
});

router.get("/config/services", authorizeApiKey, (req, res) => {
	const client = CLIENT_INSTANCE!;
	res.status(200).json({
		ok: true,
		data: client.config.services,
	});
});

router.get("/config/commissions-prompts", authorizeApiKey, (req, res) => {
	const client = CLIENT_INSTANCE!;
	res.status(200).json({
		ok: true,
		data: client.config.prompts.commissions,
	});
});

router.get("/config/applications-prompts", authorizeApiKey, (req, res) => {
	const client = CLIENT_INSTANCE!;
	res.status(200).json({
		ok: true,
		data: client.config.prompts.applications,
	});
});

router.post("/:type/create/:guildId/:userId", authorizeApiKey, async (req, res) => {
	const client = CLIENT_INSTANCE!;
	const type = req.params.type;
	if (!["commissions", "applications", "support"].includes(type))
		return res.status(400).json({ ok: false, message: "Invalid type." });
	const guildId = req.params.guildId;
	const userId = req.params.userId;
	const message = Array.isArray(req.query.message) ? req.query.message.join(" ") : req.query.message;
	const guild = client.guilds.cache.get(guildId);
	if (!guild) return res.status(404).json({ ok: false, message: "Guild not found." });
	const user = await client.users.fetch(userId).catch(() => null);
	if (!user) return res.status(404).json({ ok: false, message: "User not found." });

	let parsedType: TicketType = TicketType.Commission;
	if (type === "applications") parsedType = TicketType.Application;
	else if (type === "support") parsedType = TicketType.Support;

	TicketManager.create({ type: parsedType, guild, author: user, locale: "en-US" })
		.then((ticket) => {
			res.status(200).json({ ok: true, data: ticket });
			if (message) {
				ticket.channel.send({
					embeds: [
						infoEmbed(__("web.created_from_dashboard", { description: message as string })).setTitle(
							__("web.created_from_dashboard_title"),
						),
					],
				});
			}
		})
		.catch((err) => {
			if (err instanceof CooldownError) {
				res.status(429).json({ ok: false, message: err.message });
				return;
			}
			res.status(500).json({ ok: false, message: err.message });
		});
});

router.post("/stats", authorizeApiKey, async (req, res) => {
	const totalCount = await Ticket.count();
	const freshCount = await Ticket.count({ where: { isFresh: true } });
	const commissions = await Ticket.count({ where: { type: TicketType.Commission, closed: false } });
	const applications = await Ticket.count({ where: { type: TicketType.Application, closed: false } });
	const supports = await Ticket.count({ where: { type: TicketType.Support, closed: false } });

	res.status(200).json({
		ok: true,
		data: {
			totalCount,
			freshCount,
			commissions,
			applications,
			supports,
		},
	});
});

router.put("/talk/:ticketId/:asUserId", authorizeApiKey, async (req, res) => {
	const ticketId = req.params.ticketId;
	const asUserId = req.params.asUserId;
	const message = req.body.message;

	if (!ticketId || !asUserId || !message) return res.status(400).json({ ok: false, message: "Invalid request." });
	if (message.length > 2000) return res.status(400).json({ ok: false, message: "Message too long." });

	const ticket = await TicketManager.fetch({ id: ticketId });
	if (!ticket) return res.status(404).json({ ok: false, message: "Ticket not found." });
	if (ticket.closed) return res.status(400).json({ ok: false, message: "Ticket is closed." });
	if (!ticket.channel) return res.status(400).json({ ok: false, message: "Ticket channel not found." });

	const user = CLIENT_INSTANCE!.users.cache.get(asUserId);
	if (!user) return res.status(404).json({ ok: false, message: "User not found." });

	const msg = await ticket.channel.send({
		embeds: [
			infoEmbed(message)
				.setAuthor({ name: user.displayName, iconURL: user.displayAvatarURL() })
				.setFooter({ text: __("web.created_from_dashboard") })
				.setTimestamp(null),
		],
	});

	msg.author.id = asUserId;
	msg.content = message;

	SavedMessage.handleSend(msg, ticket, true);

	res.status(200).json({ ok: true });
});
