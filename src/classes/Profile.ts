import { User } from "discord.js";
import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import { CLIENT_INSTANCE } from "@classes/Client";
import Review from "@classes/Review";
import Ticket from "@classes/Ticket";

import { infoEmbed } from "@util/embeds";
import { genId } from "@util/genId";
import { __ } from "@util/translate";

@Table({
	tableName: "profiles",
	freezeTableName: true,
})
export default class Profile extends Model {
	client = CLIENT_INSTANCE!;

	@PrimaryKey
	@AllowNull(false)
	@Default(() => genId())
	@Column(DataType.STRING(10))
	id!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	userId!: string;

	@Default("Empty bio.")
	@Column(DataType.TEXT)
	bio!: string;

	@Default("No portfolio")
	@Column(DataType.TEXT)
	portfolio!: string;

	@Default("Unset")
	@Column(DataType.TEXT)
	timezone!: string;

	@Default("Unset")
	@Column(DataType.TEXT)
	stack!: string;

	@Column(DataType.TEXT)
	paypalEmail?: string;

	static async getOrCreate(userId: string) {
		let profile = await Profile.findOne({ where: { userId } });
		if (!profile) profile = await Profile.create({ userId });
		return profile;
	}

	async createEmbed(user: User, locale: string) {
		const reviews = await Review.findAll({ where: { freelancerId: user.id } });
		const completedTickets = await Ticket.count({ where: { type: 0, freelancerId: user.id, complete: true } });

		const averageReviews = reviews.reduce((acc, cur) => acc + cur.rating, 0) / reviews.length;

		const embed = infoEmbed(this.bio);
		embed.setTitle(
			__("profile.embed.title", { _locale: locale, username: user.username, mention: user.toString() }),
		);

		if (this.portfolio !== "No portfolio")
			embed.addFields({
				name: __("profile.embed.field_label_portfolio", { _locale: locale }),
				value: this.portfolio || "empty",
				inline: true,
			});
		if (this.timezone !== "Unset")
			embed.addFields({
				name: __("profile.embed.field_label_timezone", { _locale: locale }),
				value: `UTC ${this.timezone}`,
				inline: true,
			});
		if (this.stack !== "Unset")
			embed.addFields({
				name: __("profile.embed.field_label_techstack", { _locale: locale }),
				value: `${this.stack}`,
				inline: true,
			});
		embed.addFields({
			name: __("profile.embed.field_label_completed_commissions", { _locale: locale }),
			value: `${completedTickets}`,
			inline: true,
		});
		embed.addFields({
			name: __("profile.embed.field_label_freelancer_since", { _locale: locale }),
			value: `<t:${Math.floor(this.createdAt / 1000)}:R>`,
			inline: true,
		});

		if (reviews.length) {
			embed.addFields({
				name: __("profile.embed.field_label_reviews_average", { _locale: locale }),
				value: `${"⭐".repeat(Math.round(averageReviews))} ${averageReviews.toFixed(1)}`,
				inline: true,
			});
		}
		embed.setThumbnail(user.displayAvatarURL());
		if (this.client.config.tickets.profiles.displayTip) {
			embed.setFooter({ text: __("profile.embed.tip", { _locale: locale }) });
		}
		return embed;
	}
}
