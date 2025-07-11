import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import * as express from "express";
import mime from "mime";

import { CLIENT_INSTANCE } from "@classes/Client";
import SavedAttachment from "@classes/SavedAttachment";
import SavedMessage from "@classes/SavedMessage";
import Ticket from "@classes/Ticket";

import { getDataDir } from "@util/getDataDir";
import { authorizeApiKey } from "@util/web/authorizeApiKey";

const router = express.Router();
export { router as transcriptRouter };

router.get("/assets/:messageId/:filename", async (req: Request, res: Response) => {
	const dataDir = getDataDir();
	const attachmentsDir = path.join(dataDir, "saved-attachments");
	if (!fs.existsSync(attachmentsDir)) {
		return res.status(404).send("File not found.");
	}
	const messageId = req.params.messageId;
	const filename = req.params.filename;

	const filePath = path.join(attachmentsDir, messageId, filename);
	if (!fs.existsSync(filePath)) {
		return res.status(404).send("File not found.");
	}

	const mimeType = mime.getType(filePath);
	res.setHeader("Content-Type", mimeType || "application/octet-stream");

	fs.createReadStream(filePath).pipe(res);
});

router.get("/:ticketId", authorizeApiKey, async (req: Request, res: Response) => {
	const client = CLIENT_INSTANCE!;

	const id = req.params.ticketId;
	const page = parseInt(req.query.page as string) || 1;
	const limit = parseInt(req.query.limit as string) || 10;

	if (!id) return res.status(400).json({ ok: false, message: "No ticket id provided." });
	const ticket = await Ticket.findByPk(id);
	if (!ticket) return res.status(404).json({ ok: false, message: "Ticket not found." });

	const count = await SavedMessage.count({ where: { ticketId: id } });
	let messages = await SavedMessage.findAll({
		where: { ticketId: id },
		order: [["createdAt", "DESC"]],
		limit: limit,
		offset: (page - 1) * limit,
		include: [SavedAttachment],
	});

	if (!client.config.tickets.transcripts.includeDeletedMessages) {
		messages = messages.filter((message) => !message.messageDeletedAt);
	}

	const mappedMessages = messages.map((message) => {
		const author = client.users.cache.get(message.authorId);

		return {
			...message.toJSON(),
			link: `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`,
			author: author,
			attachments: message.attachments.map((attachment) => attachment.url),
		};
	});

	res.status(200).json({ ok: true, data: { messages: mappedMessages, totalCount: count } });
});

// router.get("/:ticketId/file", authorizeApiKey, async (req: Request, res: Response) => {
// 	const id = req.params.ticketId;
// 	if (!id) return res.status(400).json({ ok: false, message: "No ticket id provided." });
//
// 	const resolvedTicket = await TicketManager.fetch({ id });
// 	if (!resolvedTicket) return res.status(404).json({ ok: false, message: "Ticket not found." });
//
// 	resolvedTicket
// 		.fetchTranscript()
// 		.then((buff: Buffer) => {
// 			res.setHeader("Content-Type", "application/octet-stream");
// 			res.setHeader("Content-Disposition", `attachment; filename=transcript-${id}.txt`);
// 			res.send(buff);
// 		})
// 		.catch((err) => {
// 			res.status(400).json({ ok: false, data: err.message });
// 		});
// });
