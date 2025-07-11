import { ChatInputCommandInteraction, GuildMemberRoleManager } from "discord.js";
import { ExecutionError } from "nhandler";

import Settings from "@classes/Settings";
import { TicketManager } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseCommand } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class ClaimCommand extends BaseCommand {
	name = "claim";
	description = "Claim this commission.";
	metadata = {
		category: "Commissions Management",
	};

	async run(interaction: ChatInputCommandInteraction, { settings }: { settings: Settings }): Promise<void> {
		if (!interaction.guild || !interaction.member) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}
		if (
			settings.managerRole &&
			!(interaction.member.roles as GuildMemberRoleManager).cache.has(settings.managerRole)
		) {
			throw new ExecutionError(__("generic.errors.must_be_manager", { _locale: interaction.locale }));
		}
		const ticket = await TicketManager.fetch({
			type: 0,
			guildId: interaction.guild!.id,
			channelId: interaction.channel!.id,
			closed: false,
		});

		if (!ticket || !(ticket instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission_or_archived", { _locale: interaction.locale }));
		}

		if (ticket.managerId) {
			const manager = interaction.guild.members.cache.find((m) => m.id === ticket.managerId);
			throw new ExecutionError(
				__("commands.claim.errors.already_claimed", {
					mention: `<@${ticket.managerId}>`,
					username: manager?.user?.username || "Unknown",
					_locale: interaction.locale,
				}),
			);
		}
		if (ticket.complete) {
			throw new ExecutionError(__("commands.claim.errors.already_complete", { _locale: interaction.locale }));
		}
		ticket.managerId = interaction.user.id;
		await ticket.save();
		interaction.reply({
			embeds: [
				successEmbed(
					__("commands.claim.successful", {
						mention: interaction.user.toString(),
						username: interaction.user.username,
						_locale: interaction.locale,
					}),
				).setAuthor({ name: __("commands.claim.successful.title", { _locale: interaction.locale }) }),
			],
		});
	}
}
