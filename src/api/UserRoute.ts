import { Request, Response } from "express";
import * as express from "express";

import { CLIENT_INSTANCE } from "@classes/Client";
import Settings from "@classes/Settings";

import { authorizeApiKey } from "@util/web/authorizeApiKey";

const router = express.Router();
export { router as userRouter };

router.get("/:guildId/:userId/role", authorizeApiKey, async (req: Request, res: Response) => {
	const client = CLIENT_INSTANCE!;
	const { userId, guildId } = req.params;
	const guild = client.guilds.cache.get(guildId);
	if (!guild) return res.status(404).json({ ok: false, message: "Guild not found." });
	const settings = await Settings.getOrCreate(guild.id);
	const member = await guild.members.fetch(userId).catch(() => null);
	if (!member) return res.status(404).json({ ok: false, message: "Member not found." });
	let role = 0;
	if (member.roles.cache.some((r) => r.id === settings.freelancerRole)) role = 1;
	if (member.roles.cache.some((r) => r.id === settings.managerRole)) role = 2;

	res.json({
		ok: true,
		data: { role },
	});
});
