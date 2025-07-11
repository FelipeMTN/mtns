import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, Guild, Message, TextChannel, User } from "discord.js";
import { ExecutionError } from "nhandler";
import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import Bank from "@classes/Bank";
import { CLIENT_INSTANCE } from "@classes/Client";
import Profile from "@classes/Profile";
import Transaction from "@classes/Transaction";

import { disableButtons } from "@util/components/disableButtons";
import { errorEmbed, infoEmbed, successEmbed } from "@util/embeds";
import { genId } from "@util/genId";
import { __ } from "@util/translate";

enum Status {
	Pending = "PENDING",
	Complete = "COMPLETE",
	Denied = "DENIED",
}

export { Status as WithdrawalStatus };

const COLORS = {
	[Status.Pending]: Colors.Yellow,
	[Status.Complete]: Colors.Green,
	[Status.Denied]: Colors.Red,
};

@Table({ tableName: "withdrawalrequests", freezeTableName: true })
export default class Withdrawal extends Model {
	client = CLIENT_INSTANCE!;

	@PrimaryKey
	@AllowNull(false)
	@Default(() => genId())
	@Column(DataType.STRING(10))
	id!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	guildId!: string;
	guild: Guild | null = null;

	@AllowNull(false)
	@Column(DataType.TEXT)
	userId!: string;
	user: User | null = null;

	@Column(DataType.TEXT)
	channelId?: string;
	channel: TextChannel | null = null;

	@Column(DataType.TEXT)
	messageId?: string;
	message: Message | null = null;

	@AllowNull(false)
	@Column(DataType.FLOAT)
	amount!: number;

	@AllowNull(false)
	@Default(Status.Pending)
	@Column(DataType.TEXT)
	status!: Status;

	getStatusString(status: Status) {
		if (status === Status.Pending) return `⏲️ ${__("withdrawal.label_pending")}`;
		if (status === Status.Complete) return `✅️ ${__("withdrawal.label_completed")}`;
		if (status === Status.Denied) return `❌ ${__("withdrawal.label_denied")}`;
	}

	constructor(...args: any[]) {
		super(...args);
		this.assignProperties();
	}

	async assignProperties() {
		this.guild = await this.client.guilds.fetch(this.guildId).catch(() => null);
		if (!this.guild) return;

		this.user = await this.client.users.fetch(this.userId).catch(() => null);
		if (!this.user) return;

		this.channel = !this.channelId
			? null
			: await this.guild.channels
					.fetch(this.channelId)
					.then((c) => (c instanceof TextChannel ? c : null))
					.catch(() => null);
		if (!this.channel) return;

		this.message = await this.channel.messages.fetch(this.messageId!).catch(() => null);
	}

	get buttons() {
		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				label: __("withdrawal.button_label.mark_as_complete"),
				style: ButtonStyle.Success,
				emoji: "✅",
				customId: `bank-withdraw-submit-${this.id}`,
			}),
			new ButtonBuilder({
				label: __("withdrawal.button_label.deny"),
				style: ButtonStyle.Secondary,
				customId: `bank-withdraw-deny-${this.id}`,
			}),
		);
	}

	private async createEmbed() {
		const bank = await Bank.getOrCreate(this.userId);
		const fields = [
			{
				name: `${__("withdrawal.field_label_status")}:`,
				value: `**${this.getStatusString(this.status)}**`,
				inline: true,
			},
			{
				name: `${__("withdrawal.field_label_amount")}:`,
				value: `**$${this.amount.toFixed(2)}**${this.amount >= bank.balance ? ` ${__("withdrawal.all_balance_note")}` : ""}`,
				inline: true,
			},
			{
				name: `${__("withdrawal.field_label_current_balance")}:`,
				value: `$${bank.balance.toFixed(2)}`,
				inline: true,
			},
			{
				name: `${__("withdrawal.field_label_balance_after")}:`,
				value: `$${(bank.balance - this.amount).toFixed(2)}`,
				inline: true,
			},
		];

		const profile = await Profile.getOrCreate(this.user!.id);
		if (profile.paypalEmail) {
			fields.push({
				name: `${__("withdrawal.field_label_paypal_email")}:`,
				value: profile.paypalEmail,
				inline: true,
			});
		}

		return infoEmbed()
			.addFields(fields)
			.setAuthor({
				name: __("withdrawal.embed_title", { username: this.user!.username, mention: this.user!.toString() }),
			});
	}

	private async deductFromBank() {
		const bank = await Bank.getOrCreate(this.userId);
		bank.balance -= this.amount;
		await bank.save();
		await Transaction.create({
			type: "WITHDRAWAL_REQUEST",
			userId: this.userId,
			amount: -this.amount,
			note: __("withdrawal.completed.transaction_note", { id: this.id }),
		});
	}

	async markAsComplete() {
		this.status = Status.Complete;
		await this.save();

		await this.deductFromBank();

		const embed = successEmbed(
			__("withdrawal.completed.dm_notification", {
				id: this.id,
				amount: this.amount.toFixed(2),
			}),
		).setTitle(__("withdrawal.completed.dm_notification.title"));

		if (this.user) {
			const dm = await this.user.createDM().catch(() => null);
			if (dm) dm.send({ embeds: [embed] });
		}
	}

	async markAsDenied() {
		this.status = Status.Denied;
		await this.save();

		const embed = errorEmbed(
			__("withdrawal.denied.dm_notification", {
				id: this.id,
			}),
		).setTitle(__("withdrawal.denied.dm_notification.title"));

		if (this.user) {
			const dm = await this.user.createDM().catch(() => null);
			if (dm) dm.send({ embeds: [embed] });
		}
	}

	async send(channel: TextChannel) {
		if (!this.user) return;
		const embed = await this.createEmbed();

		const msg = await channel.send({ embeds: [embed], components: [this.buttons] });
		this.channelId = channel.id;
		this.messageId = msg.id;
		this.channel = channel;
		this.message = msg;
		await this.save();

		return msg;
	}

	async updateLog() {
		if (!this.channel || !this.message || !this.user)
			throw new ExecutionError(__("withdrawal.errors.invalid_withdrawal"));
		await this.channel.messages.fetch().catch(() => null);
		const embed = successEmbed().setAuthor({
			name: __("withdrawal.embed_title", { username: this.user.username, mention: this.user.toString() }),
		});
		embed.setColor(COLORS[this.status]);
		embed.addFields([
			{ name: `${__("withdrawal.field_label_status")}:`, value: `**${this.getStatusString(this.status)}**` },
			...this.message.embeds[0].fields.filter((f) => f.name !== `${__("withdrawal.field_label_status")}:`),
		]);
		this.message.edit({ embeds: [embed], components: disableButtons(this.message.components) });
	}
}
