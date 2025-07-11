import lodash from "lodash";

import { CLIENT_INSTANCE } from "@classes/Client";

import { LangKeys } from "../lang";

function stripIndent(string: string) {
	/// @credit
	/// https://github.com/jamiebuilds/min-indent
	/// https://github.com/sindresorhus/strip-indent
	const match = string.match(/^[ \t]*(?=\S)/gm);
	if (!match) return string;
	const indent = match.reduce((r, a) => Math.min(r, a.length), Infinity);
	if (indent === 0) return string;
	const regex = new RegExp(`^[ \\t]{${indent}}`, "gm");
	return string.replace(regex, "");
}

type LocalePlaceholders = Record<string, string> & { _locale?: string };

export function __(key: LangKeys, placeholders: LocalePlaceholders = {}): string {
	const client = CLIENT_INSTANCE!;

	let translation;
	let langFile;

	if (placeholders._locale && client.locales[placeholders._locale]) {
		langFile = client.locales[placeholders._locale];
		delete placeholders._locale;
	} else {
		langFile = client.locales["en-US"];
	}

	translation = lodash.get(langFile, key, key);

	for (let pl in placeholders) {
		translation = translation.replace(new RegExp(`\{${pl}\}`, "gi"), placeholders[pl]);
	}

	return stripIndent(translation);
}
