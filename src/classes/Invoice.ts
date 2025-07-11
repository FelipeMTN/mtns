import EventEmitter from "node:events";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, Message, TextChannel } from "discord.js";
import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import Client, { CLIENT_INSTANCE } from "@classes/Client";
import Settings from "@classes/Settings";
import { TicketManager } from "@classes/TicketManager";

import { getCurrencySymbol } from "@util/currencies";
import { errorEmbed, infoEmbed, successEmbed, warnEmbed } from "@util/embeds";
import { genId } from "@util/genId";
import { __ } from "@util/translate";

import { Gateway } from "../gateways/base";

@Table({
	tableName: "invoices",
	freezeTableName: true,
})
export default class Invoice extends Model {
	client: Client = CLIENT_INSTANCE!;
	events = new EventEmitter();

	@PrimaryKey
	@AllowNull(false)
	@Default(() => genId())
	@Column(DataType.STRING(10))
	id!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	userId!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	ticketId!: string;

	@Column(DataType.TEXT)
	invoiceMsgChannelId?: string | null;

	@Column(DataType.TEXT)
	invoiceMsgId?: string | null;

	@AllowNull(false)
	@Column(DataType.FLOAT)
	amount!: number;

	@Column(DataType.FLOAT)
	tax!: number;

	@Column(DataType.TEXT)
	gatewayId?: string | null; // By default "paypal" "coinbase" "stripe"

	@Column(DataType.TEXT)
	gatewayReference?: string | null; // Gateway's checkout ID

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	paid!: boolean;

	@AllowNull(false)
	@Default(0)
	@Column(DataType.FLOAT)
	paidAmount!: number;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	manual!: boolean;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	started!: boolean;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	cancelled!: boolean;

	@AllowNull(true)
	@Column(DataType.TEXT)
	paymentUrl!: string | null;

	locale: string = "en-US";

	public get gateway() {
		return this.client.gateways.find((g) => g.metadata.id === this.gatewayId!);
	}

	constructor(...args: any[]) {
		super(...args);

		this.events.on("crypto_pending", async ({ invoice }: { invoice: Invoice }) => {
			const channel = await invoice.fetchChannel();
			if (!channel) return;
			invoice.sendUpdate({
				msg: __("invoice.update.unverified_charge_made"),
				type: "info",
				channel: channel,
			});
		});

		this.events.on("partially_paid", async ({ invoice, amountReceived, currency }: { invoice: Invoice; amountReceived: number; currency: string }) => {
			invoice.paidAmount = amountReceived;
			await invoice.save();

			const channel = await invoice.fetchChannel();
			if (!channel) return;

			const paidSoFar = amountReceived.toFixed(2);
			const total = (invoice.amount + invoice.amount * invoice.tax).toFixed(2);
			invoice.sendUpdate({
				msg: __("invoice.update.partially_paid", {
					symbol: getCurrencySymbol(currency),
					paid_amount: paidSoFar,
					total: total,
				}),
				type: "warn",
				channel: channel,
			});

			await invoice.updateInvoiceEmbed();
		});

		this.events.on("paid", async ({ invoice, amountReceived, currency }: { invoice: Invoice; amountReceived: number; currency: string }) => {
			invoice.paidAmount = amountReceived;
			invoice.paid = true;
			await invoice.save();

			const channel = await invoice.fetchChannel();
			if (!channel) return;

			invoice.sendUpdate({
				msg: __("invoice.update.fully_paid", {
					symbol: getCurrencySymbol(currency),
					total: amountReceived.toFixed(2),
				}),
				type: "success",
				channel: channel,
			});

			await invoice.updateInvoiceEmbed();

			await this.grantClientRole(channel, invoice);
		});
	}

	private async grantClientRole(channel: TextChannel, invoice: Invoice) {
		const settings = await Settings.getOrCreate(channel.guild.id);
		if (settings.clientRole) {
			const guild = invoice.client.guilds.cache.get(channel.guild.id);
			if (!guild) return;
			const clientRole = await guild.roles.fetch(settings.clientRole);
			if (!clientRole) return;
			const member = await channel.guild.members.fetch(invoice.userId);
			if (!member) return;
			member.roles.add(clientRole);
		}
	}

