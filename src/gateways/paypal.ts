import axios from "axios";
import { Request } from "express";
import { z } from "zod";

import type Client from "@classes/Client";
import type Invoice from "@classes/Invoice";

import { PaymentNotificationType } from "@util/paymentNotificationType";

import type { CreatePaymentOptions, CreatePaymentResult, GatewayMetadata } from "../gateways";
import { Gateway } from "./base";

type WebhookHeaders = {
	"paypal-auth-algo": string;
	"paypal-cert-url": string;
	"paypal-transmission-id": string;
	"paypal-transmission-sig": string;
	"paypal-transmission-time": string;
};

const CONFIG_SCHEMA = z.object({
	name: z.string().default("PayPal"),
	buttonLabel: z.string().default("Pay with PayPal"),
	buttonSort: z.number().default(0),
	useSandbox: z.boolean().default(false),
	clientId: z.string(),
	clientSecret: z.string(),
	merchantName: z.string(),
	merchantEmail: z.string(),
	enablePartialPayments: z.boolean().default(true),
	minimumDuePercentage: z.number().min(0).max(100).default(50),
	handlingFee: z.number().min(0).max(1).default(0.1),
	currency: z.string().default("USD"),
	paymentNotifications: z
		.object({
			type: z.nativeEnum(PaymentNotificationType).default(PaymentNotificationType.Polling),
			webhookId: z.string().optional(),
		})
		.default({ type: PaymentNotificationType.Polling }),
});

type PayPalConfig = z.infer<typeof CONFIG_SCHEMA>;

export class PayPalGateway extends Gateway<NonNullable<PayPalConfig>> {
	// Zod Shape for validating this gateway's config.
	public static configShape = CONFIG_SCHEMA;
	private readonly LIVE_URL = "https://api-m.paypal.com";
	private readonly SANDBOX_URL = "https://api-m.sandbox.paypal.com";

	// Extension metadata
	get metadata(): GatewayMetadata {
		return {
			id: "paypal",
			name: this.config.name || "PayPal",
			description: "PayPal payment gateway",
			version: "1.0.0",
			supportsRefresh: true,
		};
	}

	// Private util methods
	private get apiUrl() {
		return this.config.useSandbox ? this.SANDBOX_URL : this.LIVE_URL;
	}

	private get mode() {
		return this.config.useSandbox ? "Sandbox" : "Live";
	}

