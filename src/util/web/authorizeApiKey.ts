import { NextFunction, Request, Response } from "express";

import { CLIENT_INSTANCE } from "@classes/Client";

export const authorizeApiKey = async (req: Request, res: Response, next: NextFunction) => {
	const client = CLIENT_INSTANCE!;
	if (!req.headers["x-api-key"]) {
		return res.status(401).json({ ok: false, message: "Missing X-Api-Key header." });
	}
	if (!client.config.main.api.keys.includes(req.headers["x-api-key"] as string)) {
		return res.status(403).json({ ok: false, message: "Invalid X-Api-Key header." });
	}
	next();
};
