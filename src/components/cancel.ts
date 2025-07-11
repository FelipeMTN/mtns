import { AnyComponentInteraction, ExecutionError } from "nhandler";

import { TicketManager } from "@classes/TicketManager";

import { BaseComponent } from "@util/baseInterfaces";
import { __ } from "@util/translate";

export default class CancelPromptsComponent extends BaseComponent {
	customId = "cancel";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (!interaction.member) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}

		const ticket = await TicketManager.fetch({
			guildId: interaction.guild!.id,
			channelId: interaction.channel!.id,
		});

		if (!ticket) {
			throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
		}

		if (ticket.closed) {
			throw new ExecutionError(__("commands.archive.errors.already_archived", { _locale: interaction.locale }));
		}

		if (ticket.authorId !== interaction.user.id) {
			throw new ExecutionError(__("tickets.cancel.errors.not_author", { _locale: interaction.locale }));
		}

		await interaction.deferUpdate().catch(() => null);
		await ticket.archive("Cancelled prompts by user.");
	}
}
