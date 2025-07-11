import { ApplicationCommandOptionType, ChatInputCommandInteraction, PermissionsBitField } from "discord.js";
import { ExecutionError } from "nhandler";
import { Op } from "sequelize";

import { TicketManager, TicketType } from "@classes/TicketManager";

import { BaseCommand } from "@util/baseInterfaces";
import { infoEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class TicketInfoCommand extends BaseCommand {
	name = "ticketinfo";
	description = "View the entire information about a ticket.";
	metadata = {
		category: "Informational",
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
		const ticket = await TicketManager.fetch({
			[Op.or]: [{ id: id }, { channelId: id }, { serial: parseInt(id) }],
		});
		if (!ticket) {
			throw new ExecutionError(__("generic.errors.not_any_ticket", { _locale: interaction.locale }));
		}
		const embed = infoEmbed();
		embed.setTitle(
			__("commands.ticketinfo.title", {
				ticket_id: ticket.id,
				serial: ticket.serial.toString(),
				_locale: interaction.locale,
			}),
		);
		const fields: { name: string; value: string; inline?: boolean }[] = [];
		fields.push({
			name: __("generic.id", { _locale: interaction.locale }).toUpperCase(),
			value: `\`${ticket.id}\``,
		});
		fields.push({
			name: __("commands.ticketinfo.field_title.serial", { _locale: interaction.locale }),
			value: `#${ticket.serial}`,
		});
		fields.push({
			name: __("commands.ticketinfo.field_title.guild_id", { _locale: interaction.locale }),
			value: `\`${ticket.guildId}\``,
		});
		fields.push({
			name: __("commands.ticketinfo.field_title.channel", { _locale: interaction.locale }),
			value: `<#${ticket.channelId}> (\`${ticket.channelId}\`)`,
		});
		fields.push({
			name: __("commands.ticketinfo.field_title.author", { _locale: interaction.locale }),
			value: `<@${ticket.authorId}> (\`${ticket.authorId}\`)`,
		});
		fields.push({
			name: __("commands.ticketinfo.field_title.archived", { _locale: interaction.locale }),
			value: ticket.closed ? "✅" : "❌",
		});

		if (ticket.type === TicketType.Commission || ticket.type === TicketType.Application) {
			fields.push({
				name: __("commands.ticketinfo.field_title.pending", { _locale: interaction.locale }),
				value: ticket.pending ? "✅" : "❌",
			});
		}

		if (ticket.type === TicketType.Commission) {
			fields.push({
				name: __("commands.ticketinfo.field_title.invoice_generated", { _locale: interaction.locale }),
				value: ticket.invoiceId ? "✅" : "❌",
			});
			fields.push({
				name: __("commands.ticketinfo.field_title.invoice_id", { _locale: interaction.locale }),
				value: ticket.invoiceId || "Not created",
			});
			fields.push({
				name: __("commands.ticketinfo.field_title.manager", { _locale: interaction.locale }),
				value: ticket.managerId ? `<@${ticket.managerId}>` : "Not claimed",
			});
			fields.push({
				name: __("commands.ticketinfo.field_title.freelancer", { _locale: interaction.locale }),
				value: ticket.freelancerId ? `<@${ticket.freelancerId}>` : "Not assigned",
			});
			fields.push({
				name: __("commands.ticketinfo.field_title.complete", { _locale: interaction.locale }),
				value: ticket.complete ? "✅" : "❌",
			});
			fields.push({
				name: __("commands.ticketinfo.field_title.commission_log_mid", { _locale: interaction.locale }),
				value: ticket.logMsg ?? "No message available",
			});
			fields.push({
				name: __("commands.ticketinfo.field_title.created_at", { _locale: interaction.locale }),
				value: `<t:${Math.floor(ticket.createdAt / 1000)}:F>`,
			});
			fields.push({
				name: __("commands.ticketinfo.field_title.updated_at", { _locale: interaction.locale }),
				value: `<t:${Math.floor(ticket.updatedAt / 1000)}:F>`,
			});
		}

		embed.addFields(
			fields.map((f) => {
				f.inline = true;
				return f;
			}),
		);
		interaction.reply({ embeds: [embed] });
	}
}
