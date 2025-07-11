import { CLIENT_INSTANCE } from "@classes/Client";
import Invoice from "@classes/Invoice";
import Logger from "@classes/Logger";

import { PaymentNotificationType } from "@util/paymentNotificationType";

export async function pollForPayments() {
	const client = CLIENT_INSTANCE!;

	if (!client.gateways.length) return;
	if (!client.gateways.some((g) => g.config.paymentNotifications && g.config.paymentNotifications.type === PaymentNotificationType.Polling)) return;

	const invoices = await Invoice.findAll({ where: { started: true, cancelled: false, paid: false } });
	for (const invoice of invoices) {
		const gateway = client.gateways.find((g) => g.metadata.id === invoice.gatewayId);
		if (!gateway) continue;
		if (gateway.config.paymentNotifications && gateway.config.paymentNotifications.type !== PaymentNotificationType.Polling) continue;
		Logger.trace(`Refreshing #${invoice.id} pending invoice using ${gateway.metadata.id}.`);
		await invoice.refreshProperties();
	}
}