	protected static auth(clientId: string, clientSecret: string) {
		return "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64");
	}

	private get headers() {
		return {
			Authorization: PayPalGateway.auth(this.config.clientId, this.config.clientSecret),
			"Content-Type": "application/json",
		};
	}

	/**
	 * Initialize method is called after the extension is fully loaded.
	 *
	 * @param client {Discord.Client}
	 * */
	initialize(client: Client) {
		// Test credentials
		axios
			.get(`${this.apiUrl}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, { headers: this.headers })
			.then(() => {
				this.log(`PayPal credentials are valid. Using ${this.mode} mode.`);
			})
			.catch(() => {
				this.log([`PayPal credentials are invalid. PayPal support will be disabled.`, `Check the credentials and your mode: currently using ${this.mode} mode.`].join("\n"));
			});
	}

	async createPayment({ amount, title, description }: CreatePaymentOptions): Promise<CreatePaymentResult> {
		const { data: genNumberData } = await axios({
			url: `${this.apiUrl}/v2/invoicing/generate-next-invoice-number`,
			method: "POST",
			headers: this.headers,
		});

		const invoiceData = {
			detail: {
				invoice_number: genNumberData.invoice_number,
				currency_code: this.config.currency.toUpperCase(),
				note: description,
				memo: description,
			},
			items: [
				{
					name: title || "Payment",
					description,
					quantity: "1",
					unit_amount: {
						currency_code: this.config.currency.toUpperCase(),
						value: amount.toFixed(2),
					},
					tax: this.config.handlingFee ? { name: "Handling Fee", percent: `${(this.config.handlingFee * 100).toFixed(2)}` } : undefined,
				},
			],
			configuration: {
				allow_tip: false,
				partial_payment: {
					allow_partial_payment: this.config.enablePartialPayments,
					minimum_amount_due: this.config.enablePartialPayments
						? {
								currency_code: this.config.currency.toUpperCase(),
								value: `${((amount * (this.config.minimumDuePercentage || 100)) / 100).toFixed(2)}`,
							}
						: undefined,
				},
			},
		};

		const res = await axios.post(`${this.apiUrl}/v2/invoicing/invoices`, invoiceData, {
			headers: { ...this.headers, Prefer: "return=representation" },
		});

		const sendRes = await axios.post(res.data.links[1].href, { send_to_recipient: false }, { headers: this.headers });

		return {
			url: sendRes.data.href,
			gatewayId: this.metadata.id,
			gatewayReference: res.data.id,
		};
	}

	async refreshPayment(invoice: Invoice): Promise<string> {
		return new Promise<string>(async (resolve, reject) => {
			axios
				.get(`${this.apiUrl}/v2/invoicing/invoices/${invoice.gatewayReference}`, { headers: this.headers })
				.then(async (res) => {
					const status = res.data.status;

					if (status === "PARTIALLY_PAID") {
						const psf = parseFloat(res.data.payments.paid_amount.value);
						if (psf <= invoice.paidAmount) return; // Don't emit event for partial payments with lesser paid amount than saved.
						invoice.events.emit("partially_paid", {
							invoice,
							amountReceived: psf,
							currency: this.config.currency,
						});
					}
					if (status === "MARKED_AS_PAID" || status === "PAID") {
						invoice.events.emit("paid", {
							invoice,
							amountReceived: this.taxed(invoice.amount, this.config.handlingFee),
							currency: this.config.currency,
						});
					}

					if (status === "CANCELLED") {
						invoice.cancelled = true;
						invoice.updateInvoiceEmbed();
					}

					await invoice.save();
					resolve(status);
				})
				.catch((err) => {
					this.log(err.response?.data || err.message);
					reject(new Error("Invoice update failed. Response data shown above."));
				});
		});
	}

	verify({ headers, webhookId, eventId, invoiceId, body }: { headers: WebhookHeaders; webhookId: string; eventId: string; invoiceId: string; body: any }) {
		return new Promise(async (res) => {
			if (!webhookId) {
				this.log(`[PAYPAL] Received payment without webhook ID in the config! Please immediately set the 'gateways.paypal.webhookId' value according to your app inside 'https://developer.paypal.com/developer/applications' to accept payments.`);
			}
			this.log("Verifying paypal invoice payment using webhook ID:", webhookId);
			const data = {
				auth_algo: headers["paypal-auth-algo"],
				cert_url: headers["paypal-cert-url"],
				transmission_id: headers["paypal-transmission-id"],
				transmission_sig: headers["paypal-transmission-sig"],
				transmission_time: headers["paypal-transmission-time"],
				webhook_id: webhookId,
				webhook_event: body,
			};
			await axios
				.post(`${this.apiUrl}/v1/notifications/verify-webhook-signature`, data, {
					headers: { Authorization: PayPalGateway.auth(this.config.clientId, this.config.clientSecret) },
				})
				.then(({ data: verification }) => {
					if (verification["verification_status"] !== "SUCCESS") {
						this.log(`[PAYPAL] Captured unauthentic webhook event: ${eventId} (Invoice ID: ${invoiceId}). Ignoring.`);
						return res(false);
					}
					res(true);
				})
				.catch((e) => {
					this.log(`[PAYPAL] Failed webhook verification for WH event: ${eventId} (Invoice ID: ${invoiceId}). Ignoring.`, e);
					res(false);
				});
		});
	}

	/**
	 * The database stores the ID returned from this method as the gateway reference ID.
	 * It should be fetched from the raw request body to ensure proper function.
	 *
	 * @param req {Request}
	 * */
	referenceId(req: Request) {
		return req.body.resource.invoice.id;
	}

	async handleWebhook(req: Request, invoice: Invoice) {
		if (this.config.paymentNotifications.type !== PaymentNotificationType.Webhook) return;

		if (!this.config.paymentNotifications.webhookId) {
			this.log(`[PAYPAL] Webhook ID is not set. Please set it in your config.`);
			return;
		}

		const paypalInvoice = req.body.resource.invoice;

		if (req.body.event_type !== "INVOICING.INVOICE.PAID") {
			this.log(`[PAYPAL] Processed untracked event: ${req.body.event_type}.`);
			return;
		}

		const verification = await this.verify({
			headers: req.headers as WebhookHeaders,
			webhookId: this.config.paymentNotifications.webhookId,
			eventId: req.body.id,
			invoiceId: paypalInvoice.id,
			body: req.body,
		});

		if (!verification) {
			this.log(`[PAYPAL] Failed webhook verification for WH event: ${req.body.id} (Invoice ID: ${paypalInvoice.id}). Ignoring.`);
			return;
		}

		if (paypalInvoice.status === "PAID") {
			invoice.events.emit("paid", {
				invoice,
				amountReceived: this.taxed(invoice.amount, this.config.handlingFee),
				currency: this.config.currency,
			});
		} else if (paypalInvoice.status === "PARTIALLY_PAID") {
			invoice.events.emit("partially_paid", {
				invoice,
				amountReceived: parseFloat(paypalInvoice.payments.paid_amount.value),
				currency: this.config.currency,
			});
		} else {
			this.log(`[PAYPAL] Ignoring status ${req.body.resource.status} for paid invoice.`);
		}
		return;
	}

	public cancelPayment(invoice: Invoice): Promise<void> {
		return new Promise<void>(async (resolve, reject) => {
			if (!invoice.gatewayReference) return resolve();
			this.log("Sending a cancel request on PayPal invoice:", invoice.gatewayReference);
			axios
				.post(`${this.apiUrl}/v2/invoicing/invoices/${invoice.gatewayReference}/cancel`, {}, { headers: this.headers })
				.then((res) => {
					resolve();
				})
				.catch((err) => {
					this.log(err.response?.data || err.message);
					reject(new Error("Invoice cancellation failed. Response data shown above."));
				});
		});
	}
}
