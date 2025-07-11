import fs from "fs";
import path from "path";
import axios from "axios";
import {
	AllowNull,
	BelongsTo,
	Column,
	DataType,
	Default,
	ForeignKey,
	Model,
	PrimaryKey,
	Table,
} from "sequelize-typescript";

import { CLIENT_INSTANCE } from "@classes/Client";
import Logger from "@classes/Logger";

import { genId } from "@util/genId";
import { getDataDir } from "@util/getDataDir";

import SavedMessage from "./SavedMessage";

@Table({ tableName: "savedattachment", freezeTableName: true })
export default class SavedAttachment extends Model {
	@PrimaryKey
	@AllowNull(false)
	@Default(() => genId())
	@Column(DataType.STRING(10))
	id!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	originalUrl!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	url!: string;

	@AllowNull(true)
	@Column(DataType.TEXT)
	proxyUrl?: string;

	@AllowNull(false)
	@ForeignKey(() => SavedMessage)
	@Column(DataType.STRING(10))
	messageId!: string;

	@BelongsTo(() => SavedMessage)
	message!: SavedMessage;

	static downloadAttachment({ discordCdnUrl, messageId }: { discordCdnUrl: string; messageId: string }) {
		const client = CLIENT_INSTANCE!;
		return new Promise<string>((res, rej) => {
			if (!client.config.tickets.transcripts.downloadAttachments) {
				return res(discordCdnUrl);
			}
			const dataDir = getDataDir();
			const attachmentsDir = path.join(dataDir, "saved-attachments");
			if (!fs.existsSync(attachmentsDir)) {
				fs.mkdirSync(attachmentsDir);
				Logger.success("Created new saved-attachments directory in bot data directory.");
			}
			axios
				.get(discordCdnUrl, { responseType: "stream" })
				.then((response) => {
					Logger.info(`Started downloading attachment from CDN for message: ${messageId}.`);
					const messageDir = path.join(attachmentsDir, messageId);
					if (!fs.existsSync(messageDir)) {
						fs.mkdirSync(messageDir);
					}
					const filename = `${Date.now().toString()}-${discordCdnUrl.split("/").pop()?.split("?")[0]}`;
					const filePath = path.join(attachmentsDir, messageId, filename);
					response.data.pipe(fs.createWriteStream(filePath));
					response.data.on("end", () => {
						Logger.success(`Completed downloading attachment ${filename} to ${filePath}.`);
					});

					const apiUrl = client.config.main.api.url.endsWith("/")
						? client.config.main.api.url
						: client.config.main.api.url + "/";
					const url = `${apiUrl}transcripts/assets/${messageId}/${filename}`;
					return res(url);
				})
				.catch((err) => {
					Logger.error(
						`Failed to download file from CDN: ${discordCdnUrl}. Transcript will not have it replicated.`,
					);
					Logger.error(err);
					rej(err);
				});
		});
	}
}
