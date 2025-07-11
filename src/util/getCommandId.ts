import { CLIENT_INSTANCE } from "@classes/Client";

export function getCommandId(commandName: string) {
	const client = CLIENT_INSTANCE!;

	const fetchedCommand = client.application!.commands.cache.find((c) => c.name === commandName);
	return fetchedCommand?.id;
}
