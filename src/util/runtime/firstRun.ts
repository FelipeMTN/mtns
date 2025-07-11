import * as fs from "fs";
import path from "path";

import { getDataDir } from "@util/getDataDir";

export const checkFirstRun = async () => {
	const dataDir = getDataDir();
	const launch = path.join(dataDir, "./data.json");
	if (!fs.existsSync(launch)) {
		fs.writeFileSync(launch, JSON.stringify({ lock: true }));
		console.log(
			[
				"-".repeat(40),
				`It looks like this is the first time you're running the bot.`,
				`If you have trouble configuring the bot, please refer to the README.`,
				`If you're upgrading, refer to the changelog, which is available in the LS bot documentation.`,
				"-".repeat(40),
			].join("\n"),
		);
	}
	if (!fs.existsSync(launch)) {
		fs.writeFileSync(launch, JSON.stringify({ lock: true }));
		console.log(
			[
				"-".repeat(40),
				`It looks like this is the first time you're running the bot.`,
				`If you have trouble configuring the bot, please refer to the README.`,
				`If you're upgrading, refer to the changelog, which is available in the LS bot documentation.`,
				"-".repeat(40),
			].join("\n"),
		);
	}
};
