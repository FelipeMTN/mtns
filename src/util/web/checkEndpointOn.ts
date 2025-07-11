import { NextFunction, Request, Response } from "express";

import { CLIENT_INSTANCE } from "@classes/Client";

export const checkEndpointOn =
	(endpoint: "tickets" | "transcripts" | "bank" | "users") =>
	async (_req: Request, res: Response, next: NextFunction) => {
		const client = CLIENT_INSTANCE!;
		if (endpoint === "tickets" && !client.config.main.api.endpoints.tickets.enabled) {
			return res.status(403).json({ ok: false, message: "Endpoint is disabled." });
		} else if (endpoint === "transcripts" && !client.config.main.api.endpoints.transcripts.enabled) {
			return res.status(403).json({ ok: false, message: "Endpoint is disabled." });
		} else if (endpoint === "bank" && !client.config.main.api.endpoints.bank.enabled) {
			return res.status(403).json({ ok: false, message: "Endpoint is disabled." });
		} else if (endpoint === "users" && !client.config.main.api.endpoints.users.enabled) {
			return res.status(403).json({ ok: false, message: "Endpoint is disabled." });
		}
		next();
	};
