import { ActivityType } from "discord.js";
import { Event } from "nhandler";

import Client from "@classes/Client";
import Invoice from "@classes/Invoice";
import Logger from "@classes/Logger";

import { LoggingLevel, loggingLevel } from "@util/loggingLevel";

import { checkDeadlines } from "@intervals/checkDeadlines";
import { pollForPayments } from "@intervals/pollForPayments";
import { sendNobodyQuotingReminders } from "@intervals/quotingReminders";
import { runLateArchiveInterval } from "@intervals/scheduledArchives";
import { checkTrialReminders } from "@intervals/trialReminders";

export default class ReadyEvent implements Event {
	client!: Client;
	name = "ready";
	once = true;

	async run() {
		const startupTime = ((Date.now() - this.client.initDate) / 1000).toFixed(2);
		Logger.success(`The bot is ready in ${startupTime}s as ${this.client.user?.username}.`);

		if (this.client.config.main.updateCommands) {
			Client.commandHandler.updateApplicationCommands();
			if (loggingLevel() > LoggingLevel.MINIMAL) Logger.warn("Application commands updated.");
		}

		this.runIntervals();

		this.client.user?.setPresence({});

		let data: Record<string, any> = {
			status: this.client.config.main.status.status,
		};

		if (this.client.config.main.status.activity)
			data.activities = [{ name: this.client.config.main.status.activity, type: ActivityType.Playing }];

		this.client.user?.setPresence(data);
	}

	async runIntervals() {
		setInterval(() => {
			Logger.trace(`Performing scheduled tasks (next in 30 seconds).`);
			runLateArchiveInterval();
			checkDeadlines();
			checkTrialReminders();
			sendNobodyQuotingReminders();
			pollForPayments();
		}, 30 /*seconds*/ * 1000);
	}
}
