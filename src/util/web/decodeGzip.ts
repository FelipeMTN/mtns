import { gunzipSync } from "zlib";

export const decodeGzip = (gzipped: Buffer): any | null => {
	if (!gzipped) return null;
	const uncompressed = gunzipSync(gzipped).toString();
	return JSON.parse(uncompressed);
};
