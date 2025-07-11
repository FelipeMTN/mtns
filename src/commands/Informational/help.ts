import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	Message,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
} from "discord.js";
import { Command } from "nhandler";

import Client from "@classes/Client";

import { BaseCommand } from "@util/baseInterfaces";
import { infoEmbed } from "@util/embeds";
import { getCommandId } from "@util/getCommandId";

const OWNER_ONLY_COMMANDS = ["eval"];

const CATEGORY_EMOJI_MAP: Record<string, string> = {
	"Applications Management": "📝",
	Banking: "💰",
	"Commissions Management": "📜",
	Configuration: "🔧",
	Informational: "ℹ️",
	Invoicing: "💵",
	Profiles: "👤",
	"Ticket Management": "🎟️",
	Ticketing: "🎫",
	Utility: "📦",
};

export default class HelpCommand extends BaseCommand {
	name = "help";
	description = "View a list of all commands.";
	metadata = {
		category: "Informational",
	};
	options = [];

	private embedMessage?: Message;
	private selectedCategory?: string;

	async createEmbed(category: string, commandsInCategory: Command[]) {
		const embed = infoEmbed().setTitle(`${category} commands`);
		const cmdNamesWithSubcommandNames = commandsInCategory.map((cmd: Command) => {
			const hasSubcommands =
				cmd.options &&
				Array.isArray(cmd.options) &&
				cmd.options.length > 0 &&
				cmd.options.some((o) => o.type === ApplicationCommandOptionType.Subcommand);
			if (!hasSubcommands) {
				return `</${cmd.name}:${getCommandId(cmd.name)}>\n\t- ${cmd.description}`;
			}
			return cmd
				.options!.map(
					(subcmd) => `</${cmd.name} ${subcmd.name}:${getCommandId(cmd.name)}>\n\t- ${subcmd.description}`,
				)
				.join("\n- ");
		});
		embed.setDescription(
			`${cmdNamesWithSubcommandNames
				.map((n) => "- " + n)
				.join("\n")
				.slice(0, 2048)}`,
		);
		embed.setThumbnail(this.client.user!.displayAvatarURL({ size: 128 }));
		return embed;
	}

	async createSelectMenu(embed: any, categories: string[], category: string, disable: boolean = false) {
		return {
			embeds: [embed],
			components: [
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					new StringSelectMenuBuilder()
						.setPlaceholder("Select a category to view commands in.")
						.setCustomId("help-categoryselector")
						.setMinValues(1)
						.setMaxValues(1)
						.addOptions(
							categories.map((c) => ({
								label: c ?? "Uncategorized",
								value: c ?? "Uncategorized",
								emoji: CATEGORY_EMOJI_MAP[c] ?? undefined,
								default: c === category,
							})),
						)
						.setDisabled(disable),
				),
			],
		};
	}

	async refreshEmbed(
		interaction: ChatInputCommandInteraction,
		category: string,
		categories: string[],
		disable: boolean = false,
	) {
		const commandsInCategory = Client.commandHandler.commands.filter(
			(cmd: Command) => cmd.metadata?.category === category,
		);
		const embed = await this.createEmbed(category, commandsInCategory);
		const data = await this.createSelectMenu(embed, categories, category, disable);
		if (this.embedMessage) {
			await this.embedMessage.fetch();
			await this.embedMessage.edit(data);
		} else {
			await interaction.reply(data);
			this.embedMessage = await interaction.fetchReply();
		}
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		let cmds = Client.commandHandler.commands;
		if (!this.client.config.main.owners.includes(interaction.user.id)) {
			cmds = cmds.filter((cmd: Command) => !OWNER_ONLY_COMMANDS.includes(cmd.name as string));
		}
		let categories = [...new Set(cmds.map((cmd: Command) => cmd.metadata?.category || "Uncategorized"))];
		await this.client.application!.commands.fetch();
		await this.refreshEmbed(interaction, "Ticketing", categories);
		const collector = interaction.channel!.createMessageComponentCollector({
			filter: (i) => i.customId === "help-categoryselector" && i.user.id === interaction.user.id,
			idle: 60000,
		});
		collector.on("collect", async (i) => {
			if (!(i instanceof StringSelectMenuInteraction)) return;
			await i.deferUpdate();
			if (!categories.includes(i.values[0])) {
				await i.followUp({ content: "Invalid category.", ephemeral: true });
				return;
			}
			await this.refreshEmbed(interaction, i.values[0], categories);
			this.selectedCategory = i.values[0];
		});
		collector.on("end", async (_, reason) => {
			if (reason === "time" || reason === "idle") {
				await this.refreshEmbed(interaction, this.selectedCategory || "Ticketing", categories, true);
			}
		});
	}
}
