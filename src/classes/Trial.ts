import { Colors } from "discord.js";
import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

import Client, { CLIENT_INSTANCE } from "@classes/Client";
import { TicketManager, TicketType } from "@classes/TicketManager";
import ApplicationTicket from "@classes/Tickets/ApplicationTicket";
import UserPreferences from "@classes/UserPreferences";

import { infoEmbed } from "@util/embeds";
import { genId } from "@util/genId";
import { __ } from "@util/translate";

@Table({
	tableName: "trials",
	freezeTableName: true,
})
export default class Trial extends Model {
	client: Client = CLIENT_INSTANCE!;

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
	name!: string;

	@AllowNull(false)
	@Default(() => Date.now())
	@Column(DataType.DATE)
	lastNotified!: number;

	@AllowNull(false)
	@Column(DataType.DATE)
	deadline!: number;

	@AllowNull(false)
	@Default(true)
	@Column(DataType.BOOLEAN)
	active!: boolean;

	private async fetchApplicationTicket(): Promise<ApplicationTicket | null> {
		const ticket = await TicketManager.fetch({
			id: this.ticketId,
			type: TicketType.Application,
		});
		if (!ticket) return null;
		return ticket as ApplicationTicket;
	}

	private async fetchUser(ticket: ApplicationTicket) {
		return await this.client.users.fetch(ticket.authorId).catch(() => null);
	}

	async sendReminder({ ticket }: { ticket: ApplicationTicket }) {
		const user = await this.client.users.fetch(ticket.authorId).catch(() => null);

		if (!user) return;

		const locale = await UserPreferences.getLanguage(user.id);

		const content = __("trial.reminder", {
			_locale: locale,
			mention: user.toString(),
			username: user.username,
			relative_time: `<t:${Math.floor(this.deadline / 1000)}:R>`,
			trial_name: this.name,
		});

		ticket.channel.send({
			content: `<@${user?.id}>`,
			embeds: [
				infoEmbed(content)
					.setAuthor({ name: __("trial.reminder.title", { _locale: locale }) })
					.setColor(Colors.Greyple),
			],
		});
	}

	async sendDeadlineUp({ ticket }: { ticket: ApplicationTicket }) {
		const user = await this.fetchUser(ticket);

		if (!user) return;

		const locale = await UserPreferences.getLanguage(user.id);

		const content = __("trial.deadline_up", {
			_locale: locale,
			mention: user.toString(),
			username: user.username,
			trial_name: this.name,
		});

		ticket.channel.send({
			content: `<@${user?.id}>`,
			embeds: [infoEmbed(content).setAuthor({ name: __("trial.deadline_up.title", { _locale: locale }) })],
		});
	}

	async checkReminder() {
		const ticket = await this.fetchApplicationTicket();
		if (!ticket || ticket.closed) return;

		const interval = this.client.config.tickets.trials.reminders.interval * 60 * 60 * 1000;
		if (Date.now() - this.lastNotified > interval) {
			this.lastNotified = Date.now();
			await this.save();
			this.sendReminder({ ticket });
		}

		if (Date.now() > this.deadline) {
			this.active = false;
			await this.save();
			this.sendDeadlineUp({ ticket });
		}
	}
}
