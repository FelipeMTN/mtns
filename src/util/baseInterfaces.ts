import { ApplicationCommandType, ChatInputCommandInteraction } from "discord.js";
import {
	AnyComponentInteraction,
	Command,
	Component,
	ContextMenuAction,
	ContextMenuInteraction,
	ExecutionError,
} from "nhandler";

import Client from "@classes/Client";

import { errorEmbed } from "@util/embeds";

export abstract class BaseCommand implements Command {
	client!: Client;
	abstract name: string;
	abstract description: string;

	async error(interaction: ChatInputCommandInteraction, error: ExecutionError): Promise<void> {
		await interaction.reply({ embeds: [errorEmbed(error.message)], ephemeral: true });
		return;
	}

	abstract run(interaction: ChatInputCommandInteraction, metadata: any): Promise<void>;
}

export abstract class BaseComponent implements Component {
	client!: Client;
	findFn = (event: AnyComponentInteraction) => event.customId.startsWith(this.customId);
	abstract customId: string;

	async error(interaction: AnyComponentInteraction, error: ExecutionError): Promise<void> {
		await interaction.reply({ embeds: [errorEmbed(error.message)], ephemeral: true });
		return;
	}

	abstract run(interaction: AnyComponentInteraction, metadata: any): Promise<void>;
}

export abstract class BaseContextMenuAction implements ContextMenuAction {
	client!: Client;
	abstract name: string;
	abstract type: ApplicationCommandType;

	async error(interaction: ContextMenuInteraction, error: ExecutionError): Promise<void> {
		await interaction.reply({ embeds: [errorEmbed(error.message)], ephemeral: true });
		return;
	}

	abstract run(interaction: ContextMenuInteraction, metadata: any): Promise<void>;
}
