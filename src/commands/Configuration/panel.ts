import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Colors,
	PermissionsBitField,
} from "discord.js";

import { BaseCommand } from "@util/baseInterfaces";
import { infoEmbed, successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class PanelCommand extends BaseCommand {
	name = "panel";
	description = "Create the ticket creation panel.";
	metadata = {
		category: "Configuration",
	};
	options = [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "tickets",
			description: "Create the ticket creation panel.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "bank",
			description: "Create a panel for viewing the bank.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "profile",
			description: "Create a panel for managing the profile.",
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const sub = interaction.options.getSubcommand();
		if (sub === "tickets") this.createTickets(interaction);
		else if (sub === "bank") this.createBank(interaction);
		else if (sub === "profile") this.createProfile(interaction);
	}

	createTickets(interaction: ChatInputCommandInteraction): void {
		const row = new ActionRowBuilder<ButtonBuilder>();

		if (this.client.config.tickets.enabled.commissions) {
			row.addComponents(
				new ButtonBuilder({
					label: this.client.config.customization.panel.buttons.commission.label,
					customId: "panel-new-commission",
					style: ButtonStyle.Secondary,
					emoji: this.client.config.customization.panel.buttons.commission.emoji,
				}),
			);
		}

		if (this.client.config.tickets.enabled.applications) {
			row.addComponents(
				new ButtonBuilder({
					label: this.client.config.customization.panel.buttons.application.label,
					customId: "panel-new-application",
					style: ButtonStyle.Secondary,
					emoji: this.client.config.customization.panel.buttons.application.emoji,
				}),
			);
		}

		if (this.client.config.tickets.enabled.support) {
			row.addComponents(
				new ButtonBuilder({
					label: this.client.config.customization.panel.buttons.support.label,
					customId: "panel-new-support",
					style: ButtonStyle.Secondary,
					emoji: this.client.config.customization.panel.buttons.support.emoji,
				}),
			);
		}

		interaction.reply({
			embeds: [successEmbed(__("commands.panel.successful", { _locale: interaction.locale }))],
			ephemeral: true,
		});

		const embed = infoEmbed()
			.setFooter(null)
			.setTimestamp(null)
			.setColor(this.client.config.customization.panel.color);

		if (this.client.config.customization.panel.imageUrl) {
			embed.setImage(this.client.config.customization.panel.imageUrl);
		}
		if (this.client.config.customization.panel.title) {
			embed.setTitle(this.client.config.customization.panel.title);
		}
		if (this.client.config.customization.panel.description) {
			embed.setDescription(this.client.config.customization.panel.description);
		}
		interaction.channel!.send({
			embeds: [embed],
			components: [row],
		});
	}

	createBank(interaction: ChatInputCommandInteraction): void {
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				label: __("panel.bank.button_label.view_balance", { _locale: interaction.locale }),
				customId: "bankpanel-viewbalance",
				style: ButtonStyle.Secondary,
			}),
			new ButtonBuilder({
				label: __("panel.bank.button_label.list_transactions", { _locale: interaction.locale }),
				customId: "bankpanel-transactions",
				style: ButtonStyle.Secondary,
			}),
		);

		interaction.reply({
			embeds: [successEmbed(__("commands.panel.successful", { _locale: interaction.locale }))],
			ephemeral: true,
		});
		interaction.channel!.send({
			embeds: [
				infoEmbed()
					.setFooter(null)
					.setTimestamp(null)
					.setColor(Colors.Blurple)
					.setTitle(__("panel.bank.title", { _locale: interaction.locale })),
			],

			components: [row],
		});
	}

	createProfile(interaction: ChatInputCommandInteraction): void {
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				label: __("panel.profile.button_label.set_bio", { _locale: interaction.locale }),
				customId: "profilepanel-edit-bio",
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				label: __("panel.profile.button_label.set_portfolio", { _locale: interaction.locale }),
				customId: "profilepanel-edit-portfolio",
				style: ButtonStyle.Secondary,
			}),
			new ButtonBuilder({
				label: __("panel.profile.button_label.set_techstack", { _locale: interaction.locale }),
				customId: "profilepanel-edit-ts",
				style: ButtonStyle.Secondary,
			}),
			new ButtonBuilder({
				label: __("panel.profile.button_label.set_timezone", { _locale: interaction.locale }),
				customId: "profilepanel-edit-tz",
				style: ButtonStyle.Secondary,
			}),
			new ButtonBuilder({
				label: __("panel.profile.button_label.set_paypal", { _locale: interaction.locale }),
				customId: "profilepanel-edit-paypal",
				style: ButtonStyle.Secondary,
			}),
		);

		const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				label: __("panel.profile.button_label.view_own_profile", { _locale: interaction.locale }),
				customId: "profilepanel-lookupotherself",
				style: ButtonStyle.Primary,
			}),
			new ButtonBuilder({
				label: __("panel.profile.button_label.view_other_profile", { _locale: interaction.locale }),
				customId: "profilepanel-lookupother",
				style: ButtonStyle.Primary,
			}),
		);

		interaction.reply({
			embeds: [successEmbed(__("commands.panel.successful", { _locale: interaction.locale }))],
			ephemeral: true,
		});
		interaction.channel!.send({
			embeds: [
				infoEmbed()
					.setFooter(null)
					.setTimestamp(null)
					.setColor(Colors.Blurple)
					.setTitle(__("panel.profile.title", { _locale: interaction.locale })),
			],

			components: [row, row2],
		});
	}
}
