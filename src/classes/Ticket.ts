import dayjs from "dayjs";
import {
	AttachmentBuilder,
	CategoryChannel,
	ChannelType,
	Guild,
	MessageCreateOptions,
	PermissionsBitField,
	TextChannel,
	User,
} from "discord.js";
import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import Client, { CLIENT_INSTANCE } from "@classes/Client";
import Logger from "@classes/Logger";
import SavedAttachment from "@classes/SavedAttachment";
import SavedMessage from "@classes/SavedMessage";
import { TicketType } from "@classes/TicketManager";

import { archiveButton, unarchiveButton } from "@util/components/buttons";
import { deleteAssociatedPrompt } from "@util/deleteAssociatedPrompt";
import { errorEmbed, infoEmbed, warnEmbed } from "@util/embeds";
import { genId } from "@util/genId";
import { __ } from "@util/translate";

import LateArchive from "./LateArchive";
import Settings from "./Settings";

export type ArchiveActions = "delete" | "categorize" | "none" | "halt";

@Table({
	tableName: "tickets",
	freezeTableName: true,
})
export default class Ticket extends Model {
	@PrimaryKey
	@AllowNull(false)
	@Default(() => genId())
	@Column(DataType.STRING(10))
	id!: string;

	@Default(() => TicketType.Commission)
	@Column(DataType.INTEGER)
	type!: TicketType;

	@AllowNull(false)
	@Column(DataType.INTEGER)
	serial!: number;

	@AllowNull(false)
	@Column(DataType.TEXT)
	guildId!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	channelId!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	authorId!: string;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	closed!: boolean;

	@AllowNull(false)
	@Default(true)
	@Column(DataType.BOOLEAN)
	pending!: boolean;

	@Default(true)
	@Column(DataType.BOOLEAN)
	isFresh?: boolean | null;

	@AllowNull(true)
	@Column(DataType.TEXT)
	channelName?: string | null;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	complete!: boolean;

	@Column(DataType.TEXT)
	beforeArchiveName?: string | null;

	@Column(DataType.BOOLEAN)
	beforeArchivedPending?: boolean | null;

	@AllowNull(true)
	@Column(DataType.TEXT)
	welcomeMessageId!: string | null;

	// Commission specific
	@Column(DataType.TEXT)
	selectedService?: string | null;

	@Column(DataType.TEXT)
	invoiceId?: string | null;

	@Column(DataType.TEXT)
	managerId?: string | null;

	@Column(DataType.TEXT)
	freelancerId?: string | null;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	deliveryAccepted!: boolean;

	@Column(DataType.TEXT)
	logMsg?: string | null;

	@Column(DataType.DATE)
	deadline?: Date | null;

	@Column(DataType.TEXT)
	deadlineMessage?: string | null;

	@Column(DataType.DATE)
	lastQuoted?: Date | null;

	// Quote denying / quote-in-channels
	@Default("[]")
	@Column(DataType.TEXT)
	deniers!: string;

	@Column(DataType.TEXT)
	quoteChannelId?: string | null;

	// Preferences
	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	mentions!: boolean;

	client: Client = CLIENT_INSTANCE!;
	static client: Client = CLIENT_INSTANCE!;
	guild!: Guild;
	author!: User;
	channel!: TextChannel;
	locale: string = "en-US";

	stringTypes = ["commission", "application", "support"];

	getPendingChannelName(serial: number): string {
		if (this.type === TicketType.Commission || this.type === TicketType.Application) {
			return this.client.config.tickets.channelNameTemplates.pending.withPlaceholders({
				type: this.stringTypes[this.type].toLowerCase(),
				service: "pending",
				serialid: serial.toString(),
				username: this.author.username,
			});
		} else if (this.type === TicketType.Support) {
			return this.client.config.tickets.channelNameTemplates.support.withPlaceholders({
				type: this.stringTypes[this.type].toLowerCase(),
				service: "support",
				serialid: serial.toString(),
				username: this.author.username,
			});
		}
		return "unknown";
	}

	getProposalsChannelName(serial: number): string {
		return this.client.config.tickets.channelNameTemplates.quote.withPlaceholders({
			type: this.stringTypes[this.type].toLowerCase(),
			service: "quote",
			serialid: serial.toString(),
			username: this.author.username,
		});
	}

