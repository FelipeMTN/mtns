import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	Colors,
	EmbedBuilder,
	GuildBasedChannel,
	PermissionsBitField,
	TextChannel,
	User,
} from "discord.js";

import Bank from "@classes/Bank";
import CommissionLogChannel from "@classes/CommissionLogChannel";
import Invoice from "@classes/Invoice";
import Logger from "@classes/Logger";
import Profile from "@classes/Profile";
import Prompt from "@classes/Prompt";
import Settings from "@classes/Settings";
import Ticket, { ArchiveActions } from "@classes/Ticket";

import { archiveButton } from "@util/components/buttons";
import { customerPanel } from "@util/components/customerPanel";
import { disableButtons } from "@util/components/disableButtons";
import { infoEmbed, successEmbed } from "@util/embeds";
import { findServiceData } from "@util/findServiceData";
import { __ } from "@util/translate";
import { decodeGzip } from "@util/web/decodeGzip";

import { ConfigService } from "@schemas/services";

enum State {
	Available,
	Claimed,
	Archived,
}

export default class CommissionTicket extends Ticket {
	get quoteAndMessageRows() {
		return [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder({
					customId: `quote-${this.id}`,
					label: __("quoting.create.button_label", { _locale: this.locale }),
					style: ButtonStyle.Success,
					emoji: this.client.config.customization.buttons.emojis.quote || "💵",
				}),
				new ButtonBuilder({
					customId: `message-new-${this.id}`,
					label: __("messaging.c2f.button_label", { _locale: this.locale }),
					style: ButtonStyle.Secondary,
					emoji: this.client.config.customization.buttons.emojis.message || "✉️",
				}),
			),
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder({
					customId: `denycommission-${this.id}-1`,
					label: __("commissions.deny.button_label", {
						_locale: this.locale,
						reason: __("quoting.deny.preset_reason.1", { _locale: this.locale }),
					}),
					style: ButtonStyle.Danger,
					emoji: this.client.config.customization.buttons.emojis.archive || "🗑️",
				}),
				new ButtonBuilder({
					customId: `denycommission-${this.id}-2`,
					label: __("commissions.deny.button_label", {
						_locale: this.locale,
						reason: __("quoting.deny.preset_reason.2", { _locale: this.locale }),
					}),
					style: ButtonStyle.Danger,
					emoji: this.client.config.customization.buttons.emojis.archive || "🗑️",
				}),
				new ButtonBuilder({
					customId: `denycommission-${this.id}-3`,
					label: __("commissions.deny.button_label", {
						_locale: this.locale,
						reason: __("quoting.deny.preset_reason.3", { _locale: this.locale }),
					}),
					style: ButtonStyle.Danger,
					emoji: this.client.config.customization.buttons.emojis.archive || "🗑️",
				}),
				new ButtonBuilder({
					customId: `denycommission-${this.id}-x`,
					label: __("commissions.deny.button_label", {
						_locale: this.locale,
						reason: __("quoting.deny.preset_reason.custom", { _locale: this.locale }),
					}),
					style: ButtonStyle.Danger,
					emoji: this.client.config.customization.buttons.emojis.archive || "🗑️",
				}),
			),
		];
	}

	async start(startQuestions: boolean): Promise<void> {
		const welcomeMsg = await this.channel.send({
			content: this.client.config.tickets.enableMentionOnCreate ? `${this.author}` : undefined,
			embeds: [successEmbed(__("tickets.commission_welcome", { _locale: this.locale }))],
			components: [customerPanel(this.locale), archiveButton()],
		});
		this.welcomeMessageId = welcomeMsg.id;
		await this.save();
		if (startQuestions) await this.startPrompts();
	}

	finalizePrompts(prompt: Prompt) {
		return new Promise<void>(async (res, rej) => {
			if (!this.selectedService) return rej("finalizePrompts(): ticket.selectedService is blank.");

			const serviceData: ConfigService | undefined = findServiceData(this.client, this.selectedService);
			if (!serviceData) return res();

			this.quoteChannelId = await this.createQuoteChannelIfEnabled();

			const responses = prompt.decodeResponses();

			const fields = [
				{
					name: __("commissions.log.field_label_ticket", { _locale: this.locale }),
					value: `<#${this.channel.id}> (\`${this.id}\`)`,
				},
				{
					name: __("commissions.log.field_label_service", { _locale: this.locale }),
					value: serviceData.name || this.selectedService,
				},
				...responses,
			];

			const attachments = prompt.attachments?.length ? decodeGzip(prompt.attachments) : [];
			this.sendLog(fields, attachments);
			res();

			this.pending = false;
			await this.save();

			if (this.client.config.tickets.sendPingPrefSelection) {
				this.sendPreferenceSelection();
			}

			const existingTickets = await Ticket.findAll({ where: { authorId: this.authorId } });
			if (existingTickets.length <= 1 && this.client.config.tickets.sendNewUserWelcome) {
				this.sendNewUserWelcome();
			}

			const finalName = this.client.config.tickets.channelNameTemplates.commissions.withPlaceholders({
				type: "commission",
				service: serviceData.channelName || serviceData.name,
				serialid: this.serial.toString(),
				username: this.author.username,
			});

			await this.channel.setName(finalName);

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
							`${__("commissions.finish_prompting.content", { _locale: this.locale })}\n\n${formattedResponses}`,
						).setAuthor({
							name: __("commissions.finish_prompting.title", { _locale: this.locale }),
						}),
					],
				});
			}
		});
	}

	sendPreferenceSelection() {
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`pingpref-${this.id}-enable`)
				.setLabel(__("generic.enable_text", { _locale: this.locale }))
				.setStyle(ButtonStyle.Success)
				.setDisabled(false),
			new ButtonBuilder()
				.setCustomId(`pingpref-${this.id}-disable`)
				.setLabel(__("generic.already_disabled_text", { _locale: this.locale }))
				.setStyle(ButtonStyle.Danger)
				.setDisabled(true),
		);
		this.channel.send({
			embeds: [infoEmbed(__("tickets.ping_preference.currently_off", { _locale: this.locale }))],
			components: [row],
		});
	}

	async sendLog(fields: { name: string; value: string }[], files: any = []) {
		let quoteChannelOrLogChannel;
		if (this.client.config.tickets.quotesInChannels && this.quoteChannelId) {
			quoteChannelOrLogChannel = await this.fetchQuoteChannel();
		} else {
			quoteChannelOrLogChannel = await CommissionLogChannel.getChannel(this.selectedService!, this.guild.id);
		}
		if (!quoteChannelOrLogChannel) return;
		const serviceData = findServiceData(this.client, this.selectedService!);
		if (!serviceData) return;
		const logMsg = await quoteChannelOrLogChannel.send({
			content: serviceData.roleId ? `<@&${serviceData.roleId}>` : undefined,
			embeds: [
				successEmbed()
					.addFields(
						fields.map(({ name, value }: { name: string; value: string }) => ({
							name,
							value: value?.toString() || __("generic.invalid_field_text", { _locale: this.locale }),
						})),
					)
					.setTitle(__("commissions.log.title", { _locale: this.locale }))
					.setTimestamp(null),
			],
			components: this.quoteAndMessageRows,
			files: files,
		});
		this.logMsg = logMsg.id;
		await this.save();
		return logMsg;
	}

	async repostLog() {
		const prompt = await Prompt.findOne({ where: { ticketId: this.id } });
		if (!prompt || !prompt.responsesJson?.length) return;
		const responses = prompt.decodeResponses();
		const attachments = prompt.attachments?.length ? decodeGzip(prompt.attachments) : [];
		this.sendLog(responses, attachments);
	}

	protected async createQuoteChannelIfEnabled(): Promise<string | null> {
		if (!this.client.config.tickets.quotesInChannels) return null;
		const name = this.getProposalsChannelName(this.serial);
		const settings = await Settings.getOrCreate(this.guild.id);
		const parent = settings.quotesCategory || undefined;
		const permissionOverwrites: any = [
			{
				id: this.guild.roles.everyone.id,
				deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
			},
		];

		if (settings.managerRole) {
			permissionOverwrites.push({
				id: settings.managerRole,
				allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
			});
		}

		const serviceRole = findServiceData(this.client, this.selectedService!);
		if (serviceRole?.roleId) {
			// If service role for this ticket was found, add it to the permission overwrites
			const role = await this.guild.roles.fetch(serviceRole.roleId).catch(() => null);
			if (role) {
				const membersInRole = role.members.map((member) => member.id);

				for (const member of membersInRole) {
					permissionOverwrites.push({
						id: member,
						allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
					});
				}
			}
		} else if (settings.freelancerRole) {
			// If it hasn't been found, add to all freelancers as a catch-all
			const role = await this.guild.roles.fetch(settings.freelancerRole).catch(() => null);
			if (role) {
				const membersInRole = role.members.map((member) => member.id);
				for (const member of membersInRole) {
					permissionOverwrites.push({
						id: member,
						allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
					});
				}
			}
		}

		const channel = await this.guild.channels.create({
			name: name,
			type: ChannelType.GuildText,
			parent: parent,
			permissionOverwrites,
		});

		this.quoteChannelId = channel.id;
		await this.save();

		return channel.id;
	}

	private async fetchQuoteChannel() {
		if (!this.quoteChannelId) return null;
		let quoteChannelOrLogChannel = await this.guild.channels.fetch(this.quoteChannelId).catch(() => null);
		if (!(quoteChannelOrLogChannel instanceof TextChannel)) return null;
		return quoteChannelOrLogChannel;
	}

	async deleteQuoteChannel() {
		const channel = await this.fetchQuoteChannel();
		if (!channel) return;
		await channel.delete();
		this.quoteChannelId = null;
		await this.save();
	}

	archive(reason?: string, forcedAction?: ArchiveActions) {
		return new Promise<boolean>(async (res, rej) => {
			this.deleteQuoteChannel();
			super
				.archive(reason, forcedAction)
				.then(async (deleted: boolean) => {
					await this.updateLog();
					res(deleted);
				})
				.catch(rej);
		});
	}

	unarchive(): Promise<void> {
		return new Promise<void>(async (res, rej) => {
			if (this.client.config.tickets.quotesInChannels) {
				await this.createQuoteChannelIfEnabled();
				await this.repostLog();
			}
			super
				.unarchive()
				.then(async () => {
					await this.updateLog();
					res();
				})
				.catch(rej);
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

	async sendNewUserWelcome() {
		if (!this.client.config.tickets.sendNewUserWelcome) return;
		const embed = infoEmbed(
			__("tickets.commission.welcome_new_user", {
				_locale: this.locale,
				mention: this.author.toString(),
				username: this.author.username,
				tag: this.author.username,
			}),
		).setColor(Colors.Blurple);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("deletemsg")
				.setStyle(ButtonStyle.Danger)
				.setLabel(__("generic.dismiss_text", { _locale: this.locale })),
		);
		this.channel.send({
			embeds: [embed],
			components: [row],
		});
	}

	async fetchLog() {
		try {
			if (!this.logMsg) return null;
			let commissionLog;
			if (this.client.config.tickets.quotesInChannels && this.quoteChannelId) {
				commissionLog = await this.guild.channels.fetch(this.quoteChannelId).catch(() => null);
				if (!(commissionLog instanceof TextChannel)) {
					commissionLog = null;
				}
			} else {
				commissionLog = await CommissionLogChannel.getChannel(this.selectedService!, this.guild.id);
			}
			if (!commissionLog) return null;
			return await commissionLog.messages.fetch(this.logMsg).catch(() => null);
		} catch (err) {
			console.error(err);
			return null;
		}
	}

	async updateLog() {
		let state: State = this.closed ? State.Archived : this.freelancerId ? State.Claimed : State.Available;
		const commissionMessage = await this.fetchLog();
		if (!commissionMessage) return;
		const embed = EmbedBuilder.from(commissionMessage.embeds[0]);
		if (state === State.Claimed) {
			await commissionMessage.edit({
				embeds: [
					embed
						.setColor(Colors.Yellow)
						.setTitle(
							`${__("commissions.log.tag.claimed", { _locale: this.locale })} ${__("commissions.log.title", { _locale: this.locale })}`,
						),
				],
				components: disableButtons(commissionMessage.components),
			});
		} else if (state === State.Archived) {
			await commissionMessage.edit({
				embeds: [
					embed
						.setColor(Colors.Red)
						.setTitle(
							`${__("commissions.log.tag.archived", { _locale: this.locale })} ${__("commissions.log.title", { _locale: this.locale })}`,
						),
				],
				components: disableButtons(commissionMessage.components),
			});
		} else if (state === State.Available) {
			await commissionMessage.edit({
				embeds: [
					embed
						.setColor(this.client.config.customization.embeds.colors.normal)
						.setTitle(__("commissions.log.title", { _locale: this.locale })),
				],
				components: this.quoteAndMessageRows,
			});
		}
	}

	assign(user: User) {
		return new Promise<void>(async (res, rej) => {
			const profile = await Profile.findOne({ where: { userId: user.id } });
			if (!profile) return rej(new Error("User doesn't have a profile."));
			await this.deleteQuoteChannel();
			await this.addUser(user);
			await this.update({ freelancerId: user.id });
			res();
		});
	}

	unassign() {
		return new Promise<void>(async (res, rej) => {
			if (!this.freelancerId) return;
			const freelancer = await this.guild.members.fetch(this.freelancerId).catch(() => null);
			if (!freelancer) return rej(new Error("Unable to find the freelancer for this ticket."));
			const profile = await Profile.findOne({
				where: { userId: freelancer.user.id },
			});
			if (!profile) return rej(new Error("User doesn't have a profile."));
			if (this.client.config.tickets.quotesInChannels) {
				await this.createQuoteChannelIfEnabled();
				await this.repostLog();
			}
			await this.removeUser(freelancer.user);
			await this.update({ freelancerId: null });
			res();
		});
	}

	async acceptDelivery() {
		if (this.deliveryAccepted) {
			throw new Error("Already accepted");
		}

		this.deliveryAccepted = true;
		await this.save();

		const invoice = await Invoice.findOne({ where: { id: this.invoiceId } });
		if (!invoice)
			return Logger.warn(
				`Not able to credit money for commission ${this.id} because invoice for it wasn't created.`,
			);

		const amountToFreelancer = invoice.amount * (1 - this.client.config.tickets.serviceCut / 100);
		const amountToService = invoice.amount * (this.client.config.tickets.serviceCut / 100);
		await Bank.creditService({
			amount: amountToService,
			guildId: this.guildId,
			note: __("bank.service_cut_transaction_note", {
				_locale: this.locale,
				ticket_name: `${this.selectedService}-${this.serial} (${this.id})`,
			}),
			noteHtml: `Revenue for order <code>${this.selectedService}-${this.serial}</code> (<code>${this.id}</code>)`,
		});

		if (this.freelancerId) {
			const freelancerBank = await Bank.getOrCreate(this.freelancerId);
			await freelancerBank.creditRevenue({
				amount: amountToFreelancer,
				note: __("bank.revenue_transaction_note", {
					_locale: this.locale,
					ticket_name: `${this.selectedService}-${this.serial} (${this.id})`,
				}),
				noteHtml: `Revenue for order <code>${this.selectedService}-${this.serial}</code> (<code>${this.id}</code>)`,
			});
		}
	}

	async denyDelivery() {
		if (this.deliveryAccepted) {
			throw new Error("Already denied");
		}

		this.complete = false;
		this.deliveryAccepted = false;
		await this.save();
	}

	async denyProposal(freelancer: User, reason: string) {
		const deniers = JSON.parse(this.deniers);
		if (deniers.includes(freelancer.id)) {
			throw new Error("You already denied this commission.");
		}
		this.deniers = JSON.stringify([...deniers, freelancer.id]);
		await this.save();

		const dm = await freelancer.createDM().catch(() => null);
		if (dm) {
			const rows = [];
			if (this.client.config.tickets.quotesInChannels) {
				rows.push(
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setLabel(__("commissions.deny.rejoin", { _locale: this.locale }))
							.setStyle(ButtonStyle.Primary)
							.setCustomId(`denyrejoin-${this.id}`),
					),
				);
			}
			dm.send({ embeds: [infoEmbed(`You denied #${this.selectedService}-${this.serial}.`)], components: rows });
		}

		const fields = [];
		fields.push({
			name: __("quoting.deny.fields.ticket", { _locale: this.locale }),
			value: `<#${this.channel.id}>`,
		});
		if (this.client.config.tickets.quotesInChannels) {
			fields.push({
				name: __("quoting.deny.fields.quote_channel", { _locale: this.locale }),
				value: `<#${this.quoteChannelId}>`,
			});
		}
		fields.push({
			name: __("quoting.deny.fields.freelancer", { _locale: this.locale }),
			value: `<@${freelancer.id}>`,
		});
		fields.push({ name: __("quoting.deny.fields.reason", { _locale: this.locale }), value: reason || "Unknown" });

		await Settings.sendAdminLog(this.guildId, {
			embeds: [
				infoEmbed()
					.setColor(Colors.DarkerGrey)
					.setTitle(__("quoting.deny.log.title", { _locale: this.locale }))
					.addFields(fields),
			],
		});

		if (this.client.config.tickets.quotesInChannels && this.quoteChannelId) {
			const quoteChannel: GuildBasedChannel | null = await this.guild.channels
				.fetch(this.quoteChannelId)
				.catch(() => null);
			if (!(quoteChannel instanceof TextChannel)) return;
			quoteChannel.permissionOverwrites.edit(freelancer.id, {
				ViewChannel: false,
				SendMessages: false,
			});
		}
	}

	async rejoinProposal(user: User) {
		if (this.deniers.includes(user.id)) {
			this.deniers = JSON.stringify(JSON.parse(this.deniers).filter((id: string) => id !== user.id));
			this.save();
		}

		if (this.client.config.tickets.quotesInChannels && this.quoteChannelId) {
			const quoteChannel: GuildBasedChannel | null = await this.guild.channels
				.fetch(this.quoteChannelId)
				.catch(() => null);
			if (!(quoteChannel instanceof TextChannel)) return;
			await quoteChannel.permissionOverwrites.edit(user.id, {
				ViewChannel: true,
				SendMessages: true,
			});
		}
	}
}
