import { AnyComponentInteraction } from "nhandler";

import { BaseComponent } from "@util/baseInterfaces";

export default class DeleteMessageComponent extends BaseComponent {
	customId = "deletemsg";
	findFn = (event: AnyComponentInteraction) => event.customId === this.customId;

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (!interaction.message) return;
		interaction.message.delete().catch(() => null);
	}
}