	createChannel(serial: number): Promise<TextChannel> {
		return new Promise<TextChannel>(async (res, rej) => {
			const name = this.getPendingChannelName(serial);
			let topic;
			let parent;
			const settings = await Settings.getOrCreate(this.guild.id);

			Logger.info("A new ticket was created:");
			console.table([
				{
					"Ticket type": this.stringTypes[this.type],
					"Guild ID": this.guild.id,
					"Author ID": this.author.id,
					"Channel name": name,
				},
			]);

			if (this.type === TicketType.Commission) {
				topic = __("tickets.topic_pattern.commission", {
					username: this.author.username,
					mention: this.author.toString(),
				});
				parent = settings.commissionCategory || undefined;
			} else if (this.type === TicketType.Application) {
				topic = __("tickets.topic_pattern.application", {
					username: this.author.username,
					mention: this.author.toString(),
				});
				parent = settings.applicationCategory || undefined;
			} else if (this.type === TicketType.Support) {
				topic = __("tickets.topic_pattern.support", {
					username: this.author.username,
					mention: this.author.toString(),
				});
				parent = settings.supportCategory || undefined;
			}
			const permissionOverwrites = [
				{
					id: this.guild.roles.everyone.id,
					deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
				},
				{
					id: this.author.id,
					allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
				},
			];

			if (settings.managerRole) {
				permissionOverwrites.push({
					id: settings.managerRole,
					allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
				});
			}

			this.channel = (await this.guild.channels
				.create({
					name: name,
					type: ChannelType.GuildText,
					topic: topic,
					parent: parent,
					permissionOverwrites,
				})
				.catch(rej)) as TextChannel;

			res(this.channel);
		});
	}

	async send(opts: MessageCreateOptions) {
		if (!this.channel) return;
		return this.channel.send(opts);
	}

	archive(reason?: string, forcedAction?: ArchiveActions): Promise<boolean> {
		return new Promise<boolean>(async (res, rej) => {
			const settings = await Settings.getOrCreate(this.guild.id);
			if (this.closed) return rej(new Error("This ticket is already archived."));

			const action = forcedAction || this.client.config.tickets.archive.action;

			this.closed = true;
			this.beforeArchivedPending = this.pending;
			this.pending = false;
			this.beforeArchiveName = this.channel?.name;
			await this.save();

			deleteAssociatedPrompt(this);

			const transcript = await this.fetchTranscript();
			const attachment = new AttachmentBuilder(Buffer.from(transcript.text), { name: transcript.name });

			this.sendArchivedLog(attachment);

			Logger.trace(
				`Archiving ticket: #${this.channel?.name} (${this.channel?.id}) initiated by: ${this.author?.username}.`,
			);

			if (this.client.config.tickets.archive.sendTranscriptToAuthorDms && this.author) {
				const dm = await this.author.createDM().catch(() => null);
				if (dm) {
					const ticketName =
						this.type === 0 ? `(${this.selectedService || ""}-${this.serial})` : `#${this.serial}`;
					const formattedReason = reason
						? `\n\n**${__("tickets.archive.successful.reason_text", { _locale: this.locale })}:** ${reason}`
						: "";
					const formattedDmNotif = __("tickets.archive.dm_notification", {
						_locale: this.locale,
						ticket_name: ticketName,
					});
					const embed = infoEmbed(`${formattedDmNotif}${formattedReason}`);
					dm.send({ embeds: [embed], files: [attachment] }).catch(() => {});
				}
			}

			if (action === "halt") return res(true);

			if (action === "delete") {
				// ACTION: Delete
				await this.channel.delete();
				return res(true /*is deleted channel*/);
			} else {
				// ACTION: Categorize or None
				if (!this.channel) return;
				this.channel.permissionOverwrites.cache.forEach((ow) => {
					if (settings.managerRole && ow.id === settings.managerRole) return; // Don't remove overwrites for the manager role
					if (ow.id === this.channel.guild.roles.everyone.id) return; // Don't remove overwrites of @everyone
					this.channel.permissionOverwrites.delete(ow.id);
				});
				if (action === "categorize") {
					// ACTION: Categorize (Default)
					if (settings.closedCategory) {
						const category = this.channel.guild.channels.cache.find(
							(c) => c.id === settings.closedCategory,
						);
						if (!(category instanceof CategoryChannel))
							return rej(
								new Error(
									__("tickets.archive.errors.archived_category_not_category", {
										_locale: this.locale,
									}),
								),
							);
						if (category.children.cache.size < 50) {
							await this.channel.setParent(category, { lockPermissions: false }).catch((err) => {
								this.channel.send({
									embeds: [
										errorEmbed(
											__("tickets.archive.errors.bad_archived_category", {
												_locale: this.locale,
												error: err.message,
											}),
										),
									],
								});
							});
						} else {
							await this.channel.send({
								embeds: [
									warnEmbed(
										__("tickets.archive.errors.archived_category_full", { _locale: this.locale }),
									),
								],
							});
						}
						const archivedName = this.client.config.tickets.channelNameTemplates.archived.withPlaceholders({
							type: this.stringTypes[this.type].toLowerCase(),
							serialid: this.serial.toString(),
							username: this.author.username,
						});

						this.channel.setName(archivedName).catch(() => {});
					}
				}
				await this.channel.send({
					embeds: [
						infoEmbed(
							`${reason ? `**${__("tickets.archive.successful.reason_text", { _locale: this.locale })}:** ${reason}\n\n` : ""}${__(
								"tickets.archive.successful.content",
								{ _locale: this.locale },
							)}`,
						).setAuthor({
							name: __("tickets.archive.successful.title", { _locale: this.locale }),
						}),
					],
					components: [unarchiveButton()],
				});
				await this.channel.send({ files: [attachment] });
			}

			return res(false /*is deleted channel*/);
		});
	}

