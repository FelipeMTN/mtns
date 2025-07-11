import { z } from "zod";

const serviceSchema = z.object({
	name: z.string(),
	id: z.string(),
	description: z.string(),
	roleId: z.string().optional(),
	channelName: z.string().optional(),
	dropdownEmoji: z.string().optional(),
	other: z.boolean().default(false),
});
export type ConfigService = z.infer<typeof serviceSchema>;

export const servicesConfig = z.array(serviceSchema);

export type ServicesConfig = z.infer<typeof servicesConfig>;
