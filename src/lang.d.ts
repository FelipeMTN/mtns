export type LangKeys =
	| "action.manager_made_ticket_for_you"
	| "applications.finish_prompting.content"
	| "applications.finish_prompting.title"
	| "applications.log.field_label_service"
	| "applications.log.field_label_ticket"
	| "applications.log.title"
	| "applications.service_selector.description"
	| "applications.service_selector.label"
	| "applications.service_selector.placeholder"
	| "bank.revenue_transaction_note"
	| "bank.service_cut_transaction_note"
	| "commands.add.errors.already_in_ticket"
	| "commands.add.successful"
	| "commands.application.accepted"
	| "commands.application.accepted_short"
	| "commands.application.denied"
	| "commands.application.denied_short"
	| "commands.archive.errors.already_archived"
	| "commands.archive.errors.generic"
	| "commands.archive.errors.requires_manage_guild"
	| "commands.archive.errors.time_exceeds_1_min"
	| "commands.archive.errors.time_exceeds_30_days"
	| "commands.archive.reason_text"
	| "commands.archive.scheduled.sending_will_cancel"
	| "commands.archive.scheduled.successful"
	| "commands.archive.successful"
	| "commands.bank.balance.balance_text"
	| "commands.bank.balance.last_transactions_text"
	| "commands.bank.transactions.default_note"
	| "commands.bank.transactions.empty"
	| "commands.bank.transactions.title"
	| "commands.bank.withdraw.below_1"
	| "commands.bank.withdraw.channel_invalid"
	| "commands.bank.withdraw.channel_not_configured"
	| "commands.bank.withdraw.not_enough_funds"
	| "commands.bank.withdraw.successful"
	| "commands.blacklist.add.errors.person_already_blacklisted"
	| "commands.blacklist.add.errors.self_blacklist"
	| "commands.blacklist.add.successful"
	| "commands.blacklist.remove.errors.person_not_blacklisted"
	| "commands.blacklist.remove.successful"
	| "commands.blacklist.status.status_is_allowed"
	| "commands.blacklist.status.status_is_blacklisted"
	| "commands.blacklist.status.successful"
	| "commands.claim.errors.already_claimed"
	| "commands.claim.errors.already_complete"
	| "commands.claim.successful"
	| "commands.claim.successful.title"
	| "commands.complete.embed"
	| "commands.complete.embed.title"
	| "commands.complete.errors.already_complete"
	| "commands.complete.errors.invoice_not_paid"
	| "commands.complete.errors.no_invoice"
	| "commands.complete.message_from_freelancer"
	| "commands.createprofile.errors.profile_already_exists"
	| "commands.createprofile.successful"
	| "commands.currency.errors.generic"
	| "commands.currency.errors.invalid_currency"
	| "commands.deadline.deadline_text"
	| "commands.deadline.errors.time.too_low"
	| "commands.deadline.expires_text"
	| "commands.embed.errors.generic"
	| "commands.embed.errors.invalid_embed"
	| "commands.embed.successful"
	| "commands.fee"
	| "commands.forcecomplete.errors.already_complete"
	| "commands.forcecomplete.successful"
	| "commands.freelancer.assign.errors.already_has_freelancer"
	| "commands.freelancer.assign.errors.generic"
	| "commands.freelancer.assign.successful"
	| "commands.freelancer.transfer.errors.generic"
	| "commands.freelancer.transfer.errors.no_freelancer_assigned"
	| "commands.freelancer.transfer.successful"
	| "commands.freelancer.unassign.errors.generic"
	| "commands.freelancer.unassign.errors.no_freelancer_assigned"
	| "commands.freelancer.unassign.successful"
	| "commands.incomplete.errors.not_completed"
	| "commands.incomplete.successful"
	| "commands.invoice.cancel.errors.no_invoice"
	| "commands.invoice.cancel.successful"
	| "commands.invoice.create.errors.all_gateways_disabled"
	| "commands.invoice.create.errors.existing_active_invoice"
	| "commands.invoice.create.errors.generic"
	| "commands.invoice.create.errors.must_be_gt_0"
	| "commands.invoice.create.errors.must_be_lt_10000"
	| "commands.invoice.create.successful"
	| "commands.invoice.createpaid.successful"
	| "commands.invoice.link.errors.no_invoice"
	| "commands.invoice.markpaid.errors.already_paid"
	| "commands.invoice.markpaid.errors.no_invoice"
	| "commands.invoice.markpaid.successful"
	| "commands.invoice.refresh.errors.generic"
	| "commands.invoice.refresh.errors.invalid_gateway_type"
	| "commands.invoice.refresh.errors.no_invoice"
	| "commands.invoice.refresh.successful"
	| "commands.managebanks.add.default_note"
	| "commands.managebanks.add.successful"
	| "commands.managebanks.subtract.default_note"
	| "commands.managebanks.subtract.successful"
	| "commands.managebanks.view.successful"
	| "commands.managebanks.withdrawals.field_name"
	| "commands.managebanks.withdrawals.field_value"
	| "commands.managebanks.withdrawals.title.all"
	| "commands.managebanks.withdrawals.title.pending"
	| "commands.new.errors.generic"
	| "commands.new.ticket_created"
	| "commands.panel.successful"
	| "commands.profile.errors.not_freelancer"
	| "commands.questions.embed_title"
	| "commands.questions.errors.no_data"
	| "commands.remove.errors.cant_remove_author"
	| "commands.remove.errors.cant_remove_self"
	| "commands.remove.errors.not_in_ticket"
	| "commands.remove.successful"
	| "commands.repost.errors.already_claimed"
	| "commands.repost.errors.no_responses_data"
	| "commands.repost.successful"
	| "commands.repostreview.errors.no_review_channel"
	| "commands.repostreview.errors.no_review_made"
	| "commands.repostreview.successful"
	| "commands.reviews.no_reviews"
	| "commands.reviews.title"
	| "commands.set.bio.errors.exceeded_500"
	| "commands.set.bio.successful"
	| "commands.set.paypal.errors.exceeded_50"
	| "commands.set.paypal.successful"
	| "commands.set.portfolio.errors.invalid_url"
	| "commands.set.portfolio.successful"
	| "commands.set.techstack.errors.exceeded_100"
	| "commands.set.techstack.successful"
	| "commands.set.timezone.successful"
	| "commands.setservicechannel.created"
	| "commands.setservicechannel.errors.channel_not_text"
	| "commands.setservicechannel.errors.generic"
	| "commands.setservicechannel.errors.invalid_service"
	| "commands.setservicechannel.updated_existing"
	| "commands.ticketinfo.field_title.archived"
	| "commands.ticketinfo.field_title.author"
	| "commands.ticketinfo.field_title.channel"
	| "commands.ticketinfo.field_title.commission_log_mid"
	| "commands.ticketinfo.field_title.complete"
	| "commands.ticketinfo.field_title.created_at"
	| "commands.ticketinfo.field_title.freelancer"
	| "commands.ticketinfo.field_title.guild_id"
	| "commands.ticketinfo.field_title.invoice_generated"
	| "commands.ticketinfo.field_title.invoice_id"
	| "commands.ticketinfo.field_title.manager"
	| "commands.ticketinfo.field_title.pending"
	| "commands.ticketinfo.field_title.serial"
	| "commands.ticketinfo.field_title.updated_at"
	| "commands.ticketinfo.title"
	| "commands.transcript.errors.generic"
	| "commands.transcript.generated"
	| "commands.trial.created"
	| "commands.trial.errors.not_found"
	| "commands.trial.trial_title"
	| "commands.unarchive.errors.not_archived"
	| "commands.unarchive.errors.requires_manage_guild"
	| "commands.unarchive.scheduled_removed"
	| "commands.unarchive.successful"
	| "commands.viewpaypal.errors.paypal_not_set"
	| "commands.viewpaypal.errors.profile_not_created"
	| "commands.viewpaypal.successful"
	| "commissions.deny.button_label"
	| "commissions.deny.errors.already_denied"
	| "commissions.deny.modal_field_reason_label"
	| "commissions.deny.modal_title"
	| "commissions.deny.rejoin"
	| "commissions.deny.rejoined"
	| "commissions.deny.success"
	| "commissions.finish_prompting.content"
	| "commissions.finish_prompting.title"
	| "commissions.log.field_label_service"
	| "commissions.log.field_label_ticket"
	| "commissions.log.tag.archived"
	| "commissions.log.tag.claimed"
	| "commissions.log.title"
	| "commissions.service_selector.description"
	| "commissions.service_selector.label"
	| "commissions.service_selector.placeholder"
	| "completion.accept.errors.already_complete"
	| "completion.accept.successful.content"
	| "completion.accept.successful.title"
	| "completion.bank.dm_notification"
	| "completion.bank.dm_notification.title"
	| "completion.bank.label_new_balance"
	| "completion.button.accept"
	| "completion.button.deny"
	| "completion.deny.errors.already_complete"
	| "completion.deny.errors.timed_out"
	| "completion.deny.reason_modal_field_label"
	| "completion.deny.reason_modal_title"
	| "completion.deny.successful"
	| "completion.deny.successful.embed_title"
	| "completion.deny.successful.reason_for_denying"
	| "completion.errors.not_author"
	| "completion.review.errors.not_accepted"
	| "completion.review.modal_field_anynomous_label"
	| "completion.review.modal_field_message_label"
	| "completion.review.modal_title"
	| "completion.review.review_in_ticket"
	| "completion.review.successful"
	| "completion.review.successful.embed_title"
	| "customerpanel.action.add.description"
	| "customerpanel.action.add.errors.user_invalid"
	| "customerpanel.action.add.field_label_user"
	| "customerpanel.action.add.field_placeholder_user"
	| "customerpanel.action.add.label"
	| "customerpanel.action.add.title"
	| "customerpanel.action.remove.description"
	| "customerpanel.action.remove.errors.cant_remove_assigned_freelancer"
	| "customerpanel.action.remove.errors.cant_remove_higher"
	| "customerpanel.action.remove.errors.cant_remove_manager"
	| "customerpanel.action.remove.errors.user_invalid"
	| "customerpanel.action.remove.field_label_user"
	| "customerpanel.action.remove.field_placeholder_user"
	| "customerpanel.action.remove.label"
	| "customerpanel.action.remove.title"
	| "customerpanel.errors.not_valid_ticket"
	| "customerpanel.placeholder"
	| "generic.already_disabled_text"
	| "generic.already_enabled_text"
	| "generic.disable_text"
	| "generic.dismiss_text"
	| "generic.enable_text"
	| "generic.errors.channel_invalid"
	| "generic.errors.commission_not_assigned_to_freelancer"
	| "generic.errors.guild_invalid"
	| "generic.errors.guild_only"
	| "generic.errors.member_undefined"
	| "generic.errors.must_be_freelancer"
	| "generic.errors.must_be_manager"
	| "generic.errors.not_any_ticket"
	| "generic.errors.not_application"
	| "generic.errors.not_comm_or_app"
	| "generic.errors.not_commission"
	| "generic.errors.not_commission_or_archived"
	| "generic.errors.not_number"
	| "generic.errors.not_support"
	| "generic.errors.time.bad_format"
	| "generic.id"
	| "generic.invalid_field_text"
	| "generic.no"
	| "generic.none"
	| "generic.pagination"
	| "generic.yes"
	| "invoice.amount"
	| "invoice.cancelled"
	| "invoice.create.errors.already_paid"
	| "invoice.create.errors.disabled"
	| "invoice.create.errors.generic"
	| "invoice.create.errors.invalid_gateway"
	| "invoice.create.errors.no_invoice"
	| "invoice.create.successful"
	| "invoice.gateway_note"
	| "invoice.handling_fee"
	| "invoice.invoice_description"
	| "invoice.invoice_for_price"
	| "invoice.invoice_title"
	| "invoice.paid_tag"
	| "invoice.paid_text"
	| "invoice.status"
	| "invoice.total"
	| "invoice.update.fully_paid"
	| "invoice.update.partially_paid"
	| "invoice.update.unverified_charge_made"
	| "invoice.view_in_browser_label"
	| "messaging.c2f.button_label"
	| "messaging.c2f.message"
	| "messaging.c2f.modal_field_message_label"
	| "messaging.c2f.modal_title"
	| "messaging.c2f.successful"
	| "messaging.errors.wrong_service_roles"
	| "messaging.f2c.button_label"
	| "messaging.f2c.message"
	| "messaging.f2c.modal_field_message_label"
	| "messaging.f2c.modal_title"
	| "messaging.f2c.successful"
	| "panel.bank.button_label.list_transactions"
	| "panel.bank.button_label.view_balance"
	| "panel.bank.title"
	| "panel.profile.button_label.set_bio"
	| "panel.profile.button_label.set_paypal"
	| "panel.profile.button_label.set_portfolio"
	| "panel.profile.button_label.set_techstack"
	| "panel.profile.button_label.set_timezone"
	| "panel.profile.button_label.view_other_profile"
	| "panel.profile.button_label.view_own_profile"
	| "panel.profile.lookup.other.modal_field_user_label"
	| "panel.profile.lookup.other.modal_title"
	| "panel.profile.lookup.search"
	| "panel.profile.set.bio.label"
	| "panel.profile.set.bio.placeholder"
	| "panel.profile.set.bio.title"
	| "panel.profile.set.paypal.label"
	| "panel.profile.set.paypal.placeholder"
	| "panel.profile.set.paypal.title"
	| "panel.profile.set.portfolio.label"
	| "panel.profile.set.portfolio.placeholder"
	| "panel.profile.set.portfolio.title"
	| "panel.profile.set.techstack.label"
	| "panel.profile.set.techstack.placeholder"
	| "panel.profile.set.techstack.title"
	| "panel.profile.set.timezone.label"
	| "panel.profile.set.timezone.placeholder"
	| "panel.profile.set.timezone.title"
	| "panel.profile.title"
	| "profile.embed.field_label_completed_commissions"
	| "profile.embed.field_label_freelancer_since"
	| "profile.embed.field_label_portfolio"
	| "profile.embed.field_label_reviews_average"
	| "profile.embed.field_label_techstack"
	| "profile.embed.field_label_timezone"
	| "profile.embed.tip"
	| "profile.embed.title"
	| "prompt.validation.budget.max_exceeded"
	| "prompt.validation.budget.min_exceeded"
	| "prompt.validation.budget.not_number"
	| "prompt.validation.number.max_exceeded"
	| "prompt.validation.number.min_exceeded"
	| "prompt.validation.number.not_number"
	| "prompt.validation.text.max_exceeded"
	| "prompt.validation.text.min_exceeded"
	| "prompt.validation.text.no_content"
	| "quoting.accept.dm_notification"
	| "quoting.counter.dm_notification"
	| "quoting.counter.modal_field_price_label"
	| "quoting.counter.modal_title"
	| "quoting.counter.successful"
	| "quoting.create.button_label"
	| "quoting.deny.dm_notification"
	| "quoting.deny.fields.freelancer"
	| "quoting.deny.fields.quote_channel"
	| "quoting.deny.fields.reason"
	| "quoting.deny.fields.ticket"
	| "quoting.deny.log.title"
	| "quoting.deny.preset_reason.1"
	| "quoting.deny.preset_reason.2"
	| "quoting.deny.preset_reason.3"
	| "quoting.deny.preset_reason.custom"
	| "quoting.deny.provide_reason"
	| "quoting.deny.reason_text"
	| "quoting.deny.successful"
	| "quoting.deny.timed_out"
	| "quoting.errors.already_claimed"
	| "quoting.errors.message_wasnt_created"
	| "quoting.errors.no_bio"
	| "quoting.errors.no_profile"
	| "quoting.errors.wrong_service_roles"
	| "quoting.modal_field_attached_msg_label"
	| "quoting.modal_field_quote_label"
	| "quoting.modal_title"
	| "quoting.quote.button.accept_label"
	| "quoting.quote.button.counteroffer_label"
	| "quoting.quote.button.decline_label"
	| "quoting.quote.field_label_bio"
	| "quoting.quote.field_label_portfolio"
	| "quoting.quote.field_label_techstack"
	| "quoting.quote.field_label_timezone"
	| "quoting.quote.message_from_freelancer"
	| "quoting.quote.tag.accepted"
	| "quoting.quote.tag.counteroffered"
	| "quoting.quote.tag.declined"
	| "quoting.quote.title"
	| "quoting.responding.errors.commission_already_assigned"
	| "quoting.responding.errors.freelancer_invalid"
	| "quoting.responding.errors.not_author"
	| "quoting.responding.errors.quote_invalid"
	| "quoting.successful"
	| "review.anonymous"
	| "review.field_label_customer"
	| "review.field_label_freelancer"
	| "review.field_label_message"
	| "review.field_label_rating"
	| "review.footer"
	| "review.title"
	| "ticketing.author_left"
	| "tickets.application_welcome"
	| "tickets.archive.button_label"
	| "tickets.archive.dm_notification"
	| "tickets.archive.errors.archived_category_full"
	| "tickets.archive.errors.archived_category_not_category"
	| "tickets.archive.errors.bad_archived_category"
	| "tickets.archive.log.field_label_author"
	| "tickets.archive.log.field_label_ticket"
	| "tickets.archive.log.field_label_time"
	| "tickets.archive.log.title"
	| "tickets.archive.successful.content"
	| "tickets.archive.successful.reason_text"
	| "tickets.archive.successful.title"
	| "tickets.cancel.button_label"
	| "tickets.cancel.errors.not_author"
	| "tickets.commission_welcome"
	| "tickets.commission.welcome_new_user"
	| "tickets.no_quotes_reminder"
	| "tickets.no_quotes_reminder.title"
	| "tickets.on_cooldown"
	| "tickets.ping_preference.currently_off"
	| "tickets.ping_preference.currently_on"
	| "tickets.ping_preference.errors.not_author"
	| "tickets.support_welcome"
	| "tickets.topic_pattern.application"
	| "tickets.topic_pattern.commission"
	| "tickets.topic_pattern.support"
	| "tickets.unarchive.button_label"
	| "tickets.unarchive.errors.failed_to_move"
	| "tickets.unarchive.successful.title"
	| "transcript.empty"
	| "transcript.file.attachment_count"
	| "transcript.file.attachment_n"
	| "transcript.file.no_content"
	| "transcript.file.tag.deleted"
	| "transcript.file.tag.edited"
	| "transcript.file.time_format"
	| "transcript.prefix"
	| "trial.deadline_up"
	| "trial.deadline_up.title"
	| "trial.reminder"
	| "trial.reminder.title"
	| "web.created_from_dashboard"
	| "web.created_from_dashboard_title"
	| "withdrawal.all_balance_note"
	| "withdrawal.button_label.deny"
	| "withdrawal.button_label.mark_as_complete"
	| "withdrawal.completed.dm_notification"
	| "withdrawal.completed.dm_notification.title"
	| "withdrawal.completed.transaction_note"
	| "withdrawal.denied.dm_notification"
	| "withdrawal.denied.dm_notification.title"
	| "withdrawal.deny.errors.already_denied"
	| "withdrawal.deny.errors.invalid_user"
	| "withdrawal.deny.successful"
	| "withdrawal.embed_title"
	| "withdrawal.errors.invalid_withdrawal"
	| "withdrawal.field_label_amount"
	| "withdrawal.field_label_balance_after"
	| "withdrawal.field_label_current_balance"
	| "withdrawal.field_label_paypal_email"
	| "withdrawal.field_label_status"
	| "withdrawal.label_completed"
	| "withdrawal.label_denied"
	| "withdrawal.label_pending"
	| "withdrawal.submit.errors.already_complete"
	| "withdrawal.submit.errors.invalid_user"
	| "withdrawal.submit.successful";