import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import ollama from "ollama";
import OpenAI from "openai";

import Logger from "@classes/Logger";

import { BaseCommand } from "@util/baseInterfaces";
import { errorEmbed, infoEmbed, successEmbed } from "@util/embeds";

export default class AICommand extends BaseCommand {
	name = "ai";
	description = "Ask the AI assistant questions.";
	metadata = {
		category: "Utility",
	};
	options = [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "ask",
			description: "Ask the AI assistant a question.",
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "message",
					description: "The message to send to the AI assistant.",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "clear",
			description: "Reset the AI assistant context.",
		},
	];

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const subcommand = interaction.options.getSubcommand(true);
		if (subcommand === "ask") {
			await this.runAsk(interaction);
		} else if (subcommand === "clear") {
			await this.runClear(interaction);
		}
	}

	async runAsk(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!this.client.config.main.ai.enabled) {
			await interaction.reply({ embeds: [errorEmbed("This command is disabled. Please check the configuration.")], ephemeral: true });
			return;
		}

		let isOpenAi = this.client.config.main.ai.model.startsWith("gpt");

		if (isOpenAi && !this.client.config.main.ai.openai?.key) {
			await interaction.reply({ embeds: [errorEmbed("This command requires an OpenAI key when any GPT model is set. Please check the configuration.")], ephemeral: true });
			return;
		}

		if (!this.client.aiRateLimiter.tryOperation(interaction.user.id)) {
			await interaction.reply({ embeds: [errorEmbed(`You have exceeded the rate limit of ${this.client.config.main.ai.rateLimitPerHr} requests per hour. Please try again later.`)], ephemeral: true });
			return;
		}

		await interaction.deferReply({ ephemeral: false });

		const message = interaction.options.getString("message", true);

		try {
			let chatHistory = this.client.pastAiChats
				.filter((chat) => chat.userId === interaction.user.id)
				.map((chat) => ({
					role: chat.role,
					content: chat.content,
				}));

			let footer = {
				text: `This content is AI-generated and may not be accurate. Always verify the information.\n${this.client.aiRateLimiter.getRemainingOperations(interaction.user.id)}/${this.client.config.main.ai.rateLimitPerHr} questions available for the next hour.`,
				iconURL: "https://images.emojiterra.com/microsoft/fluent-emoji/15.1/256px/1f916_flat.png",
			};
			let assistantText;

			if (isOpenAi) {
				Logger.warn(`Using OpenAI API for chat completion for @${interaction.user.username}.`);
				const openaiClient = new OpenAI({ apiKey: this.client.config.main.ai.openai!.key });
				// @ts-ignore
				const stream = await openaiClient.chat.completions.create({
					messages: [
						{
							role: "system",
							content: this.client.config.main.ai.systemText ?? "",
						},
						...chatHistory,
						{ role: "user", content: message },
					],
					model: this.client.config.main.ai.model,
				});

				const text = stream.choices[0].message.content ?? "No response";

				await interaction.editReply({
					embeds: [infoEmbed(text).setFooter(footer).setTimestamp(null)],
				});
				assistantText = text;
			} else {
				const response = await ollama.chat({
					model: this.client.config.main.ai.model,
					messages: [
						{
							role: "system",
							content: this.client.config.main.ai.systemText ?? "",
						},
						...chatHistory,
						{
							role: "user",
							content: message,
						},
					],
				});
				await interaction.editReply({
					embeds: [infoEmbed(response.message.content).setFooter(footer).setTimestamp(null)],
				});
				assistantText = response.message.content;
			}
			this.client.pastAiChats.push({
				userId: interaction.user.id,
				role: "user",
				content: message,
			});

			this.client.pastAiChats.push({
				userId: interaction.user.id,
				role: "assistant",
				content: assistantText,
			});

			if (this.client.pastAiChats.length > this.client.config.main.ai.historyLength) {
				this.client.pastAiChats.splice(0, this.client.pastAiChats.length - this.client.config.main.ai.historyLength);
			}
		} catch (err) {
			console.error(err);
			await interaction.editReply({
				embeds: [errorEmbed("An error occurred while processing your request.\nIf you're using a local model, please verify if Ollama is running and access is allowed through the firewall.\nIf you're using the OpenAI API, please check your API key and usage limits.")],
			});
		}
	}

	private async runClear(interaction: ChatInputCommandInteraction): Promise<void> {
		this.client.pastAiChats = this.client.pastAiChats.filter((chat) => chat.userId !== interaction.user.id);

		await interaction.reply({
			embeds: [successEmbed("Cleared the AI assistant context.")],
		});
	}
}
