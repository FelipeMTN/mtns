import { createHmac } from "crypto";

export const compareSignature = (body: Object, signature: string, secret: string) => {
	if (!signature) return false;
	const stringifiedBody = JSON.stringify(Object.fromEntries(Object.entries(body).sort()));
	const hash = createHmac("sha256", secret).update(stringifiedBody).digest("hex");
	return hash === signature;
};
