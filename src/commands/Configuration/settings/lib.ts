import { CATEGORY, CHANNEL, ROLE } from "./validators";

export const settingsData = [
	{
		key: "commissionLog",
		name: "Commission Log Channel",
		description: "The channel where commissions are sent and are available for claim and messaging.",
		...CHANNEL,
	},
	{
		key: "adminLog",
		name: "Admin Logging Channel",
		description: "The channel where most actions are logged.",
		...CHANNEL,
	},
	{
		key: "reviewChannel",
		name: "Review Channel",
		description: "The channel for client reviews (in 99% use cases should be publicly visible).",
		...CHANNEL,
	},
	{
		key: "withdrawalsChannel",
		name: "Withdrawals Channel",
		description:
			"The channel where freelancers' withdrawal requests will be sent. If not configured, withdrawing is disabled.",
		...CHANNEL,
	},
	{
		key: "clientRole",
		name: "Client Role",
		description: "The role to be given when someone fully pays their first invoice.",
		...ROLE,
	},
	{
		key: "freelancerRole",
		name: "Freelancer Role",
		description: "The freelancer role. They have permission to quote commissions and ask questions.",
		...ROLE,
	},
	{
		key: "managerRole",
		name: "Manager Role",
		description: "The manager role. They have permission to claim management in tickets.",
		...ROLE,
	},
	{
		key: "commissionCategory",
		name: "Commission Category",
		description: "A category channel for commission tickets.",
		...CATEGORY,
	},
	{
		key: "applicationCategory",
		name: "Application Category",
		description: "A category channel for application tickets.",
		...CATEGORY,
	},
	{
		key: "supportCategory",
		name: "Support Category",
		description: "A category channel for support tickets.",
		...CATEGORY,
	},
	{
		key: "closedCategory",
		name: "Archived Category",
		description: "A category channel for archived tickets.",
		...CATEGORY,
	},
	{
		key: "quotesCategory",
		name: "Quotes Category",
		description: "A category channel for quotes.",
		...CATEGORY,
	},
];
