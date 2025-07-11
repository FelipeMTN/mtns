import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, Guild, TextChannel } from "discord.js";
import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import { infoEmbed } from "@util/embeds";
import { genId } from "@util/genId";
import { __ } from "@util/translate";

import Settings from "./Settings";

@Table({
	tableName: "reviews",
	freezeTableName: true,
})
export default class Review extends Model {
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
	guildId!: string;
	guild!: Guild;

	@AllowNull(false)
	@Column(DataType.TEXT)
	userId!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	freelancerId!: string;

	@AllowNull(false)
	@Column(DataType.INTEGER)
	rating!: number;

	@AllowNull(false)
	@Column(DataType.TEXT)
	message!: string;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	anonymous!: boolean;

	static reviewButtons(commissionId: string) {
		let btns = [];
		for (let i = 1; i <= 5; i++) {
			btns.push(
				new ButtonBuilder({
					label: "⭐".repeat(i),
					customId: `complete-review-${commissionId}-${i}`,
					style: ButtonStyle.Secondary,
				}),
			);
		}
		return new ActionRowBuilder<ButtonBuilder>().addComponents(btns);
	}

	async send(guild: Guild): Promise<void> {
		const settings = await Settings.getOrCreate(guild.id);
		if (!settings.reviewChannel) return;
		const reviewChannel = await guild.channels.fetch(settings.reviewChannel).catch(() => {});
		if (!reviewChannel || !(reviewChannel instanceof TextChannel)) return;
		const freelancer = await guild.members.fetch(this.freelancerId).catch(() => null);
		if (!freelancer) return;
		await reviewChannel.send({
			embeds: [
				infoEmbed()
					.setColor(Colors.Blurple)
					.addFields([
						{ name: __("review.field_label_freelancer"), value: `<@${this.freelancerId}>`, inline: true },
						{
							name: __("review.field_label_customer"),
							value: this.anonymous ? __("review.anonymous") : `<@${this.userId}>`,
							inline: true,
						},
						{
							name: __("review.field_label_rating"),
							value: `${"⭐".repeat(this.rating)} ${this.rating}`,
							inline: true,
						},
						{ name: __("review.field_label_message"), value: `\`\`\`\n${this.message}\`\`\`` },
					])
					.setTitle(__("review.title"))
					.setFooter({ text: __("review.footer", { id: this.id }) })
					.setThumbnail(freelancer.displayAvatarURL()),
			],
		});
	}
}
