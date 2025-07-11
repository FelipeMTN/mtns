import {
	ApplicationCommandOptionType,
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	PermissionsBitField,
	TextChannel,
} from "discord.js";
import { ExecutionError } from "nhandler";

import CommissionLogChannel from "@classes/CommissionLogChannel";

import { BaseCommand } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

import { ConfigService } from "@schemas/services";

export default class SetServiceChannelCommand extends BaseCommand {
	name = "setservicechannel";
	description = "Set a specific commission log channel for a service name.";
	metadata = {
		category: "Configuration",
	};
	options = [
		{
			type: ApplicationCommandOptionType.String,
			name: "service",
			description: "Name of the service to set the channel for.",
			required: true,
			autocomplete: true,
		},
		{
			type: ApplicationCommandOptionType.Channel,
			name: "channel",
			description: "The channel to set.",
			required: true,
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		const focusedValue = interaction.options.getFocused();
		let trials = this.client.config.services.map((s: ConfigService) => ({ name: s.name, value: s.name }));
		const filteredServices = trials.filter((s) => s.name.toLowerCase().startsWith(focusedValue.toLowerCase()));
		await interaction.respond(filteredServices);
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.guild) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}

		const serviceName = interaction.options.getString("service", true);
		const channel = interaction.options.getChannel("channel", true);

		if (!(channel instanceof TextChannel)) {
			throw new ExecutionError(
				__("commands.setservicechannel.errors.channel_not_text", { _locale: interaction.locale }),
			);
		}

		const serviceId = this.client.config.services.find((s: ConfigService) => s.name === serviceName)?.id;
		if (!serviceId) {
			throw new ExecutionError(
				__("commands.setservicechannel.errors.invalid_service", { _locale: interaction.locale }),
			);
		}

		const existing = await CommissionLogChannel.get(serviceId, interaction.guild.id);
		if (existing) {
			await existing.update({ channelId: channel.id });
			interaction.reply({
				embeds: [
					successEmbed(
						__("commands.setservicechannel.updated_existing", {
							service_name: serviceName,
							channel_mention: channel.toString(),
							channel_name: channel.name,
							_locale: interaction.locale,
						}),
					),
				],

				ephemeral: true,
			});
		}

		CommissionLogChannel.set(serviceId, channel)
			.then(() => {
				interaction.reply({
					embeds: [
						successEmbed(
							__("commands.setservicechannel.created", {
								service_name: serviceName,
								channel_mention: channel.toString(),
								channel_name: channel.name,
								_locale: interaction.locale,
							}),
						),
					],

					ephemeral: true,
				});
			})
			.catch(() => {
				throw new ExecutionError(
					__("commands.setservicechannel.errors.generic", { _locale: interaction.locale }),
				);
			});
	}
}
