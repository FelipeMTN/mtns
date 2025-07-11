import EventEmitter from "node:events";
import { Sequelize } from "sequelize-typescript";

import Bank from "@classes/Bank";
import Blacklist from "@classes/Blacklist";
import Client from "@classes/Client";
import CommissionLogChannel from "@classes/CommissionLogChannel";
import Invoice from "@classes/Invoice";
import LateArchive from "@classes/LateArchive";
import Logger from "@classes/Logger";
import Profile from "@classes/Profile";
import Prompt from "@classes/Prompt";
import Quote from "@classes/Quote";
import Review from "@classes/Review";
import SavedAttachment from "@classes/SavedAttachment";
import SavedMessage from "@classes/SavedMessage";
import ServiceCut from "@classes/ServiceCut";
import Settings from "@classes/Settings";
import Ticket from "@classes/Ticket";
import Transaction from "@classes/Transaction";
import Trial from "@classes/Trial";
import UserPreferences from "@classes/UserPreferences";
import Withdrawal from "@classes/Withdrawal";

import { LoggingLevel, loggingLevel } from "@util/loggingLevel";

export default class Database extends EventEmitter {
	private sequelize: Sequelize;
	private readonly client: Client;

	constructor(client: Client) {
		super();
		this.client = client;
		this.sequelize = new Sequelize(client.config.main.dbUrl, {
			logging: false,
			models: [
				Bank,
				Blacklist,
				CommissionLogChannel,
				Invoice,
				LateArchive,
				Profile,
				Prompt,
				Quote,
				Review,
				ServiceCut,
				Settings,
				Ticket,
				SavedMessage,
				SavedAttachment,
				Transaction,
				Trial,
				UserPreferences,
				Withdrawal,
			],
		});

		let opts: { force?: boolean; alter?: boolean; logging?: (msg: string) => void };
		if (this.client.config.main.process.purgeDatabaseOnRun) {
			Logger.warn(
				"Forcible database sync enabled. Tables will be purged. Set 'process.purgeDatabaseOnRun' to false to disable this.",
			);
			opts = { force: true };
		} else {
			opts = { alter: true };
		}

		if (this.client.config.main.process.logging.connectionDebug) {
			opts.logging = (...msg) => Logger.log(...msg);
		}

		this.sequelize.sync(opts).then(() => {
			this.authenticate().catch((err) => {
				Logger.error("Unable to connect to the database:", err);
				process.exit(1);
			});
		});
	}

	async authenticate() {
		try {
			await this.sequelize.authenticate();
			if (loggingLevel() > LoggingLevel.MINIMAL)
				Logger.runtime("Database connection has been established successfully.");
			this.emit("connected");
		} catch (err) {
			Logger.error("Unable to connect to the database:", err);
			process.exit(1);
		}
	}
}
