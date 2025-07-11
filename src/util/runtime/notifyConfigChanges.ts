import { watchFile } from "fs";

import { CLIENT_INSTANCE } from "@classes/Client";
import Logger from "@classes/Logger";

export function notifyConfigChanges() {
	watchFile("./config.yml", () => {
		if (!CLIENT_INSTANCE?.readyTimestamp) return;
		Logger.warn("The config file has been changed. Please restart the bot to apply changes.");
	});
}
