import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
} from "discord.js";

import Review from "@classes/Review";

import { BaseCommand } from "@util/baseInterfaces";
import { disableButtons } from "@util/components/disableButtons";
import { errorEmbed, infoEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class ReviewsCommand extends BaseCommand {
	name = "reviews";
	description = "View all the reviews of a freelancer.";
	metadata = {
		category: "Profiles",
	};
	options = [
		{
			type: ApplicationCommandOptionType.User,
			name: "freelancer",
			description: "The freelancer to view the reviews of.",
			required: true,
		},
	];

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const freelancer = interaction.options.getUser("freelancer", true);
		const allReviews = await Review.findAll({
			where: { freelancerId: freelancer.id },
			order: [["createdAt", "DESC"]],
		});
		if (!allReviews.length) {
			interaction.reply({
				embeds: [
					errorEmbed(
						__("commands.reviews.no_reviews", {
							username: freelancer.username,
							mention: freelancer.toString(),
							_locale: interaction.locale,
						}),
					),
				],

				ephemeral: true,
			});
			return;
		}
		const allTotalStars = allReviews.reduce((acc, r) => acc + r.rating, 0);
		const averageStars = allTotalStars / allReviews.length;
		let page = 1;
		const perPage = this.client.config.tickets.reviews.amountPerPage || 10;
		const collector = interaction.channel!.createMessageComponentCollector({
			filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith("reviewslist"),
			time: 30000,
		});

		const genButtons = (firstDisabled: boolean, secondDisabled: boolean) => {
			return new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder({
					style: ButtonStyle.Secondary,
					customId: "reviewslist-first",
					emoji: "↖️",
					disabled: firstDisabled,
				}),
				new ButtonBuilder({
					style: ButtonStyle.Secondary,
					customId: "reviewslist-back",
					emoji: "◀️",
					disabled: firstDisabled,
				}),
				new ButtonBuilder({
					style: ButtonStyle.Secondary,
					customId: "reviewslist-forward",
					emoji: "▶️",
					disabled: secondDisabled,
				}),
				new ButtonBuilder({
					style: ButtonStyle.Secondary,
					customId: "reviewslist-last",
					emoji: "↗️",
					disabled: secondDisabled,
				}),
			);
		};

		const displayPage = async (initial = false) => {
			const reviewsOnPage = allReviews.slice((page - 1) * perPage, page * perPage);

			const description = reviewsOnPage
				.map((r) => {
					return `**<@${r.userId}> ${"⭐".repeat(r.rating)} (${r.rating}/5)**\n> ${
						r.message.length < 150 ? r.message.trim() : r.message.slice(0, 150).trim() + "..."
					}`;
				})
				.join("\n")
				.slice(0, 2000);

			const footer = __("generic.pagination", {
				page: page.toString(),
				total_count: Math.ceil(allReviews.length / perPage).toString(),
				amount_per_page: perPage.toString(),
				_locale: interaction.locale,
			});
			const data = {
				embeds: [
					infoEmbed()
						.setTitle(
							__("commands.reviews.title", {
								username: freelancer.username,
								mention: freelancer.toString(),
								review_count: allReviews.length.toString(),
								average_stars: averageStars.toFixed(2),
								_locale: interaction.locale,
							}),
						)
						.setDescription(description)
						.setFooter({ text: footer }),
				],

				components: [genButtons(page === 1, page === Math.ceil(allReviews.length / perPage))],
			};

			if (initial) interaction.reply(data);
			else interaction.editReply(data);
		};
		displayPage(true);
		collector.on("collect", (int) => {
			int.deferUpdate();
			if (int.customId === "reviewslist-back") {
				page -= 1;
			} else if (int.customId === "reviewslist-forward") {
				page += 1;
			} else if (int.customId === "reviewslist-first") {
				page = 1;
			} else if (int.customId === "reviewslist-last") {
				page = Math.ceil(allReviews.length / perPage);
			}
			displayPage();
		});
		collector.on("end", async () => {
			const original = await interaction.fetchReply();
			interaction.editReply({ components: disableButtons(original.components) });
		});
	}
}
