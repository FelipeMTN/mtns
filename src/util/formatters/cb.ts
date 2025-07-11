// noinspection JSUnusedGlobalSymbols
// Creates a codeblock with an optional `syntax` code.
export const cb = (text: string, syntax?: string) => {
	return `\`\`\`${syntax || ""}\n${text}\`\`\``;
};
