import c from "ansi-colors";
import dayjs from "dayjs";
import { Request } from "express";
import { z } from "zod";

import type Client from "@classes/Client";
import type Invoice from "@classes/Invoice";

import type { CreatePaymentOptions, CreatePaymentResult, GatewayMetadata } from "../gateways";

interface BaseGatewayConfig {
	name: string;
	buttonLabel: string;
	buttonSort: number;
	[key: string]: any;
}

export abstract class Gateway<T extends BaseGatewayConfig = BaseGatewayConfig> {
	public config: T;
	static configShape: z.ZodType;

	protected constructor(config: T) {
		this.config = config;
	}

	taxed(amount: number, taxRate: number): number {
		return amount * (1 + taxRate);
	}

	log(...msg: string[]): void {
		const date = `${c.dim("[" + dayjs().format("DD MMM YYYY HH:mm:ss") + "]")}`;
		console.log(`${date} ${c.blue.italic(`Gateway: ${this.metadata.id.charAt(0).toUpperCase() + this.metadata.id.slice(1)}`)} |`, ...msg);
	}

	abstract get metadata(): GatewayMetadata;

	abstract initialize(client: Client): void;

	abstract referenceId(req: Request): string;

	abstract createPayment(options: CreatePaymentOptions): Promise<CreatePaymentResult>;

	abstract refreshPayment(invoice: Invoice): Promise<string>;

	abstract handleWebhook(req: Request, invoice: Invoice): void;

	abstract cancelPayment(invoice: Invoice): Promise<void>;
}
