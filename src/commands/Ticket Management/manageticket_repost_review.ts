import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";

import Review from "@classes/Review";
import Settings from "@classes/Settings";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export async function runRepostReview(
	interaction: ChatInputCommandInteraction,
	comm: CommissionTicket,
	settings: Settings,
): Promise<void> {
	if (!settings.reviewChannel) {
		throw new ExecutionError(__("commands.repostreview.errors.no_review_channel", { _locale: interaction.locale }));
	}

	const review = await Review.findOne({ where: { commissionId: comm.id } });
	if (!review) {
		throw new ExecutionError(__("commands.repostreview.errors.no_review_made", { _locale: interaction.locale }));
	}

	const reviewChannel = await interaction.guild!.channels.fetch(settings.reviewChannel).catch(() => {});
	if (!reviewChannel) {
		throw new ExecutionError(__("commands.repostreview.errors.no_review_channel", { _locale: interaction.locale }));
	}
	await review.send(interaction.guild!);
	await interaction.reply({
		embeds: [successEmbed(__("commands.repostreview.successful", { _locale: interaction.locale }))],
		ephemeral: true,
	});
}
