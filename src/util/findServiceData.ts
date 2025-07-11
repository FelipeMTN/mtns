import Client from "@classes/Client";

import { ConfigService } from "@schemas/services";

export const findServiceData = (client: Client, serviceId: number | string): ConfigService | undefined =>
	client.config.services.find((r, i) => r.id === serviceId || i === serviceId);
