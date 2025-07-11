import { CLIENT_INSTANCE } from "@classes/Client";
import Trial from "@classes/Trial";

export async function checkTrialReminders() {
	const client = CLIENT_INSTANCE!;
	if (!client.config.tickets.trials.reminders.enabled) return;
	const trials = await Trial.findAll({ where: { active: true } });
	for (let trial of trials) {
		trial.checkReminder();
	}
}
