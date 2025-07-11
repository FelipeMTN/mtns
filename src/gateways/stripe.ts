import { Request } from "express";
import Stripe from "stripe";
import { z } from "zod";

import type Invoice from "@classes/Invoice";

import { PaymentNotificationType } from "@util/paymentNotificationType";

import { CreatePaymentOptions, CreatePaymentResult, GatewayMetadata } from "../gateways";
import { Gateway } from "./base";

const configSchema = z.object({
	name: z.string().default("Stripe"),
	buttonLabel: z.string().default("Pay with stripe"),
	buttonSort: z.number().default(10),
	useSandbox: z.boolean().default(false),
	publishableKey: z.string(),
	secretKey: z.string(),
	handlingFee: z.number().min(0).max(1).default(0.1),
	currency: z.string().default("USD"),
	paymentNotifications: z
		.object({
			type: z.nativeEnum(PaymentNotificationType).default(PaymentNotificationType.Polling),
			webhookSigningSecret: z.string().optional(),
		})
		.default({ type: PaymentNotificationType.Polling }),
});

type StripeConfig = z.infer<typeof configSchema>;

export class StripeGateway extends Gateway<NonNullable<StripeConfig>> {
	public static configShape = configSchema;
	private stripe: Stripe;

	constructor(config: NonNullable<StripeConfig>) {
		super(config);
		this.stripe = new Stripe(config.secretKey, {
			apiVersion: "2024-12-18.acacia",
		});
	}

	initialize() {}

	get metadata(): GatewayMetadata {
		return {
			id: "stripe",
			name: this.config.name || "Stripe",
			description: "Stripe payment gateway",
			version: "1.0.0",
			supportsRefresh: true,
		};
	}

	async createPayment({ amount, title, description }: CreatePaymentOptions): Promise<CreatePaymentResult> {
		const session = await this.stripe.checkout.sessions.create({
			line_items: [
				{
					price_data: {
						currency: this.config.currency.toLowerCase(),
						unit_amount: Math.round(amount * 100),
						product_data: {
							name: title || "Payment",
							description: description,
						},
					},
					quantity: 1,
				},
			],
			mode: "payment",
			success_url: "https://stripe.nortexdev.com",
			cancel_url: "https://stripe.nortexdev.com",
		});

		return {
			url: session.url || "",
			gatewayId: this.metadata.id,
			gatewayReference: session.id,
		};
	}

	async refreshPayment(invoice: Invoice): Promise<string> {
		return new Promise<string>(async (resolve, reject) => {
			try {
				if (!invoice.gatewayReference) {
					reject(new Error("Trying to refresh a stripe payment but the invoice entity is missing gateway reference"));
					return;
				}
				const session = await this.stripe.checkout.sessions.retrieve(invoice.gatewayReference);

				switch (session.payment_status) {
					case "paid":
						invoice.events.emit("paid", {
							invoice,
							amountReceived: this.taxed(invoice.amount, this.config.handlingFee),
							currency: this.config.currency,
						});
						resolve("paid");
						break;
					case "unpaid":
						resolve("unpaid");
						break;
					default:
						resolve("pending");
				}
			} catch (err: any) {
				this.log(`Failed to refresh Stripe invoice: ${err.message}`);
				reject(new Error("Invoice update failed"));
			}
		});
	}

	verify(stripeSig: string, rawBody: any): Stripe.Event | null {
		const webhookSecret = this.config.paymentNotifications.webhookSigningSecret;

		if (!webhookSecret) {
			this.log("Stripe webhook signing secret is not set");
			return null;
		}

		try {
			return this.stripe.webhooks.constructEvent(rawBody, stripeSig, webhookSecret);
		} catch (err: any) {
			this.log(`Webhook signature verification failed: ${err.message}`);
			return null;
		}
	}

	referenceId(req: Request): string {
		try {
			const body = JSON.parse(req.body.toString("utf8"));
			return body.data.object.id;
		} catch (err: any) {
			this.log(`Failed to parse reference ID: ${err.message}`);
			throw new Error("Invalid webhook payload");
		}
	}

	async handleWebhook(req: Request, invoice: Invoice) {
		if (this.config.paymentNotifications.type !== PaymentNotificationType.Webhook) return;

		const event = this.verify(req.headers["stripe-signature"] as string, req.body);

		if (!event) {
			this.log("Invalid webhook signature");
			return;
		}

		switch (event.type) {
			case "checkout.session.completed":
				const session = event.data.object as Stripe.Checkout.Session;

				if (session.payment_status === "paid") {
					invoice.events.emit("paid", {
						invoice,
						amountReceived: this.taxed(invoice.amount, this.config.handlingFee),
						currency: this.config.currency,
					});
				}
				break;
			default:
				this.log(`Unhandled event type ${event.type}`);
		}
	}

	public cancelPayment(invoice: Invoice): Promise<void> {
		return new Promise<void>(async (resolve, reject) => {
			if (!invoice.gatewayReference) return resolve();
			this.log("Sending a cancel request on Stripe invoice:", invoice.gatewayReference);
			this.stripe.checkout.sessions
				.expire(invoice.gatewayReference)
				.then(() => {
					resolve();
				})
				.catch((err) => {
					this.log(err);
					reject(new Error("Invoice cancellation failed"));
				});
		});
	}
}
