import {
	ActionRowBuilder,
	ButtonInteraction,
	GuildMember,
	ModalActionRowComponentBuilder,
	ModalBuilder,
	ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { AnyComponentInteraction, ExecutionError } from "nhandler";

import Profile from "@classes/Profile";

import { BaseComponent } from "@util/baseInterfaces";
import { __ } from "@util/translate";

export default class ProfilePanelLookupOpenComponent extends BaseComponent {
	customId = "profilepanel-lookupother";
	findFn = (event: AnyComponentInteraction) => event.customId === this.customId;

	async run(interaction: AnyComponentInteraction): Promise<void> {
		if (interaction instanceof ButtonInteraction) {
			await this.openModal(interaction);
		} else if (interaction instanceof ModalSubmitInteraction) {
			await this.onSubmit(interaction);
		}
	}

	async openModal(interaction: ButtonInteraction): Promise<void> {
		const modal = new ModalBuilder().setCustomId("profilepanel-lookupother");
		modal.setTitle(__("panel.profile.lookup.other.modal_title", { _locale: interaction.locale })).addComponents(
			new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
				new TextInputBuilder()
					.setCustomId("value")
					.setLabel(__("panel.profile.lookup.other.modal_field_user_label", { _locale: interaction.locale }))
					.setMinLength(1)
					.setMaxLength(100)
					.setPlaceholder(__("panel.profile.lookup.search", { _locale: interaction.locale }))
					.setRequired(true)
					.setStyle(TextInputStyle.Short),
			),
		);
		await interaction.showModal(modal);
	}

	async onSubmit(interaction: ModalSubmitInteraction): Promise<void> {
		if (!interaction.guild) {
			throw new ExecutionError(__("generic.errors.guild_only", { _locale: interaction.locale }));
		}
		const search = interaction.fields.getTextInputValue("value");
		if (!search) {
			throw new ExecutionError(__("generic.errors.member_undefined", { _locale: interaction.locale }));
		}
		await interaction.guild.members.fetch();
		const member =
			interaction.guild.members.cache.get(search) ||
			interaction.guild.members.cache.find(
				(mbr: GuildMember) => mbr.user.username.toLowerCase() === search.toLowerCase(),
			);

		if (!member) {
			throw new ExecutionError(__("generic.errors.member_undefined", { _locale: interaction.locale }));
		}

		const profile = await Profile.getOrCreate(member.user.id);
		const embed = await profile.createEmbed(member.user, interaction.locale);
		interaction.reply({ embeds: [embed], ephemeral: true });
	}
}
