import { AnyComponentInteraction, Command } from "nhandler";

import Client from "@classes/Client";

import { BaseComponent } from "@util/baseInterfaces";

import BankCommand from "../../commands/Banking/bank";

export default class BankPanelComponent extends BaseComponent {
	customId = "bankpanel";

	async run(interaction: AnyComponentInteraction): Promise<void> {
		const [, action] = interaction.customId.split("-");
		if (action === "viewbalance") {
			const cmd = Client.commandHandler.commands.find((cmd: Command) => cmd.name === "bank");
			if (cmd instanceof BankCommand) {
				await cmd.runBalance(interaction as any);
			}
		}

		if (action === "transactions") {
			const cmd = Client.commandHandler.commands.find((cmd: Command) => cmd.name === "bank");
			if (cmd instanceof BankCommand) {
				await cmd.runTransactions(interaction as any);
			}
		}
	}
}
