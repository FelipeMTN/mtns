import { CLIENT_INSTANCE } from "@classes/Client";
import Logger from "@classes/Logger";
import Ticket from "@classes/Ticket";
import { TicketManager, TicketType } from "@classes/TicketManager";

export async function sendNobodyQuotingReminders() {
	const client = CLIENT_INSTANCE!;
	if (!client.config.tickets.sendReminderAboutNoQuotes) return;
	const tickets = await Ticket.findAll({
		where: { type: TicketType.Commission, complete: false, pending: false, closed: false },
	});
	if (!tickets || !tickets.length) return;
	for (let ticket of tickets) {
		if (ticket.lastQuoted || ticket.pending) continue;
		const resolvedTicket = await TicketManager.resolve(ticket);
		if (!resolvedTicket) {
			ticket.lastQuoted = new Date(); // set date to ignore this ticket for later
			await ticket.save();
			continue;
		}
		if (Date.now() - resolvedTicket.createdAt.getTime() < 1000 * 60 * 60 * 24 * 3) continue;
		Logger.trace(`Sending repost reminder for ticket ${ticket.id}.`);
		resolvedTicket.sendReminder();
		ticket.lastQuoted = new Date();
		await ticket.save();
	}
}
