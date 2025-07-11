import { Request } from "express";
import { z } from "zod";

import type Client from "@classes/Client";
import type Invoice from "@classes/Invoice";

import { CreatePaymentOptions, CreatePaymentResult, GatewayMetadata } from "../gateways";
import { Gateway } from "./base";

const CONFIG_SCHEMA = z.object({
	name: z.string().default("PayPal Webscr"),
	buttonLabel: z.string().default("Pay with PayPal WebScr"),
	buttonSort: z.number().default(5),
	email: z.string(),
	handlingFee: z.number().min(0).max(1).default(0.1),
	returnUrl: z.string().optional(),
	cancelUrl: z.string().optional(),
	currency: z.string().default("USD"),
});

type PayPalWebscrConfig = z.infer<typeof CONFIG_SCHEMA>;

export class PayPalWebscrGateway extends Gateway<NonNullable<PayPalWebscrConfig>> {
	public static configShape = CONFIG_SCHEMA;

	private readonly PAYPAL_URL = "https://www.paypal.com/cgi-bin/webscr";

	constructor(config: NonNullable<PayPalWebscrConfig>) {
		super(config);
	}

	get metadata(): GatewayMetadata {
		return {
			id: "paypalwebscr",
			name: this.config.name || "PayPal",
			description: "PayPal email-based payment gateway",
			version: "1.0.0",
			supportsRefresh: false,
		};
	}

	initialize(client: Client): void {}

	async createPayment({ amount, description }: CreatePaymentOptions): Promise<CreatePaymentResult> {
		const total = amount * (1 + this.config.handlingFee);
		const params = new URLSearchParams({
			cmd: "_xclick",
			business: this.config.email,
			currency_code: this.config.currency.toUpperCase(),
			amount: total.toFixed(2),
			item_name: description,
			no_shipping: "1",
			return: this.config.returnUrl || "",
			cancel_return: this.config.cancelUrl || "",
		});

		return {
			url: `${this.PAYPAL_URL}?${params.toString()}`,
			gatewayId: this.metadata.id,
			gatewayReference: new Date().getTime().toString(), // Timestamp as reference since no tracking
		};
	}

	referenceId(req: Request): string {
		return ""; // Not implemented
	}

	async refreshPayment(invoice: Invoice): Promise<string> {
		return "pending"; // Not supported
	}

	async handleWebhook(req: Request) {
		return; // Not implemented
	}

	cancelPayment(invoice: Invoice): Promise<void> {
		return Promise.resolve(); // Not implemented
	}
}
