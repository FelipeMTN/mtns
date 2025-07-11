import { Op } from "sequelize";

import { CLIENT_INSTANCE } from "@classes/Client";
import LateArchive from "@classes/LateArchive";
import Logger from "@classes/Logger";
import { TicketManager } from "@classes/TicketManager";

export async function runLateArchiveInterval() {
	const client = CLIENT_INSTANCE!;
	const scheduledArchives = await LateArchive.findAll({
		where: { archiveAfter: { [Op.lt]: new Date() } },
	});
	for (let scheduledArchive of scheduledArchives) {
		Logger.trace(`Running scheduled archive: ${scheduledArchive.id}.`);
		const ticket = await TicketManager.fetch({ id: scheduledArchive.ticketId });
		if (!ticket || ticket.closed) {
			scheduledArchive.destroy();
			continue;
		}
		const channel = client.channels.cache.get(ticket.channelId);
		if (!channel) {
			scheduledArchive.destroy();
			continue;
		}
		const resolvedTicket = await TicketManager.resolve(ticket);
		let reason = `Scheduled to auto archive by <@${scheduledArchive.userId}>`;
		reason += scheduledArchive.reason ? ` with reason: ${scheduledArchive.reason}` : ".";
		scheduledArchive.destroy();
		if (!resolvedTicket) continue;
		resolvedTicket.archive(reason).catch(() => null);
	}
}