	async sendArchivedLog(transcriptAttachment: AttachmentBuilder) {
		const type = this.stringTypes[this.type];
		const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);

		const channelLabel =
			this.client.config.tickets.archive.action === "delete" ? `#${this.channel.name}` : `<#${this.channel.id}>`;

		const fields = [
			{
				name: __("tickets.archive.log.field_label_ticket", { _locale: this.locale }),
				value: `${channelLabel} (${capitalizedType}, \`${this.id}\`)`,
			},
			{
				name: __("tickets.archive.log.field_label_author", { _locale: this.locale }),
				value: `@${this.author.username} (\`${this.author.id}\`)`,
			},
			{
				name: __("tickets.archive.log.field_label_time", { _locale: this.locale }),
				value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
			},
		];

		const embed = infoEmbed()
			.setTitle(__("tickets.archive.log.title", { _locale: this.locale }))
			.addFields(fields);

		await Settings.sendAdminLog(this.guildId, { embeds: [embed] });
		await Settings.sendAdminLog(this.guildId, { files: [transcriptAttachment] });
	}

	unarchive() {
		return new Promise<void>(async (res, rej) => {
			const settings = await Settings.getOrCreate(this.channel.guild.id);
			if (!this.closed) return rej("This ticket isn't archived and can't be unarchived.");
			const beforeArchiveName = this.beforeArchiveName;
			this.closed = false;
			this.pending = this.beforeArchivedPending || false;
			this.beforeArchiveName = null;
			await this.save();
			await this.channel.permissionOverwrites.edit(this.authorId, {
				SendMessages: true,
				ViewChannel: true,
			});
			try {
				if (settings.commissionCategory && this.type === TicketType.Commission) {
					await this.channel.setParent(settings.commissionCategory, { lockPermissions: false });
				} else {
					await this.channel.setParent(null, { lockPermissions: false });
				}
				if (settings.applicationCategory && this.type === TicketType.Application) {
					await this.channel.setParent(settings.applicationCategory, {
						lockPermissions: false,
					});
				} else {
					await this.channel.setParent(null, { lockPermissions: false });
				}
				if (settings.supportCategory && this.type === TicketType.Support) {
					await this.channel.setParent(settings.supportCategory, {
						lockPermissions: false,
					});
				} else {
					await this.channel.setParent(null, { lockPermissions: false });
				}
			} catch (err: any) {
				await this.channel.send({
					embeds: [
						errorEmbed(
							__("tickets.unarchive.errors.failed_to_move", {
								_locale: this.locale,
								message: err.message,
							}),
						),
					],
				});
			}
			await this.channel.send({
				embeds: [
					infoEmbed().setAuthor({
						name: __("tickets.unarchive.successful.title", { _locale: this.locale }),
					}),
				],
				components: [archiveButton()],
			});
			if (beforeArchiveName) await this.channel.setName(beforeArchiveName);
			res();
		});
	}

	createArchiveScheduler({
		userId,
		duration,
		messageCancels,
		reason,
	}: {
		userId: string;
		duration: number;
		messageCancels: boolean;
		reason: string | null;
	}): Promise<LateArchive> {
		const time = new Date(Date.now() + duration);
		return LateArchive.create({
			userId: userId,
			ticketId: this.id,
			archiveAfter: time,
			messageCancels: messageCancels,
			reason: reason,
		});
	}

	fetchTranscript() {
		return new Promise<{ text: string; name: string }>(async (res) => {
			const where: any = { ticketId: this.id };
			if (!this.client.config.tickets.transcripts.includeDeletedMessages) where.messageDeletedAt = null;
			const messages = await SavedMessage.findAll({
				where: where,
				order: [["createdAt", "ASC"]],
				include: [SavedAttachment],
			});
			Logger.trace(
				`Generating transcript for ticket: #${this.channel.name} (${this.channel.id}) initiated by: ${this.author.username}: ${messages.length} messages found.`,
			);
			const mappedMessages = messages
				.map((messageData) => {
					const authorTagOrId =
						this.client.users.cache.get(messageData.authorId)?.username || messageData.authorId;
					const deletedEditedTag = messageData.messageDeletedAt
						? ` ${__("transcript.file.tag.deleted", { _locale: this.locale })}`
						: messageData.messageUpdatedAt
							? ` ${__("transcript.file.tag.edited", { _locale: this.locale })}`
							: "";
					const content =
						messageData.content ||
						(messageData.attachments.length
							? __("transcript.file.attachment_count", {
									_locale: this.locale,
									count: messageData.attachments.length.toString(),
								})
							: __("transcript.file.no_content", { _locale: this.locale }));
					const optionalAttachments = messageData.attachments.length
						? `\n${messageData.attachments
								.map((a, idx) =>
									__("transcript.file.attachment_n", {
										_locale: this.locale,
										index: (idx + 1).toString(),
										url: a.url,
										discordUrl: a.originalUrl,
										proxyUrl: a.proxyUrl || "",
									}),
								)
								.join("\n")}`
						: "";
					const date = dayjs(messageData.messageCreatedAt).format(
						__("transcript.file.time_format", { _locale: this.locale }),
					);
					return `[${date}] @${authorTagOrId}${deletedEditedTag}: ${content}${optionalAttachments}`;
				})
				.join("\n");

			res({
				text: `${__("transcript.prefix", { _locale: this.locale })}\n${mappedMessages || __("transcript.empty", { _locale: this.locale })}`,
				name: `transcript-${this.id}.txt`,
			});
		});
	}

	async addUser(user: User): Promise<boolean> {
		if (
			this.channel.permissionOverwrites.cache.some((r) => r.id === user.id) &&
			this.channel.permissionOverwrites.cache.get(user.id)?.allow.has(PermissionsBitField.Flags.ViewChannel) &&
			this.channel.permissionOverwrites.cache.get(user.id)?.allow.has(PermissionsBitField.Flags.SendMessages)
		)
			return false;

		await this.channel.permissionOverwrites.edit(user.id, {
			SendMessages: true,
			ViewChannel: true,
		});

		return true;
	}

	async removeUser(user: User): Promise<boolean> {
		if (
			!(
				this.channel.permissionOverwrites.cache.some((r) => r.id === user.id) &&
				this.channel.permissionOverwrites.cache
					.get(user.id)!
					.allow.has(PermissionsBitField.Flags.ViewChannel) &&
				this.channel.permissionOverwrites.cache.get(user.id)!.allow.has(PermissionsBitField.Flags.SendMessages)
			)
		)
			return false;

		await this.channel.permissionOverwrites.delete(user.id);
		return true;
	}

	async sendReminder() {
		this.channel.send({
			embeds: [
				infoEmbed(__("tickets.no_quotes_reminder", { _locale: this.locale })).setAuthor({
					name: __("tickets.no_quotes_reminder.title", { _locale: this.locale }),
				}),
			],
		});
	}
}
