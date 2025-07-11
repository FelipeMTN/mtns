import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, TextChannel } from "discord.js";
import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import { CLIENT_INSTANCE } from "@classes/Client";
import { TicketManager } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { infoEmbed } from "@util/embeds";
import { genId } from "@util/genId";
import { __ } from "@util/translate";

import Profile from "./Profile";
import UserPreferences from "./UserPreferences";

export enum QuoteStatus {
	Pending,
	Accepted,
	Declined,
	Counteroffered,
}

@Table({
	tableName: "quotes",
	freezeTableName: true,
})
export default class Quote extends Model {
	@PrimaryKey
	@AllowNull(false)
	@Default(() => genId())
	@Column(DataType.STRING(10))
	id!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	commissionId!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	freelancerId!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	incomingQuoteMsg!: string;

	@AllowNull(false)
	@Column(DataType.FLOAT)
	price!: number;

	@Default(QuoteStatus.Pending)
	@Column(DataType.INTEGER)
	status!: QuoteStatus;

	@Column(DataType.TEXT)
	message?: string;

	async sendEmbed() {
		const commission = await TicketManager.fetch({ type: 0, id: this.commissionId });
		if (!commission || !(commission instanceof CommissionTicket)) return;
		const channel = await CLIENT_INSTANCE!.channels.fetch(commission.channelId).catch(() => null);
		if (!channel || !(channel instanceof TextChannel)) return;
		const freelancer = await CLIENT_INSTANCE!.users.fetch(this.freelancerId).catch(() => null);
		if (!freelancer) return;
		const profile = await Profile.getOrCreate(freelancer.id);
		const locale = await UserPreferences.getLanguage(commission.authorId);

		const hasQuotedString = `${freelancer} has quoted **$${this.price.toFixed(2)}**`;

		const fields = [
			`**${__("quoting.quote.field_label_portfolio", { _locale: locale })}:** ${profile.portfolio}`,
			`**${__("quoting.quote.field_label_timezone", { _locale: locale })}:** ${profile.timezone}`,
			`**${__("quoting.quote.field_label_techstack", { _locale: locale })}:** ${profile.stack}`,
			`**${__("quoting.quote.field_label_bio", { _locale: locale })}:** ${profile.bio}`,
		].join("\n");

		const embed = infoEmbed(`${hasQuotedString}\n\n${fields}`)
			.setTitle(__("quoting.quote.title", { _locale: locale }))
			.setThumbnail(freelancer.displayAvatarURL());

		if (this.message) {
			embed.addFields([
				{
					name: `${__("quoting.quote.message_from_freelancer", { _locale: locale })}:`,
					value: `\`\`\`\n${this.message.slice(0, 1024)}\`\`\``,
				},
			]);
		}

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				customId: `respondquote-accept-${this.id}`,
				label: __("quoting.quote.button.accept_label", { _locale: locale, price: this.price.toFixed(2) }),
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: `respondquote-decline-${this.id}`,
				label: __("quoting.quote.button.decline_label", { _locale: locale, price: this.price.toFixed(2) }),
				style: ButtonStyle.Danger,
			}),
			new ButtonBuilder({
				customId: `respondquote-counter-${this.id}`,
				label: __("quoting.quote.button.counteroffer_label", { _locale: locale, price: this.price.toFixed(2) }),
				style: ButtonStyle.Secondary,
			}),
		);

		let content = commission.mentions ? `<@${commission.authorId}>` : undefined;
		return await channel.send({ content, embeds: [embed], components: [row] });
	}

	async updateEmbed() {
		const commission = await TicketManager.fetch({ type: 0, id: this.commissionId });
		if (!commission || !(commission instanceof CommissionTicket)) return;

		const channel = await CLIENT_INSTANCE!.channels.fetch(commission.channelId).catch(() => null);
		if (!channel || !(channel instanceof TextChannel)) return;

		if (!this.incomingQuoteMsg) return;
		await channel.messages.fetch();
		const msg = channel.messages.cache.get(this.incomingQuoteMsg);
		if (!msg) return;

		const locale = await UserPreferences.getLanguage(commission.authorId);

		const embed = EmbedBuilder.from(msg.embeds[0]);

		if (this.status === QuoteStatus.Accepted) {
			embed.setColor(Colors.Green);
			embed.setTitle(`${__("quoting.quote.tag.accepted", { _locale: locale })} ${msg.embeds[0].title}`);
		} else if (this.status === QuoteStatus.Declined) {
			embed.setColor(Colors.Red);
			embed.setTitle(`${__("quoting.quote.tag.declined", { _locale: locale })} ${msg.embeds[0].title}`);
		} else if (this.status === QuoteStatus.Counteroffered) {
			embed.setColor(Colors.Grey);
			embed.setTitle(`${__("quoting.quote.tag.counteroffered", { _locale: locale })} ${msg.embeds[0].title}`);
		}

		return await msg.edit({
			embeds: [embed],
			components: [],
		});
	}
}
