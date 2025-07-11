import Logger from "@classes/Logger";

import { getPackageVersion } from "@util/runtime/getPackageVersion";

export const printWelcome = () => {
	const version = getPackageVersion();
	console.log(
		"                                      \n" +
			" __    _     _   _      _____     _   \n" +
			"|  |  |_|___| |_| |_   | __  |___| |_ \n" +
			"|  |__| | . |   |  _|  | __ -| . |  _|\n" +
			"|_____|_|_  |_|_|_|    |_____|___|_|  \n" +
			"        |___|                         \n",
	);
	Logger.runtime(`Light Services Bot • Ticketing & Invoicing • v${version}`);
	Logger.runtime("Starting the bot...");
};
