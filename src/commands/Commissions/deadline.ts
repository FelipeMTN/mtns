import { ApplicationCommandOptionType, ChatInputCommandInteraction, PermissionsBitField } from "discord.js";
import ms from "ms";
import { ExecutionError } from "nhandler";

import { TicketManager, TicketType } from "@classes/TicketManager";

import { BaseCommand } from "@util/baseInterfaces";
import { infoEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class DeadlineCommand extends BaseCommand {
	name = "deadline";
	description = "Creates or updates the deadline for this commission.";
	metadata = {
		category: "Commissions Management",
	};
	options = [
		{
			name: "time",
			type: ApplicationCommandOptionType.String,
			required: true,
			description: "The duration of the deadline, for example 1d or 2w.",
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const ticket = await TicketManager.fetch({
			type: TicketType.Commission,
			guildId: interaction.guild!.id,
			channelId: interaction.channel!.id,
			closed: false,
		});
		if (!ticket) {
			throw new ExecutionError(__("generic.errors.not_commission_or_archived", { _locale: interaction.locale }));
		}
		const time = interaction.options.getString("time", true);
		const duration: number = ms(time);
		if (isNaN(duration)) {
			throw new ExecutionError(__("generic.errors.time.bad_format", { _locale: interaction.locale }));
		}
		if (duration < 30_000) {
			throw new ExecutionError(
				__("commands.deadline.errors.time.too_low", { seconds: "30", _locale: interaction.locale }),
			);
		}
		const deadline = Date.now() + duration;
		const deadlineSeconds = Math.floor(deadline / 1000);
		const embed = infoEmbed(
			`${__("commands.deadline.deadline_text", { _locale: interaction.locale })}: <t:${deadlineSeconds}:F>.\n**${__(
				"commands.deadline.expires_text",
				{ _locale: interaction.locale },
			)} <t:${deadlineSeconds}:R>**.`,
		);
		await interaction.reply({ embeds: [embed] });
		const reply = await interaction.fetchReply();
		await ticket.update({ deadline, deadlineMessage: reply.id });
		await reply.pin();
	}
}
