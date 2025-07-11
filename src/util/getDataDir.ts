import fs from "fs";
import path from "path";

import Logger from "@classes/Logger";

export const getDataDir = () => {
	const dataDir = path.join(process.cwd(), ".bot");
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir);
		Logger.success("Created new data directory.");
	}
	return dataDir;
};
