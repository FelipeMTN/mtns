import Logger from "@classes/Logger";

export const ensureNodeVersion = () => {
	const version = process.version;
	const nodeMajorVersion = parseInt(version.replace("v", "").split(".")[0]);
	if (nodeMajorVersion < 20) {
		Logger.error(`Node.JS version check failed: You are running Node ${version}, but this bot requires Node 20 or higher. Please upgrade at: https://nodejs.org/en/.`);
		process.exit(1);
	}
};
