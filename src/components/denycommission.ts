import {
	ActionRowBuilder,
	ButtonInteraction,
	Guild,
	GuildMember,
	ModalBuilder,
	ModalSubmitInteraction,
	Role,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import { TicketManager, TicketType } from "@classes/TicketManager";
import CommissionTicket from "@classes/Tickets/CommissionTicket";

import { BaseComponent } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { findServiceData } from "@util/findServiceData";
import { __ } from "@util/translate";

import { ConfigService } from "@schemas/services";

export default class DenyCommissionComponent extends BaseComponent {
	customId = "denycommission";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (interaction instanceof ButtonInteraction) return await this.onButton(interaction);
		else if (interaction instanceof ModalSubmitInteraction) return await this.onSubmit(interaction);
	}

	async onButton(interaction: ButtonInteraction): Promise<void> {
		const [, commId, presetReasonIndex] = interaction.customId.split("-");

		let allPresets = [
			__("quoting.deny.preset_reason.1", { _locale: interaction.locale }),
			__("quoting.deny.preset_reason.2", { _locale: interaction.locale }),
			__("quoting.deny.preset_reason.3", { _locale: interaction.locale }),
		];

		let presetReason = presetReasonIndex === "x" ? null : allPresets[parseInt(presetReasonIndex) - 1];

		const comm = await TicketManager.fetch({ type: TicketType.Commission, id: commId, closed: false });

		if (!comm || !(comm instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission_or_archived", { _locale: interaction.locale }));
		}

		if (JSON.parse(comm.deniers).includes(interaction.user.id)) {
			throw new ExecutionError(__("commissions.deny.errors.already_denied", { _locale: interaction.locale }));
		}

		const serviceData: ConfigService | undefined = findServiceData(this.client, comm.selectedService!);
		if (serviceData && !serviceData.other && serviceData.roleId) {
			const guild = this.client.guilds.cache.find((g: Guild) => g.id === comm.guildId);
			if (guild) {
				const member = guild.members.cache.find((m: GuildMember) => m.id === interaction.user.id);
				if (!member) return;
				if (!member.roles.cache.some((r: Role) => r.id === serviceData.roleId)) {
					throw new ExecutionError(
						__("quoting.errors.wrong_service_roles", {
							service_name: serviceData.name,
							_locale: interaction.locale,
						}),
					);
				}
			}
		}

		if (!presetReason) {
			// Open modal to enter custom reason
			const reasonRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
				new TextInputBuilder()
					.setCustomId("reason")
					.setLabel(__("commissions.deny.modal_field_reason_label", { _locale: interaction.locale }))
					.setMaxLength(500)
					.setRequired(true)
					.setStyle(TextInputStyle.Paragraph),
			);

			const modal = new ModalBuilder()
				.setCustomId(`denycommission-${commId}`)
				.setTitle(__("commissions.deny.modal_title", { _locale: interaction.locale }))
				.addComponents(reasonRow);

			await interaction.showModal(modal);
		} else {
			// Deny the commission
			comm.denyProposal(interaction.user, presetReason)
				.then(async () => {
					await interaction.reply({
						embeds: [successEmbed(__("commissions.deny.success", { _locale: interaction.locale }))],
						ephemeral: true,
					});
				})
				.catch((err) => {
					throw new ExecutionError(err);
				});
		}
	}

	async onSubmit(interaction: ModalSubmitInteraction): Promise<void> {
		const commId = interaction.customId.split("-")[1];
		const comm = await TicketManager.fetch({ type: TicketType.Commission, id: commId, closed: false });

		if (!comm || !(comm instanceof CommissionTicket)) {
			throw new ExecutionError(__("generic.errors.not_commission_or_archived", { _locale: interaction.locale }));
		}

		const reason = interaction.fields.getTextInputValue("reason");

		comm.denyProposal(interaction.user, reason)
			.then(async () => {
				await interaction.reply({
					embeds: [successEmbed(__("commissions.deny.success", { _locale: interaction.locale }))],
					ephemeral: true,
				});
			})
			.catch((err) => {
				throw new ExecutionError(err);
			});
	}
}
