import { Message } from "discord.js";
import { AllowNull, Column, DataType, Default, HasMany, Model, PrimaryKey, Table } from "sequelize-typescript";

import Logger from "@classes/Logger";
import { AnyTicket } from "@classes/TicketManager";

import { genId } from "@util/genId";

import SavedAttachment from "./SavedAttachment";

@Table({ tableName: "savedmessages", freezeTableName: true })
export default class SavedMessage extends Model {
	@PrimaryKey
	@AllowNull(false)
	@Default(() => genId())
	@Column(DataType.STRING(10))
	id!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	ticketId!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	authorId!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	guildId!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	channelId!: string;

	@AllowNull(false)
	@Default("")
	@Column(DataType.TEXT)
	content!: string;

	@HasMany(() => SavedAttachment)
	attachments!: SavedAttachment[];

	@AllowNull(false)
	@Column(DataType.TEXT)
	discordMessageId!: string;

	@AllowNull(false)
	@Column(DataType.DATE)
	messageCreatedAt!: Date;

	@AllowNull(true)
	@Column(DataType.DATE)
	messageUpdatedAt?: Date;

	@AllowNull(true)
	@Column(DataType.DATE)
	messageDeletedAt?: Date;

	static async handleSend(message: Message, ticket: AnyTicket, disableSaving: boolean = false) {
		const savedMessage = await SavedMessage.create({
			ticketId: ticket.id,
			authorId: message.author.id,
			guildId: message.guildId!,
			channelId: message.channelId,
			content: message.content,
			discordMessageId: message.id,
			messageCreatedAt: message.createdAt,
		});
		if (disableSaving) {
			Logger.trace("Saved message (disabled saving):", savedMessage.discordMessageId);
			return;
		}
		for (const discordAttachment of message.attachments.values()) {
			const data = {
				messageId: savedMessage.id,
				url: discordAttachment.url,
				originalUrl: discordAttachment.url,
				proxyUrl: discordAttachment.proxyURL,
			};
			SavedAttachment.downloadAttachment({ discordCdnUrl: discordAttachment.url, messageId: message.id })
				.then(async (url: string) => {
					data.url = url;
					const savedAttachment = await SavedAttachment.create(data);
					Logger.trace("Saved attachment:", savedAttachment.url);
				})
				.catch(async () => {
					const savedAttachment = await SavedAttachment.create(data);
					Logger.trace("Saved attachment (not downloaded):", savedAttachment.url);
				});
		}

		Logger.trace("Saved message:", savedMessage.discordMessageId);
	}

	async handleUpdate(newMsg: Message) {
		this.content = newMsg.content;
		this.messageUpdatedAt = newMsg.editedAt ?? undefined;
		await this.save();

		Logger.trace("Edited message content:", this.discordMessageId);
	}

	async handleDelete() {
		this.messageDeletedAt = new Date();
		await this.save();

		Logger.trace("Marked saved message as deleted:", this.discordMessageId);
	}
}
