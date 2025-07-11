import { CLIENT_INSTANCE } from "@classes/Client";

export enum LoggingLevel {
	MINIMAL,
	NORMAL,
	DEBUG,
}

export function loggingLevel() {
	const client = CLIENT_INSTANCE!;

	let numLevel = 0;
	const stringLevel = client.config.main.process.logging.level;

	if (stringLevel === "minimal") numLevel = 0;
	else if (stringLevel === "normal") numLevel = 1;
	else if (stringLevel === "debug") numLevel = 2;

	return numLevel;
}
