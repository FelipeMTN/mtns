import { existsSync, readFileSync } from "fs";
import { createServer as createServerHttp } from "http";
import { createServer as createServerHttps } from "https";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import ratelimit from "express-rate-limit";
import morgan from "morgan";

import { CLIENT_INSTANCE } from "@classes/Client";
import Logger from "@classes/Logger";

import { LoggingLevel, loggingLevel } from "@util/loggingLevel";
import { checkEndpointOn } from "@util/web/checkEndpointOn";

import { userRouter } from "@api/UserRoute";

import { bankRouter } from "./BankRoute";
import { ipnRouter } from "./IpnRoute";
import { ticketsRouter } from "./TicketsRoute";
import { transcriptRouter } from "./TranscriptRoute";

const app = express();

const GET_PAGE = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>API is live.</title>
		<style>
			body {
				background-color: #f0f0f0;
			}

			.status {
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				text-align: center;
				background-color: #fff;
				padding: 2rem;
				border-radius: 5px;
				box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
				font-family: Arial, sans-serif;
			}

			h1 {
				font-size: 1.5rem;
				margin-bottom: 1rem;
			}

			p {
				font-size: 1rem;
				text-align: center;
			}
		</style>
	</head>
	<body>
		<div class="status">
			<h1>If you're seeing this page, it means that<br />you configured your API correctly.</h1>
			<p>You can now use it in your integration with the URL: <a href="{{url}}">{{url}}</a>.</p>
		</div>
	</body>
</html>
`;

export default class WebServer {
	private readonly client = CLIENT_INSTANCE!;
	private readonly httpPort: number;
	private readonly httpsPort?: number;

	constructor(httpPort: number, httpsPort?: number) {
		this.httpPort = httpPort;
		this.httpsPort = httpsPort;
		this.run();
		this.middleware();
	}

	middleware() {
		app.set("trust proxy", 1);

		app.use((req, res, next) => {
			if (req.originalUrl.startsWith("/ipn/stripe")) {
				express.raw({ type: "application/json" })(req, res, next);
			} else {
				express.json()(req, res, next);
			}
		});

		app.use(cors());

		app.use(
			ratelimit({
				windowMs: 5 * 60 * 1000,
				limit: 100,
				standardHeaders: true,
				legacyHeaders: false,
			}),
		);

		app.use(morgan("dev"));

		app.use((_req: Request, res: Response, next: NextFunction) => {
			if (!this.client.readyTimestamp) return res.status(503).json({ ok: false, message: "Client not ready." });
			next();
		});

		app.use((req: Request, res: Response, next: NextFunction) => {
			Logger.trace("Request from:", req.headers["x-forwarded-for"] || req.socket.remoteAddress);
			next();
		});

		app.use("/tickets", checkEndpointOn("tickets"), ticketsRouter);
		app.use("/transcripts", checkEndpointOn("transcripts"), transcriptRouter);
		app.use("/bank", checkEndpointOn("bank"), bankRouter);
		app.use("/users", checkEndpointOn("users"), userRouter);
		app.use("/ipn", ipnRouter);

		app.get("/", (req: Request, res: Response) => {
			const connectionUrl = req.protocol + "://" + req.get("host") + req.originalUrl;
			res.setHeader("Content-Type", "text/html");
			res.send(GET_PAGE.replace(new RegExp("{{url}}", "g"), connectionUrl));
		});

		app.get("*", (_req: Request, res: Response) => {
			res.status(404).json({ ok: false, message: "Page not found." });
		});
	}

	run() {
		this.runHttp();
		if (this.client.config.main.api.ssl.enabled && this.httpsPort) {
			this.runHttps();
		}
	}

	runHttp() {
		createServerHttp(app).listen(this.httpPort, () => {
			if (loggingLevel() > LoggingLevel.MINIMAL)
				Logger.runtime(`HTTP listening on port ${this.httpPort}. // http://localhost:${this.httpPort}`);
		});
	}

	runHttps() {
		const sslCertPath = this.client.config.main.api.ssl.cert;
		const sslKeyPath = this.client.config.main.api.ssl.key;
		if (!sslKeyPath || !sslCertPath) {
			throw new Error(
				"SSL is enabled but no key or cert is provided in config.yml. Please provide a path to key and cert.",
			);
		}
		if (!existsSync(sslKeyPath)) {
			throw new Error(`SSL key file does not exist (loading ${sslKeyPath}).`);
		}
		if (!existsSync(sslCertPath)) {
			throw new Error(`SSL cert file does not exist (loading ${sslCertPath}).`);
		}
		const cert = readFileSync(sslCertPath, "utf8");
		const key = readFileSync(sslKeyPath, "utf8");

		createServerHttps({ cert, key }, app).listen(this.httpsPort, () => {
			Logger.runtime(`HTTPS listening on port ${this.httpsPort}. // https://localhost:${this.httpsPort}`);
		});
	}
}
