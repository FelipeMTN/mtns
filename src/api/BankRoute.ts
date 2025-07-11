import { Request, Response } from "express";
import * as express from "express";
import { z } from "zod";

import Bank from "@classes/Bank";
import Transaction from "@classes/Transaction";

import { authorizeApiKey } from "@util/web/authorizeApiKey";

const router = express.Router();
export { router as bankRouter };

router.get("/balance/:userId", authorizeApiKey, async (req: Request, res: Response) => {
	const userId = req.params.userId;
	const bank = await Bank.getOrCreate(userId);
	res.status(200).json({ ok: true, data: { balance: bank.balance } });
});

router.get("/transactions/:userId", authorizeApiKey, async (req: Request, res: Response) => {
	const userId = req.params.userId;
	const bank = await Transaction.findAll({ where: { userId }, order: [["createdAt", "DESC"]] });
	res.status(200).json({ ok: true, data: bank });
});

router.put("/add", authorizeApiKey, async (req: Request, res: Response) => {
	const bodyShape = z.object({
		userId: z.string(),
		amount: z.number(),
		note: z.string().optional(),
		noteHtml: z.string().optional(),
	});
	const parsedBody = bodyShape.safeParse(req.body);
	if (!parsedBody.success) {
		res.status(400).json({ ok: false, message: "Invalid body.", data: { errors: parsedBody.error.issues } });
		return;
	}
	const { userId, amount, note, noteHtml } = parsedBody.data;

	const bank = await Bank.getOrCreate(userId);
	bank.balance += amount;
	await bank.save();
	await Transaction.create({
		type: "GENERIC_ADD",
		userId: userId,
		amount: amount,
		note: note || "Added by administrator.",
		noteHtml: noteHtml || note || "Added by administrator.",
	});
	res.status(200).json({ ok: true });
});

router.put("/subtract", authorizeApiKey, async (req: Request, res: Response) => {
	const bodyShape = z.object({
		userId: z.string(),
		amount: z.number(),
		preventNegative: z.boolean().default(false),
		note: z.string().optional(),
		noteHtml: z.string().optional(),
	});
	const parsedBody = bodyShape.safeParse(req.body);
	if (!parsedBody.success) {
		res.status(400).json({ ok: false, message: "Invalid body.", data: { errors: parsedBody.error.issues } });
		return;
	}
	const { userId, amount, preventNegative, note, noteHtml } = parsedBody.data;

	const bank = await Bank.getOrCreate(userId);
	if (preventNegative) {
		if (bank.balance - amount < 0) {
			res.status(400).json({
				ok: false,
				message: "The user has less balance than subtracting and preventNegative is set.",
			});
			return;
		}
	}
	bank.balance -= amount;
	await bank.save();
	await Transaction.create({
		type: "GENERIC_SUBTRACT",
		userId: userId,
		amount: -amount,
		note: note || "Subtracted by administrator.",
		noteHtml: noteHtml || note || "Subtracted by administrator.",
	});
	res.status(200).json({ ok: true });
});

router.put("/set", authorizeApiKey, async (req: Request, res: Response) => {
	const bodyShape = z.object({
		userId: z.string(),
		amount: z.number(),
		note: z.string().optional(),
		noteHtml: z.string().optional(),
	});
	const parsedBody = bodyShape.safeParse(req.body);
	if (!parsedBody.success) {
		res.status(400).json({ ok: false, message: "Invalid body.", data: { errors: parsedBody.error.issues } });
		return;
	}
	const { userId, amount, note, noteHtml } = parsedBody.data;

	const bank = await Bank.getOrCreate(userId);
	bank.balance = amount;
	await bank.save();
	await Transaction.create({
		type: "GENERIC_SET",
		userId: userId,
		amount: bank.balance > amount ? amount - bank.balance : bank.balance - amount,
		note: note || "Modified by administrator.",
		noteHtml: noteHtml || note || "Modified by administrator.",
	});
	res.status(200).json({ ok: true });
});
