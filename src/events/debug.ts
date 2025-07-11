import { Event } from "nhandler";

import Client from "@classes/Client";
import Logger from "@classes/Logger";

export default class DebugEvent implements Event {
	client!: Client;
	name = "debug";

	async run(content: string) {
		if (this.client.config.main.process.logging.connectionDebug) {
			Logger.log(content);
		}
	}
}
