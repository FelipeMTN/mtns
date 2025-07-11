import { GuildMemberRoleManager, ModalSubmitInteraction } from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import Logger from "@classes/Logger";
import Settings from "@classes/Settings";
import { AnyTicket, TicketManager } from "@classes/TicketManager";

import { BaseComponent } from "@util/baseInterfaces";
import { archiveButton } from "@util/components/buttons";
import { customerPanel } from "@util/components/customerPanel";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class CustomerPanelActionComponent extends BaseComponent {
	customId = "customerpanelaction";

	async run(interaction: AnyComponentInteraction, { settings }: { settings: Settings }): Promise<void> {
		if (!(interaction instanceof ModalSubmitInteraction)) {
			Logger.error(`Received interaction customerpanelaction with unexpected type ${interaction.type}`);
			throw new ExecutionError("Something went wrong.");
		}
		if (!interaction.guild) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}
		const ticket = await TicketManager.fetch({ guildId: interaction.guildId, channelId: interaction.channelId });
		if (!ticket) {
			throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
		}

		const [, action] = interaction.customId.split("-");
		if (action === "add") await this.runAdd(interaction, ticket);
		if (action === "remove") await this.runRemove(interaction, ticket, settings);
	}

	async runAdd(interaction: ModalSubmitInteraction, ticket: AnyTicket): Promise<void> {
		const userSearch = interaction.fields.getTextInputValue("user");
		const member = interaction.guild!.members.cache.find(
			(m) =>
				m.user.displayName.toLowerCase() === userSearch.toLowerCase() ||
				m.user.username.toLowerCase() === userSearch.toLowerCase() ||
				m.user.id === userSearch,
		);
		if (!member) {
			throw new ExecutionError(
				__("customerpanel.action.add.errors.user_invalid", { _locale: interaction.locale }),
			);
		}
		const isAdded = await ticket.addUser(member.user);

		if (isAdded) {
			throw new ExecutionError(
				__("commands.add.errors.already_in_ticket", {
					username: member.user.username,
					mention: member.user.toString(),
					_locale: interaction.locale,
				}),
			);
		}

		interaction.reply({
			embeds: [
				successEmbed(
					__("commands.add.successful", {
						username: member.user.username,
						mention: member.user.toString(),
						_locale: interaction.locale,
					}),
				),
			],
		});
		this.editMessage(interaction);
	}

	async runRemove(interaction: ModalSubmitInteraction, ticket: AnyTicket, settings: Settings): Promise<void> {
		const userSearch = interaction.fields.getTextInputValue("user");
		const member = interaction.guild!.members.cache.find(
			(m) =>
				m.user.displayName.toLowerCase() === userSearch.toLowerCase() ||
				m.user.username.toLowerCase() === userSearch.toLowerCase() ||
				m.user.id === userSearch,
		);
		if (!member) {
			throw new ExecutionError(
				__("customerpanel.action.remove.errors.user_invalid", { _locale: interaction.locale }),
			);
		}
		if (ticket.authorId === member.id) {
			throw new ExecutionError(__("commands.remove.errors.cant_remove_author", { _locale: interaction.locale }));
		}
		if (member.roles.highest.position > (interaction.member!.roles as GuildMemberRoleManager).highest.position) {
			throw new ExecutionError(
				__("customerpanel.action.remove.errors.cant_remove_higher", { _locale: interaction.locale }),
			);
		}
		if (settings.managerRole && member.roles.cache.has(settings.managerRole)) {
			throw new ExecutionError(
				__("customerpanel.action.remove.errors.cant_remove_manager", { _locale: interaction.locale }),
			);
		}

		if (ticket.freelancerId && member.id === ticket.freelancerId) {
			throw new ExecutionError(
				__("customerpanel.action.remove.errors.cant_remove_assigned_freelancer", {
					_locale: interaction.locale,
				}),
			);
		}

		const isAdded = await ticket.removeUser(member.user);

		if (isAdded) {
			throw new ExecutionError(
				__("commands.remove.errors.not_in_ticket", {
					username: member.user.username,
					mention: member.user.toString(),
					_locale: interaction.locale,
				}),
			);
		}

		interaction.reply({
			embeds: [
				successEmbed(
					__("commands.remove.successful", {
						username: member.user.username,
						mention: member.user.toString(),
						_locale: interaction.locale,
					}),
				),
			],
		});
		this.editMessage(interaction);
	}

	async editMessage(interaction: ModalSubmitInteraction): Promise<void> {
		await interaction.message?.fetch();
		interaction.message?.edit({ components: [customerPanel(interaction.locale), archiveButton()] });
	}
}
