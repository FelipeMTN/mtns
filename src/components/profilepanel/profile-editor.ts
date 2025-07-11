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
import Settings from "@classes/Settings";

import { BaseComponent } from "@util/baseInterfaces";
import { successEmbed } from "@util/embeds";
import { __ } from "@util/translate";

export default class ProfilePanelOpenComponent extends BaseComponent {
	customId = "profilepanel-edit";

	TIMEZONES = [
		"-11:00",
		"-10:00",
		"-09:00",
		"-08:00",
		"-07:00",
		"-06:00",
		"-05:00",
		"-04:00",
		"-03:30",
		"-03:00",
		"-02:00",
		"-01:00",
		"00:00",
		"+01:00",
		"+02:00",
		"+03:00",
		"+03:30",
		"+04:00",
		"+04:30",
		"+05:00",
		"+06:00",
		"+07:00",
		"+08:00",
		"+09:00",
		"+10:00",
	];

	async run(interaction: AnyComponentInteraction, { settings }: { settings: Settings }): Promise<void> {
		if (interaction instanceof ButtonInteraction) {
			await this.openModal(interaction, { settings });
		} else if (interaction instanceof ModalSubmitInteraction) {
			await this.onSubmit(interaction, { settings });
		}
	}

	async openModal(interaction: AnyComponentInteraction, { settings }: { settings: Settings }): Promise<void> {
		if (!(interaction instanceof ButtonInteraction)) return;
		const [, , field] = interaction.customId.split("-");
		if (
			settings.freelancerRole &&
			!(interaction.member as GuildMember).roles.cache.some((r) => r.id === settings.freelancerRole)
		) {
			throw new ExecutionError(__("commands.profile.errors.not_freelancer", { _locale: interaction.locale }));
		}
		const profile = await Profile.getOrCreate(interaction.user.id);
		const modal = new ModalBuilder().setCustomId(`profilepanel-edit-${field}`);
		if (field === "bio") {
			const textInput = new TextInputBuilder()
				.setCustomId("value")
				.setLabel(__("panel.profile.set.bio.label", { _locale: interaction.locale }))
				.setValue(profile.bio || "")
				.setMinLength(1)
				.setMaxLength(500)
				.setPlaceholder(__("panel.profile.set.bio.placeholder", { _locale: interaction.locale }))
				.setRequired(true)
				.setStyle(TextInputStyle.Paragraph);
			if (profile.bio) textInput.setValue(profile.bio);
			modal
				.setTitle(__("panel.profile.set.bio.title", { _locale: interaction.locale }))
				.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(textInput));
		} else if (field === "portfolio") {
			const textInput = new TextInputBuilder()
				.setCustomId("value")
				.setLabel(__("panel.profile.set.portfolio.label", { _locale: interaction.locale }))
				.setValue(profile.portfolio || "")
				.setMinLength(1)
				.setMaxLength(100)
				.setLabel(__("panel.profile.set.portfolio.placeholder", { _locale: interaction.locale }))
				.setRequired(true)
				.setStyle(TextInputStyle.Short);
			if (profile.portfolio) textInput.setValue(profile.portfolio);
			modal
				.setTitle(__("panel.profile.set.portfolio.title", { _locale: interaction.locale }))
				.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(textInput));
		} else if (field === "ts") {
			const textInput = new TextInputBuilder()
				.setCustomId("value")
				.setLabel(__("panel.profile.set.techstack.label", { _locale: interaction.locale }))
				.setMinLength(1)
				.setMaxLength(100)
				.setPlaceholder(__("panel.profile.set.techstack.placeholder", { _locale: interaction.locale }))
				.setRequired(true)
				.setStyle(TextInputStyle.Short);

			if (profile.stack) textInput.setValue(profile.stack);

			modal
				.setTitle(__("panel.profile.set.techstack.title", { _locale: interaction.locale }))
				.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(textInput));
		} else if (field === "tz") {
			const textInput = new TextInputBuilder()
				.setCustomId("value")
				.setLabel(__("panel.profile.set.timezone.label", { _locale: interaction.locale }))
				.setMinLength(1)
				.setMaxLength(7)
				.setPlaceholder(__("panel.profile.set.timezone.placeholder", { _locale: interaction.locale }))
				.setRequired(true)
				.setStyle(TextInputStyle.Short);

			if (profile.timezone) {
				textInput.setValue(profile.timezone);
			}
			modal
				.setTitle(__("panel.profile.set.timezone.title", { _locale: interaction.locale }))
				.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(textInput));
		} else if (field === "paypal") {
			const textInput = new TextInputBuilder()
				.setCustomId("value")
				.setLabel(__("panel.profile.set.paypal.label", { _locale: interaction.locale }))
				.setMinLength(1)
				.setMaxLength(50)
				.setPlaceholder(__("panel.profile.set.paypal.placeholder", { _locale: interaction.locale }))
				.setRequired(true)
				.setStyle(TextInputStyle.Short);

			if (profile.paypalEmail) textInput.setValue(profile.paypalEmail);

			modal
				.setTitle(__("panel.profile.set.paypal.title", { _locale: interaction.locale }))
				.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(textInput));
		}
		await interaction.showModal(modal);
	}

	async onSubmit(interaction: ModalSubmitInteraction, { settings }: { settings: Settings }): Promise<void> {
		const [, , field] = interaction.customId.split("-");
		if (
			settings.freelancerRole &&
			!(interaction.member as GuildMember).roles.cache.some((r) => r.id === settings.freelancerRole)
		) {
			throw new ExecutionError(`You don't have the freelancer role.`);
		}
		const profile = await Profile.getOrCreate(interaction.user.id);
		let value = interaction.fields.getTextInputValue("value");
		if (field === "bio") {
			if (value.length > 500) {
				throw new ExecutionError(`Your bio must be less than 500 characters.`);
			}
			profile.bio = value;
			await profile.save();
			interaction.reply({
				embeds: [successEmbed(`Your bio has been updated to \`${value}\`.`)],
				ephemeral: true,
			});
		} else if (field === "portfolio") {
			try {
				const url = new URL(value);
				profile.portfolio = url.href;
				await profile.save();
				interaction.reply({
					embeds: [successEmbed(`Portfolio link updated to \`${url.href}\`.`)],
					ephemeral: true,
				});
			} catch (e) {
				throw new ExecutionError("This is an invalid link. Please provide a valid http/https link.");
			}
		} else if (field === "ts") {
			if (value.length > 100) {
				throw new ExecutionError("Your stack can only be less than 100 characters.");
			}
			profile.stack = value;
			await profile.save();
			interaction.reply({
				embeds: [successEmbed(`Your tech stack has been updated to \`${value}\`.`)],
				ephemeral: true,
			});
		} else if (field === "tz") {
			if (value === "+00:00" || value === "-00:00") value = "00:00";
			if (!this.TIMEZONES.includes(value)) {
				throw new ExecutionError(
					`This is an invalid timezone. Please provide a valid timezone.\nList of valid timezones:\n${this.TIMEZONES.map(
						(tz) => `\`${tz}\``,
					).join(",")}`,
				);
			}
			profile.timezone = value;
			await profile.save();
			interaction.reply({
				embeds: [successEmbed(`Timezone has been set to ${value}.`)],
				ephemeral: true,
			});
		} else if (field === "paypal") {
			profile.paypalEmail = value;
			await profile.save();
			interaction.reply({
				embeds: [successEmbed(`PayPal has been set to ${value}.`)],
				ephemeral: true,
			});
		}
	}
}
