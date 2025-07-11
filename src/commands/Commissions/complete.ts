import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	GuildMember,
} from "discord.js";
import { ExecutionError } from "nhandler";

import Invoice from "@classes/Invoice";
import Settings from "@classes/Settings";
import { TicketManager } from "@classes/TicketManager";

import { BaseCommand } from "@util/baseInterfaces";
import { infoEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class CompleteCommand extends BaseCommand {
	name = "complete";
	description = "Mark this commission as complete.";
	metadata = {
		category: "Commissions Management",
	};
	options = [
		{
			name: "message",
			type: ApplicationCommandOptionType.String,
			required: false,
			description: "An optional note to include with the completion.",
		},
	];

	async run(interaction: ChatInputCommandInteraction, { settings }: { settings: Settings }): Promise<void> {
		if (settings.freelancerRole && !(interaction.member as GuildMember).roles.cache.has(settings.freelancerRole)) {
			throw new ExecutionError(__("generic.errors.must_be_freelancer", { _locale: interaction.locale }));
		}
		const comm = await TicketManager.fetch({
			type: 0,
			guildId: interaction.guild!.id,
			channelId: interaction.channel!.id,
			closed: false,
		});
		if (!comm) {
			throw new ExecutionError(__("generic.errors.not_commission_or_archived", { _locale: interaction.locale }));
		}
		if (!comm.freelancerId) {
			throw new ExecutionError(
				__("generic.errors.commission_not_assigned_to_freelancer", { _locale: interaction.locale }),
			);
		}
		if (!this.client.config.tickets.allowCompletionWithoutInvoice) {
			if (!comm.invoiceId) {
				throw new ExecutionError(__("commands.complete.errors.no_invoice", { _locale: interaction.locale }));
			}
			const linkedInvoice = await Invoice.findOne({ where: { id: comm.invoiceId } });
			if (!linkedInvoice || !linkedInvoice.paid) {
				throw new ExecutionError(
					__("commands.complete.errors.invoice_not_paid", { _locale: interaction.locale }),
				);
			}
		}
		if (comm.complete) {
			throw new ExecutionError(__("commands.complete.errors.already_complete", { _locale: interaction.locale }));
		}
		const message = interaction.options.getString("message");
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				label: __("completion.button.accept", { _locale: interaction.locale }),
				customId: `complete-accept-${comm.id}`,
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				label: __("completion.button.deny", { _locale: interaction.locale }),
				customId: `complete-deny-${comm.id}`,
				style: ButtonStyle.Danger,
			}),
		);
		comm.complete = true;
		await comm.save();
		interaction.reply({
			embeds: [
				infoEmbed(
					`${__("commands.complete.embed", { _locale: interaction.locale })}${message ? `\n\n**${__("commands.complete.message_from_freelancer", { _locale: interaction.locale })}:**\n${message}` : ""}`,
				).setTitle(__("commands.complete.embed.title", { _locale: interaction.locale })),
			],

			components: [row],
		});
	}
}
