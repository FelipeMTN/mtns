import {
	ApplicationCommandOptionType,
	AttachmentBuilder,
	ChatInputCommandInteraction,
	PermissionsBitField,
} from "discord.js";
import { ExecutionError } from "nhandler";
import { Op } from "sequelize";

import { TicketManager } from "@classes/TicketManager";

import { BaseCommand } from "@util/baseInterfaces";
import { errorEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class TranscriptCommand extends BaseCommand {
	name = "transcript";
	description = "Generate a transcript for a ticket.";
	metadata = {
		category: "Ticket Management",
	};
	options = [
		{
			type: ApplicationCommandOptionType.String,
			name: "id",
			description: "Commission ID or commission channel ID.",
			required: false,
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const id = interaction.options.getString("id") || interaction.channel!.id;
		const ticket = await TicketManager.fetch({ closed: false, [Op.or]: [{ id: id }, { channelId: id }] });
		if (!ticket) {
			throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
		}

		ticket
			.fetchTranscript()
			.then((transcript) => {
				const attachment = new AttachmentBuilder(Buffer.from(transcript.text), { name: transcript.name });
				interaction.reply({ files: [attachment] });
			})
			.catch((err: any) => {
				interaction.reply({
					embeds: [
						errorEmbed(
							__("commands.transcript.errors.generic", {
								message: err.message,
								_locale: interaction.locale,
							}),
						),
					],
					ephemeral: true,
				});
			});
	}
}
