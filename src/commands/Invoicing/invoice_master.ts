import { ApplicationCommandOptionType, ChatInputCommandInteraction, PermissionsBitField } from "discord.js";

import Settings from "@classes/Settings";

import { BaseCommand } from "@util/baseInterfaces";

import { runCancel } from "./invoice_cancel";
import { runCreate } from "./invoice_create";
import { runCreatePaid } from "./invoice_createpaid";
import { runLink } from "./invoice_link";
import { runMarkPaid } from "./invoice_markpaid";
import { runRefresh } from "./invoice_refresh";

export default class InvoiceCommand extends BaseCommand {
	name = "invoice";
	description = "Create an invoice for this commission.";
	metadata = {
		category: "Invoicing",
	};
	options = [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "create",
			description: "Create an invoice.",
			options: [
				{
					name: "amount",
					type: ApplicationCommandOptionType.Number,
					required: true,
					description: "The amount to be paid.",
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "cancel",
			description: "Cancel the invoice.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "markpaid",
			description: "Mark the generated invoice as paid.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "createpaid",
			description: "Create an invoice which is already marked as paid.",
			options: [
				{
					name: "amount",
					type: ApplicationCommandOptionType.Number,
					required: true,
					description: "The price of the invoice.",
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "refresh",
			description: "Refresh the invoice status.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "link",
			description: "Link back to the invoice embed.",
		},
	];

	defaultMemberPermissions = PermissionsBitField.Flags.ManageGuild;

	async run(interaction: ChatInputCommandInteraction, { settings }: { settings: Settings }): Promise<void> {
		const sub = interaction.options.getSubcommand();
		if (sub === "create") await runCreate(interaction, { settings });
		else if (sub === "cancel") await runCancel(interaction);
		else if (sub === "markpaid") await runMarkPaid(interaction, { settings });
		else if (sub === "createpaid") await runCreatePaid(interaction);
		else if (sub === "refresh") await runRefresh(interaction);
		else if (sub === "link") await runLink(interaction);
	}
}
