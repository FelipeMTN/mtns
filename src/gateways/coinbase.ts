import axios from "axios";
import { Request } from "express";
import { z } from "zod";

import type Invoice from "@classes/Invoice";

import { PaymentNotificationType } from "@util/paymentNotificationType";
import { compareSignature } from "@util/web/compareSig";

import { CreatePaymentOptions, CreatePaymentResult, GatewayMetadata } from "../gateways";
import { Gateway } from "./base";

const configSchema = z.object({
	name: z.string().default("Coinbase Commerce"),
	buttonLabel: z.string().default("Pay with Coinbase Commerce"),
	buttonSort: z.number().default(20),
	apiKey: z.string(),
	handlingFee: z.number().min(0).max(1).default(0.1),
	currency: z.string().default("USD"),
	paymentNotifications: z
		.object({
			type: z.nativeEnum(PaymentNotificationType).default(PaymentNotificationType.Polling),
			webhookSharedSecret: z.string().optional(),
		})
		.default({ type: PaymentNotificationType.Polling }),
});

type CoinbaseConfig = z.infer<typeof configSchema>;

export class CoinbaseGateway extends Gateway<NonNullable<CoinbaseConfig>> {
	public static configShape = configSchema;
	private readonly apiUrl = "https://api.commerce.coinbase.com";

	constructor(config: NonNullable<CoinbaseConfig>) {
		super(config);
	}

	initialize() {
		if (this.config.paymentNotifications.type === PaymentNotificationType.Webhook && !this.config.paymentNotifications.webhookSharedSecret) {
			this.log("Coinbase Commerce webhook shared secret is not set and 'webhook' payment mode is set. Please add your webhook shared secret in your config or set the 'type' to 'polling'.");
			process.exit(1);
		}
	}

	get metadata(): GatewayMetadata {
		return {
			id: "coinbase",
			name: this.config.name || "Coinbase Commerce",
			description: "Coinbase Commerce payment gateway",
			version: "1.0.0",
			supportsRefresh: true,
		};
	}

	private get headers() {
		return {
			"X-CC-Api-Key": this.config.apiKey,
			"X-CC-Version": "2018-03-22",
			"Content-Type": "application/json",
			Accept: "application/json",
		};
	}

	async createPayment({ amount, description }: CreatePaymentOptions): Promise<CreatePaymentResult> {
		const { data } = await axios.post(
			`${this.apiUrl}/charges`,
			{
				local_price: {
					amount: (amount * (1 + this.config.handlingFee)).toFixed(2),
					currency: this.config.currency.toUpperCase(),
				},
				pricing_type: "fixed_price",
				memo: description,
			},
			{ headers: this.headers },
		);

		return {
			url: data.data.hosted_url,
			gatewayId: this.metadata.id,
			gatewayReference: data.data.id,
		};
	}

	async refreshPayment(invoice: Invoice): Promise<string> {
		return new Promise<string>(async (resolve) => {
			axios.get(`${this.apiUrl}/charges/${invoice.gatewayReference}`, { headers: this.headers }).then(async (res) => {
				const isPaid = res.data.data.timeline.map((t: any) => t.status).some((r: string) => ["PENDING", "COMPLETED"].includes(r));
				resolve(isPaid ? "paid" : "pending");
			});
		});
	}

	referenceId(req: Request): string {
		return req.body.event.data.id;
	}

	async handleWebhook(req: Request, invoice: Invoice) {
		if (this.config.paymentNotifications.type !== PaymentNotificationType.Webhook) return;
		this.log("[COINBASE] Verifying incoming webhook.");
		const signature = req.headers["x-cc-webhook-signature"] as string;
		const verified = compareSignature(req.body, signature, this.config.paymentNotifications.webhookSharedSecret!);

		if (!verified) {
			this.log(`[COINBASE] Invalid signature for webhook: ${signature}`);
			return;
		}

		const event = req.body.event;
		const charge = req.body.event.data;

		if (event.type === "charge:pending") {
			invoice.events.emit("paid", {
				invoice,
				amountReceived: parseFloat(charge.pricing.local.amount),
				currency: this.config.currency,
			});
		} else {
			this.log(`[COINBASE] Ignoring status ${event.type} for invoice.`);
		}
	}

	cancelPayment(_invoice: Invoice): Promise<void> {
		return Promise.resolve(); // Not implemented
	}
}