	async createPayment(
		gateway: Gateway,
		{
			amount,
			title,
			description,
		}: {
			amount: number;
			title: string;
			description: string;
		},
	) {
		const creationResult = await gateway.createPayment({
			amount,
			title,
			description,
		});

		this.started = true;
		this.paymentUrl = creationResult.url;
		this.tax = gateway.config.handlingFee;
		this.gatewayId = gateway.metadata.id;
		this.gatewayReference = creationResult.gatewayReference;
		await this.save();

		await this.updateInvoiceEmbed();

		return creationResult;
	}

	// ---- Webhook Payment Updates ----
	async sendUpdate({ msg, type, channel }: { msg: string; type?: "info" | "success" | "error" | "warn"; channel?: TextChannel }): Promise<Message | void> {
		if (!channel) return;
		if (!type) type = "info";
		let embedFn: any;
		if (type === "info") embedFn = infoEmbed;
		if (type === "success") embedFn = successEmbed;
		if (type === "error") embedFn = errorEmbed;
		if (type === "warn") embedFn = warnEmbed;
		return channel.send({
			embeds: [embedFn(msg)],
		});
	}

	async fetchChannel(): Promise<TextChannel | null> {
		const channelId = await this.getChannelId();
		if (!channelId) return null;
		const channel = await this.client.channels.fetch(channelId).catch(() => null);
		if (!channel || !(channel instanceof TextChannel)) {
			return null;
		}
		return channel;
	}

	private async getChannelId() {
		if (this.invoiceMsgChannelId) {
			return this.invoiceMsgChannelId;
		} else {
			const ticket = await TicketManager.fetch({
				invoiceId: this.id,
			});
			if (!ticket) {
				return null;
			}
			return ticket.channelId;
		}
	}

	private get totals() {
		return this.client.gateways.map((gateway) => {
			const fee = gateway.config.handlingFee ?? 0.1;
			return {
				name: gateway.config.name || gateway.metadata.name,
				fee: fee === 0 ? null : `${fee * 100}% ${__("invoice.handling_fee").toLowerCase()}`,
				total: `${getCurrencySymbol(gateway.config.currency)}${(this.amount * (1 + fee)).toFixed(2)}`,
			};
		});
	}

	private get buttons() {
		return this.client.gateways
			.sort((g1, g2) => g1.config.buttonSort - g2.config.buttonSort)
			.map((gateway) =>
				new ButtonBuilder()
					.setCustomId(`generateinvoice-${gateway.metadata.id}-${this.id}`)
					.setLabel(gateway.config.buttonLabel || `Pay with ${gateway.config.buttonLabel || gateway.metadata.name}`)
					.setStyle(ButtonStyle.Primary),
			);
	}

