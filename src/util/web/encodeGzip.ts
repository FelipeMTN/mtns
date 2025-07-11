import { gzipSync } from "zlib";

export const encodeGzip = (data: any): Buffer => {
	return gzipSync(JSON.stringify(data));
};
