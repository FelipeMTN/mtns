import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import Client from "../classes/Client";
import { ensureDependencies } from "./runtime/ensureDependencies";

export {};
declare global {
	interface String {
		withPlaceholders(placeholders: Record<string, string>): string;
	}
}

// v2.11 brings in new internationalization features and the lang file no longer requires this method.
// However, it is still used in places where config.yml values are replaced.
String.prototype.withPlaceholders = function (placeholders: Record<string, string> = {}): string {
	let str = this;
	for (let key in placeholders) str = str.replace(new RegExp(`\{${key}\}`, "gi"), placeholders[key]);
	return str as string;
};

export async function createClient() {
	dayjs.extend(relativeTime);
	try {
		await ensureDependencies();
	} catch (err) {
		console.log(
			'[ERROR] Dependencies failed to install automatically. Please install them manually by running "npm install".',
		);
		process.exit(1);
	}

	new Client();
}
