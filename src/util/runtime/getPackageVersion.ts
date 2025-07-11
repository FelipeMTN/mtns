import { existsSync, readFileSync } from "fs";
import path from "path";

import Logger from "@classes/Logger";

let CACHED: string;

export const getPackageVersion = () => {
	if (CACHED) return CACHED;
	try {
		if (!existsSync(path.join(process.cwd(), "package.json"))) {
			Logger.error(
				"package.json could not be found. Make sure you're operating in the root directory of the bot.",
			);
		}
		const packageJson = readFileSync(path.join(process.cwd(), "package.json"), "utf-8");
		const { version } = JSON.parse(packageJson);
		CACHED = version;
		return version;
	} catch (err) {
		Logger.error("Failed to read package.json. Please ensure it exists.");
		process.exit(1);
	}
};
