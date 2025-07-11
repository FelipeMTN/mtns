import * as express from "express";
import { Request, Response } from "express";

import { CLIENT_INSTANCE } from "@classes/Client";
import Invoice from "@classes/Invoice";

const router = express.Router();
export { router as ipnRouter };

const GET_IPN_PAGE = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>IPN endpoint</title>
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
			<h1>If you're seeing this page,<br/>it means that you configured your webhook route correctly.</h1>
			<p>You can now pass it into your payment provider.</p>
			<script>
			const hasHttps = window.location.protocol === "https:";
			if(!hasHttps) {
				document.write("<p style='color: red;'>Warning: You're not using HTTPS. Make sure to use HTTPS when configuring your IPN endpoint.</p>");
			}
			</script>
		</div>
	</body>
</html>
`;

router.get("*", async (req: Request, res: Response) => {
	res.setHeader("Content-Type", "text/html");
	res.send(GET_IPN_PAGE);
});

router.post("/:id", async (req: Request, res: Response) => {
	const gateway = CLIENT_INSTANCE!.gateways.find((g) => g.metadata.id === req.params.id);
	if (!gateway) {
		return res.status(200).json({ ok: false, message: `Gateway with id ${req.params.id} not found.` });
	}
	const invoice = await Invoice.findOne({ where: { gatewayReference: gateway.referenceId(req) } });
	if (!invoice) {
		return res.status(200).json({
			ok: false,
			message: `Invoice with reference ${gateway.referenceId(req)} not found. If you're this gateway's creator, ensure the referenceId() method returns a valid ID to fetch by.`,
		});
	}
	gateway.handleWebhook(req, invoice);
	res.status(200).json({ ok: true });
});
