import { ChatInputCommandInteraction } from "discord.js";
import { ExecutionError } from "nhandler";
import { Op } from "sequelize";

import Prompt from "@classes/Prompt";
import { TicketManager, TicketType } from "@classes/TicketManager";
import ApplicationTicket from "@classes/Tickets/ApplicationTicket";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseCommand } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class QuestionsCommand extends BaseCommand {
	name = "questions";
	description = "View this ticket's answers to prompts.";
	metadata = {
		category: "Ticketing",
	};

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const ticket = await TicketManager.fetch({
			guildId: interaction.guild!.id,
			channelId: interaction.channel!.id,
			closed: false,
			[Op.or]: [{ type: TicketType.Commission }, { type: TicketType.Application }],
		});
		if (!ticket) {
			throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
		}
		if (!(ticket instanceof CommissionTicket) && !(ticket instanceof ApplicationTicket)) {
			throw new ExecutionError(__("generic.errors.not_comm_or_app", { _locale: interaction.locale }));
		}
		const prompt = await Prompt.findOne({ where: { ticketId: ticket.id } });
		if (!prompt || !prompt.responsesJson?.length) {
			throw new ExecutionError(__("commands.questions.errors.no_data", { _locale: interaction.locale }));
		}
		const responses = prompt.decodeResponses();

		interaction.reply({
			embeds: [
				successEmbed()
					.setAuthor({
						name: __("commands.questions.embed_title", {
							id: ticket.id,
							serial: ticket.serial.toString(),
							_locale: interaction.locale,
						}),
					})
					.addFields(responses.map((r) => ({ name: `${r.name}:`, value: r.value }))),
			],
		});
	}
}
