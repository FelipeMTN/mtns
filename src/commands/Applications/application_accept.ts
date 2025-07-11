import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { ExecutionError } from "nhandler";

import { CLIENT_INSTANCE } from "@classes/Client";
import Settings from "@classes/Settings";
import ApplicationTicket from "@classes/Tickets/ApplicationTicket";

import { archiveButton } from "@util/components/buttons";
import { successEmbed } from "@util/embeds";
import { findServiceData } from "@util/findServiceData";
import { __ } from "@util/translate";

export async function runAccept(
	interaction: ChatInputCommandInteraction,
	app: ApplicationTicket,
	member: GuildMember,
	settings: Settings,
): Promise<void> {
	if (!settings.freelancerRole) {
		throw new ExecutionError("Please set a freelancer role in settings.");
	}

	const role = interaction.guild!.roles.cache.get(settings.freelancerRole);

	if (!role) {
		throw new ExecutionError("The freelancer role does not exist.");
	}

	if (!app.selectedService) {
		throw new ExecutionError("The freelancer role does not exist.");
	}

	await member.roles.add(role);

	const serviceIDs = app.selectedService.split(",");
	for (let serviceID of serviceIDs) {
		const service = findServiceData(CLIENT_INSTANCE!, serviceID);
		if (service?.roleId) {
			const role = interaction.guild!.roles.cache.get(service.roleId);
			if (!role) continue;
			await member.roles.add(role);
		}
	}

	interaction.editReply({
		embeds: [
			successEmbed(
				__("commands.application.accepted", { _locale: interaction.locale, username: member.user.username }),
			).setAuthor({
				name: __("commands.application.accepted_short", { _locale: interaction.locale }),
			}),
		],

		components: [archiveButton()],
	});
}
