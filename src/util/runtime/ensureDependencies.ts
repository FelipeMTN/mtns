import { execSync } from "child_process";

export const ensureDependencies = () => {
	return new Promise<void>((resolve, reject) => {
		try {
			require("discord.js");
			resolve();
		} catch (err) {
			console.log("[WARN] Dependencies are not installed. Installing them now...");
			execSync("npm install", { stdio: "inherit" });
			execSync("npm install sqlite3 pg pg-hstore mysql2", { stdio: "inherit" });
			ensureInstalled(resolve, reject);
		}
	});
};

const ensureInstalled = (resolve: () => void, reject: (error: Error) => void) => {
	try {
		require("discord.js");
		resolve();
	} catch (err) {
		reject(new Error("Failed to ensure dependencies twice."));
	}
};
