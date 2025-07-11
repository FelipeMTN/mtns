import Prompt from "@classes/Prompt";
import Settings from "@classes/Settings";
import Ticket from "@classes/Ticket";

import { archiveButton } from "@util/components/buttons";
import { customerPanel } from "@util/components/customerPanel";
import { successEmbed } from "@util/embeds";
import { findServiceData } from "@util/findServiceData";
import { __ } from "@util/translate";
import { decodeGzip } from "@util/web/decodeGzip";

import { ConfigService } from "@schemas/services";

export default class ApplicationTicket extends Ticket {
	async start(startQuestions: boolean): Promise<void> {
		const welcomeMsg = await this.channel.send({
			content: this.client.config.tickets.enableMentionOnCreate ? `${this.author}` : undefined,
			embeds: [successEmbed(__("tickets.application_welcome", { _locale: this.locale }))],
			components: [customerPanel(this.locale), archiveButton()],
		});
		this.welcomeMessageId = welcomeMsg.id;
		await this.save();
		if (startQuestions) await this.startPrompts();
	}

	async sendLog(fields: { name: string; value: string }[], files: any = []) {
		await Settings.sendAdminLog(this.guildId, {
			embeds: [
				successEmbed()
					.addFields(
						fields.map(({ name, value }: { name: string; value: string }) => ({
							name,
							value: value?.toString() || __("generic.invalid_field_text", { _locale: this.locale }),
						})),
					)
					.setTitle(__("applications.log.title", { _locale: this.locale }))
					.setTimestamp(null),
			],
			files: files,
		});
	}

	async startPrompts() {
		const prompt = await Prompt.create({
			userId: this.authorId,
			guildId: this.guildId,
			ticketId: this.id,
		});
		await prompt.sendNext();
	}

	// noinspection JSUnusedGlobalSymbols
	finalizePrompts(prompt: Prompt) {
		return new Promise<void>(async (res, rej) => {
			if (!this.selectedService) return rej("finalize(): ticket.selectedService is blank.");

			const serviceData: ConfigService[] = this.selectedService
				.split(", ")
				.map((s) => findServiceData(this.client, s))
				.filter((s) => s !== undefined) as ConfigService[];
			if (!serviceData.length) return res();

			const responses = prompt.decodeResponses();

			const logFields = [
				{
					name: __("applications.log.field_label_ticket", { _locale: this.locale }),
					value: `<#${this.channel.id}> (\`${this.id}\`)`,
				},
				{
					name: __("applications.log.field_label_service", { _locale: this.locale }),
					value: serviceData.map((s) => s.name).join(", ") || this.selectedService,
				},
				...responses,
			];

			const attachments = prompt.attachments?.length ? decodeGzip(prompt.attachments) : [];
			this.sendLog(logFields, attachments);
			res();

			this.pending = false;
			await this.save();

			const finalName = this.client.config.tickets.channelNameTemplates.applications.withPlaceholders({
				type: "application",
				service: "application",
				serialid: this.serial.toString(),
				username: this.author.username,
			});

			await this.channel.setName(finalName);

			const welcomeMsg = this.welcomeMessageId
				? await this.channel.messages.fetch(this.welcomeMessageId).catch(() => null)
				: null;
			if (welcomeMsg) {
				const welcomeMsgFields = [
					{
						name: __("applications.log.field_label_service", { _locale: this.locale }),
						value: serviceData.map((s) => s.name).join(", ") || this.selectedService,
					},
					...responses,
				];
				const formattedResponses = welcomeMsgFields
					.map(({ name, value }: { name: string; value: string }) => `**${name}**:\n${value}`)
					.join("\n");
				await welcomeMsg.edit({
					embeds: [
						successEmbed(
							`${__("applications.finish_prompting.content", { _locale: this.locale })}\n\n${formattedResponses}`,
						).setAuthor({
							name: __("applications.finish_prompting.title", { _locale: this.locale }),
						}),
					],
				});
			}
		});
	}
}
