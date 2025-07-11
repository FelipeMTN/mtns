import { ApplicationCommandType, PermissionsBitField, UserContextMenuCommandInteraction } from "discord.js";

import { TicketManager, TicketType } from "@classes/TicketManager";

import { BaseContextMenuAction } from "@util/baseInterfaces";
import { errorEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class CreateSupportTicketUserAction extends BaseContextMenuAction {
	name = "Create Support Ticket";
	type = ApplicationCommandType.User;
	defaultMemberPermissions = PermissionsBitField.Flags.Administrator;

	async run(interaction: UserContextMenuCommandInteraction): Promise<void> {
		const user = interaction.targetUser;
		await interaction.deferReply({ ephemeral: true });
		TicketManager.create({
			type: TicketType.Support,
			guild: interaction.guild!,
			author: user,
			startQuestions: false,
			locale: interaction.locale,
		})
			.then(async (ticket) => {
				await ticket.addUser(interaction.user);
				await ticket.send({
					embeds: [
						successEmbed(
							__("action.manager_made_ticket_for_you", {
								_locale: interaction.locale,
								target_username: user.username,
								target_mention: user.toString(),
								creator_username: interaction.user.username,
								creator_mention: interaction.user.toString(),
							}),
						),
					],
				});
				const embed = successEmbed(
					__("commands.new.ticket_created", {
						_locale: interaction.locale,
						mention: interaction.user.toString(),
						username: interaction.user.username,
						link: `https://discord.com/channels/${interaction.guild!.id}/${ticket.channel.id}`,
						type: "support",
					}),
				);
				interaction.editReply({ embeds: [embed] });
			})
			.catch((err) => {
				interaction.editReply({
					embeds: [
						errorEmbed(
							__("commands.new.errors.generic", { _locale: interaction.locale, message: err.message }),
						),
					],
				});
			});
	}
}
