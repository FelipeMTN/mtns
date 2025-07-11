import Prompt from "@classes/Prompt";
import Ticket from "@classes/Ticket";

import { archiveButton } from "@util/components/buttons";
import { customerPanel } from "@util/components/customerPanel";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class SupportTicket extends Ticket {
	async start(startQuestions: boolean): Promise<void> {
		const welcomeMsg = await this.channel.send({
			content: this.client.config.tickets.enableMentionOnCreate ? `${this.author}` : undefined,
			embeds: [successEmbed(__("tickets.support_welcome", { _locale: this.locale }))],
			components: [customerPanel(this.locale), archiveButton()],
		});
		this.welcomeMessageId = welcomeMsg.id;
		await this.save();
		if (this.client.config.prompts.support && startQuestions) await this.startPrompts();
	}

	async startPrompts() {
		const prompt = await Prompt.create({
			userId: this.authorId,
			guildId: this.guildId,
			ticketId: this.id,
		});
		await prompt.sendNext();
	}

	finalizePrompts(prompt: Prompt) {
		return new Promise<void>(async (res) => {
			const responses = prompt.decodeResponses();
			res();
			const welcomeMsg = this.welcomeMessageId
				? await this.channel.messages.fetch(this.welcomeMessageId).catch(() => null)
				: null;
			if (welcomeMsg) {
				const formattedResponses = responses
					.map(({ name, value }: { name: string; value: string }) => `**${name}**:\n${value}`)
					.join("\n");
				await welcomeMsg.edit({
					embeds: [
						successEmbed(
							`${__("tickets.support_welcome", { _locale: this.locale })}\n\n${formattedResponses}`,
						),
					],
				});
			}
		});
	}
}
