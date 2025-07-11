import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalSubmitInteraction } from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import Quote, { QuoteStatus } from "@classes/Quote";
import { TicketManager } from "@classes/TicketManager";

import { BaseComponent } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

// Modal Submit Event For Counteroffering
export default class RespondQuoteCounterSubmitComponent extends BaseComponent {
	customId = "counteroffer-counter-submit";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (!(interaction instanceof ModalSubmitInteraction)) return;
		const amount = parseInt(interaction.fields.getTextInputValue("value")?.replace(/\$/g, ""));
		if (isNaN(amount)) {
			throw new ExecutionError(__("generic.errors.not_number", { _locale: interaction.locale }));
		}

		const quoteId = interaction.customId.split("-")[3];

		const quote = await Quote.findOne({ where: { id: quoteId } });
		if (!quote) {
			throw new ExecutionError(__("quoting.responding.errors.quote_invalid", { _locale: interaction.locale }));
		}
		const comm = await TicketManager.fetch({ type: 0, id: quote.commissionId });
		if (!comm) {
			throw new ExecutionError(__("generic.errors.not_commission", { _locale: interaction.locale }));
		}

		// Query the freelancer user
		const freelancerUser = await this.client.users.fetch(quote.freelancerId).catch(() => {});
		if (!freelancerUser) {
			throw new ExecutionError(
				__("quoting.responding.errors.freelancer_invalid", { _locale: interaction.locale }),
			);
		}

		const guild = this.client.guilds.cache.get(comm.guildId);
		if (!guild) {
			throw new ExecutionError(__("generic.errors.guild_invalid", { _locale: interaction.locale }));
		}
		const commChannel = await guild.channels.fetch(comm.channelId).catch(() => {});
		if (!commChannel) return;

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				customId: `quote-${comm.id}`,
				label: __("quoting.create.button_label", { _locale: interaction.locale }),
				style: ButtonStyle.Success,
				emoji: this.client.config.customization.buttons.emojis.quote || "💵",
			}),
			new ButtonBuilder({
				customId: `message-new-${comm.id}`,
				label: __("messaging.c2f.button_label", { _locale: interaction.locale }),
				style: ButtonStyle.Secondary,
				emoji: this.client.config.customization.buttons.emojis.message || "✉️",
			}),
		);

		if (!freelancerUser.dmChannel) await freelancerUser.createDM().catch(() => null);
		if (freelancerUser.dmChannel) {
			await freelancerUser.dmChannel.send({
				embeds: [
					successEmbed(
						__("quoting.counter.dm_notification", {
							client_mention: interaction.user.toString(),
							client_username: interaction.user.username,
							quote: quote.price.toFixed(2),
							suggested_price: amount.toFixed(2),
							_locale: interaction.locale,
						}),
					),
				],

				components: [row],
			});
		}

		quote.status = QuoteStatus.Counteroffered;
		await quote.save();
		await quote.updateEmbed();

		await interaction.reply({
			embeds: [successEmbed(__("quoting.counter.successful", { _locale: interaction.locale }))],
			ephemeral: true,
		});
	}
}