	async updateInvoiceEmbed(): Promise<void> {
		let data: { embeds: EmbedBuilder[]; components?: any[] };

		let curr = this.client.gateways[0].config.currency; // TODO Maybe this should be global instead.
		const formattedPrice = `${getCurrencySymbol(curr)}${this.amount.toFixed(2)}`;
		const formattedHandlingFee = `${getCurrencySymbol(curr)}${(this.amount * this.tax).toFixed(2)}`;
		const formattedHandlingFeePercentage = `${this.tax * 100}%`;
		const formattedPaid = `${getCurrencySymbol(curr)}${this.paidAmount.toFixed(2)}`;
		const formattedTotal = `**${getCurrencySymbol(curr)}${(this.amount + this.amount * this.tax).toFixed(2)}**`;

		if (this.cancelled) {
			// Handle cancelled invoices.
			const fields = [];
			fields.push({ name: __("invoice.amount"), value: formattedPrice, inline: true });
			if (this.tax !== 0) {
				fields.push({
					name: `${__("invoice.handling_fee")} (${formattedHandlingFeePercentage})`,
					value: formattedHandlingFee,
					inline: true,
				});
			}
			fields.push({ name: __("invoice.total"), value: formattedTotal, inline: true });
			fields.push({ name: __("invoice.status"), value: `❌ **${__("invoice.cancelled")}**`, inline: true });

			const invoiceEmbed = errorEmbed(
				__("invoice.invoice_for_price", {
					price: formattedPrice,
					currency: (curr || "USD").toUpperCase(),
				}),
			)
				.addFields(fields)
				.setTitle(`${__("invoice.invoice_title")} #${this.id}`);

			data = { embeds: [invoiceEmbed], components: [] };

			this.updateOrSendInvoiceEmbed(data);
			return;
		}

		if (!this.cancelled && !this.started) {
			// Handle non-cancelled, non-started invoices.
			const methodsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(...this.buttons);

			const embed = infoEmbed(`${__("invoice.invoice_for_price", { price: formattedPrice, currency: (curr || "USD").toUpperCase() })}\n${__("invoice.invoice_description")}`);
			embed.setTitle(`${__("invoice.invoice_title")} #${this.id}`);
			embed.addFields(
				this.totals.map(({ name, fee, total }) => ({
					name: `${name}:`,
					value: fee === null ? `**${total}**` : `${formattedPrice} (+${fee}) = **${total}**`,
					inline: false,
				})),
			);

			data = { embeds: [embed], components: [methodsRow] };
			await this.updateOrSendInvoiceEmbed(data);
			return;
		}

		if (this.started) {
			const statusText = `${this.paid ? "✅ " : ""}**${formattedPaid}** / ${formattedTotal} ${__("invoice.paid_text")}`;
			// Handle non-cancelled, started invoices awaiting payment.
			const fields = [];
			fields.push({ name: __("invoice.amount"), value: formattedPrice, inline: true });
			if (this.tax !== 0) {
				fields.push({
					name: `${__("invoice.handling_fee")} (${formattedHandlingFeePercentage})`,
					value: formattedHandlingFee,
					inline: true,
				});
			}
			fields.push({ name: __("invoice.total"), value: formattedTotal, inline: true });
			fields.push({ name: __("invoice.status"), value: statusText, inline: false });

			const embed = infoEmbed(`${__("invoice.invoice_for_price", { price: formattedPrice, currency: (curr || "USD").toUpperCase() })}\n${__("invoice.invoice_description")}`);
			embed.setTitle(`${__("invoice.invoice_title")} #${this.id}${this.paid ? ` ${__("invoice.paid_tag")}` : ""}`);
			embed.addFields(fields);

			data = { embeds: [embed], components: undefined };

			if (this.paymentUrl) {
				data.components = [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(__("invoice.view_in_browser_label")).setURL(this.paymentUrl))];
			}

			if (this.paid) {
				embed.setColor(Colors.Green);
				data.components = []; // Remove buttons if fully paid
			}

			this.updateOrSendInvoiceEmbed(data);
			return;
		}
	}

	refreshProperties() {
		if (!this.gateway) return;
		return this.gateway.refreshPayment(this);
	}

	private async updateOrSendInvoiceEmbed(data: { embeds: EmbedBuilder[]; components?: any[] }) {
		if (this.invoiceMsgId && this.invoiceMsgChannelId) {
			// Try to edit the existing message (send as fallback).
			const channel = await this.fetchChannel();
			if (!channel) return;
			let msg = await channel.messages.fetch(this.invoiceMsgId).catch(() => null);
			if (!msg) {
				const newMsg = await channel.send(data);
				this.invoiceMsgId = newMsg.id;
				await this.save();
			} else {
				await msg.edit(data);
			}
		} else {
			// Send a new message.
			const channel = await this.fetchChannel();
			if (!channel) return;
			const msg = await channel.send(data);
			this.invoiceMsgId = msg.id;
			this.invoiceMsgChannelId = msg.channel.id;
			await this.save();
		}
	}

	markPaid(): Promise<void> {
		return new Promise<void>(async (res, rej) => {
			if (this.paid) return rej(new Error("Invoice is already paid."));
			this.started = true;
			this.paid = true;
			this.paidAmount = this.amount + this.amount * this.tax;
			await this.save();
			res();
		});
	}

	static getActive(id: string, options?: { includeUnpaid?: boolean; additionalWhere?: any }) {
		return Invoice.findOne({
			where: {
				id: id,
				paid: options?.includeUnpaid ? null : false,
				cancelled: false,
				...options?.additionalWhere,
			},
		});
	}

	get link() {
		return `https://discord.com/channels/${this.client.config.main.guilds[0]}/${this.invoiceMsgChannelId}/${this.invoiceMsgId}`;
	}
}
