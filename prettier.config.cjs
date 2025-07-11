/** @type {import('prettier').Config} */
module.exports = {
	endOfLine: "lf",
	semi: true,
	singleQuote: false,
	useTabs: true,
	tabWidth: 4,
	printWidth: 999,
	overrides: [
		{
			files: "*.yml",
			options: {
				tabWidth: 2,
				useTabs: false,
			},
		},
	],
	importOrder: [
		"<THIRD_PARTY_MODULES>",
		"",
		"^@classes/",
		"",
		"^@util/",
		"",
		"^@schemas/",
		"",
		"^@api/",
		"",
		"^@intervals/",
		"",
		"^[./]",
	],
	importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
	plugins: ["@ianvs/prettier-plugin-sort-imports"],
};
