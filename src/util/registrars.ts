import { CommandHandler, ComponentHandler, ContextMenuHandler, EventHandler } from "nhandler";

import CreateSupportTicketMessageAction from "../actions/create-support-ticket-msg";
import CreateSupportTicketUserAction from "../actions/create-support-ticket-usr";
import ApplicationsCommand from "../commands/Applications/application_master";
import TrialCommand from "../commands/Applications/trial_master";
import BankCommand from "../commands/Banking/bank";
import FeeCommand from "../commands/Banking/fee";
import ManageBanksCommand from "../commands/Banking/managebanks";
import ClaimCommand from "../commands/Commissions/claim";
import CompleteCommand from "../commands/Commissions/complete";
import DeadlineCommand from "../commands/Commissions/deadline";
import BlacklistCommand from "../commands/Configuration/blacklist_master";
import LangCommand from "../commands/Configuration/lang";
import PanelCommand from "../commands/Configuration/panel";
import ServiceCutSplitCommand from "../commands/Configuration/servicecutsplit_master";
import SetServiceChannelCommand from "../commands/Configuration/setservicechannel";
import SettingsCommand from "../commands/Configuration/settings/settings";
import HelpCommand from "../commands/Informational/help";
import TicketInfoCommand from "../commands/Informational/ticketinfo";
import InvoiceCommand from "../commands/Invoicing/invoice_master";
import CreateProfileCommand from "../commands/Profile/createprofile";
import ProfileCommand from "../commands/Profile/profile";
import ReviewsCommand from "../commands/Profile/reviews";
import SetCommand from "../commands/Profile/set_master";
import ViewPayPalCommand from "../commands/Profile/viewpaypal";
import FreelancerCommand from "../commands/Ticket Management/freelancer";
import ManageTicketCommand from "../commands/Ticket Management/manageticket_master";
import NewCommand from "../commands/Ticket Management/new";
import TranscriptCommand from "../commands/Ticket Management/transcript";
import AddCommand from "../commands/Ticketing/add";
import ArchiveCommand from "../commands/Ticketing/archive";
import PurgeTicketsCommand from "../commands/Ticketing/purgetickets";
import QuestionsCommand from "../commands/Ticketing/questions";
import RemoveCommand from "../commands/Ticketing/remove";
import UnarchiveCommand from "../commands/Ticketing/unarchive";
import AICommand from "../commands/Utility/ai";
import CurrencyCommand from "../commands/Utility/currency";
import EmbedCommand from "../commands/Utility/embed";
import EvalCommand from "../commands/Utility/eval";
import ArchiveComponent from "../components/archive";
import DenyWithdrawComponent from "../components/bank/denywithdraw";
import SubmitWithdrawComponent from "../components/bank/submitwithdraw";
import BankPanelComponent from "../components/bankpanel/bankpanel";
import CancelPromptsComponent from "../components/cancel";
import CompleteAcceptComponent from "../components/complete/accept";
import CompleteDenyComponent from "../components/complete/deny";
import CompleteReviewComponent from "../components/complete/review";
import CustomerPanelComponent from "../components/customerpanel";
import CustomerPanelActionComponent from "../components/customerpanelaction";
import DeleteMessageComponent from "../components/deletemsg";
import DenyCommissionComponent from "../components/denycommission";
import DenyRejoinComponent from "../components/denyrejoin";
import GenerateInvoiceComponent from "../components/invoices/generateinvoice";
import NewMessageComponent from "../components/message/message";
import ReplyComponent from "../components/message/reply";
import PingPreferenceComponent from "../components/pingpref";
import ProfilePanelLookupOpenComponent from "../components/profilepanel/lookup-other";
import ProfilePanelViewSelfProfileComponent from "../components/profilepanel/lookup-self";
import ProfilePanelOpenComponent from "../components/profilepanel/profile-editor";
import QuoteOpenComponent from "../components/quoting/quote";
import RespondQuoteAcceptComponent from "../components/quoting/respondquote-accept";
import RespondQuoteCounterComponent from "../components/quoting/respondquote-counter";
import RespondQuoteCounterSubmitComponent from "../components/quoting/respondquote-counter-submit";
import RespondQuoteDenyComponent from "../components/quoting/respondquote-decline";
import NewApplicationComponent from "../components/ticketpanel/application";
import NewCommissionComponent from "../components/ticketpanel/commission";
import NewSupportComponent from "../components/ticketpanel/support";
import UnarchiveComponent from "../components/unarchive";
import ChannelDeleteEvent from "../events/channelDelete";
import DebugEvent from "../events/debug";
import GuildCreateEvent from "../events/guildCreate";
import GuildMemberRemoveEvent from "../events/guildMemberRemove";
import InteractionCreateEvent from "../events/interactionCreate";
import MessageCreateEvent from "../events/messageCreate";
import MessageDeleteEvent from "../events/messageDelete";
import MessageUpdateEvent from "../events/messageUpdate";
import ReadyEvent from "../events/ready";

export const withCommands = (commandHandler: CommandHandler) => {
	// Applications
	commandHandler.register(new ApplicationsCommand());
	commandHandler.register(new TrialCommand());
	// Banking
	commandHandler.register(new BankCommand());
	commandHandler.register(new FeeCommand());
	commandHandler.register(new ManageBanksCommand());
	// Commissions
	commandHandler.register(new ClaimCommand());
	commandHandler.register(new CompleteCommand());
	commandHandler.register(new DeadlineCommand());
	// Configuration
	commandHandler.register(new BlacklistCommand());
	commandHandler.register(new LangCommand());
	commandHandler.register(new SettingsCommand());
	commandHandler.register(new PanelCommand());
	commandHandler.register(new ServiceCutSplitCommand());
	commandHandler.register(new SetServiceChannelCommand());
	// Informational
	commandHandler.register(new HelpCommand());
	commandHandler.register(new TicketInfoCommand());
	// Invoicing
	commandHandler.register(new InvoiceCommand());
	// Profile
	commandHandler.register(new CreateProfileCommand());
	commandHandler.register(new ProfileCommand());
	commandHandler.register(new ReviewsCommand());
	commandHandler.register(new SetCommand());
	commandHandler.register(new ViewPayPalCommand());
	// Ticket Management
	commandHandler.register(new FreelancerCommand());
	commandHandler.register(new ManageTicketCommand());
	commandHandler.register(new NewCommand());
	commandHandler.register(new TranscriptCommand());
	// Ticketing
	commandHandler.register(new AddCommand());
	commandHandler.register(new ArchiveCommand());
	commandHandler.register(new QuestionsCommand());
	commandHandler.register(new RemoveCommand());
	commandHandler.register(new UnarchiveCommand());
	commandHandler.register(new PurgeTicketsCommand());
	// Utility
	commandHandler.register(new CurrencyCommand());
	commandHandler.register(new AICommand());
	commandHandler.register(new EmbedCommand());
	commandHandler.register(new EvalCommand());
	return commandHandler;
};

export const withComponents = (componentHandler: ComponentHandler) => {
	componentHandler.register(new DenyWithdrawComponent());
	componentHandler.register(new SubmitWithdrawComponent());

	componentHandler.register(new BankPanelComponent());

	componentHandler.register(new CompleteAcceptComponent());
	componentHandler.register(new CompleteDenyComponent());
	componentHandler.register(new CompleteReviewComponent());

	componentHandler.register(new GenerateInvoiceComponent());

	componentHandler.register(new NewMessageComponent());
	componentHandler.register(new ReplyComponent());

	componentHandler.register(new ProfilePanelLookupOpenComponent());
	componentHandler.register(new ProfilePanelOpenComponent());
	componentHandler.register(new ProfilePanelViewSelfProfileComponent());

	componentHandler.register(new QuoteOpenComponent());
	componentHandler.register(new RespondQuoteAcceptComponent());
	componentHandler.register(new RespondQuoteDenyComponent());
	componentHandler.register(new RespondQuoteCounterComponent());
	componentHandler.register(new RespondQuoteCounterSubmitComponent());

	componentHandler.register(new NewCommissionComponent());
	componentHandler.register(new NewApplicationComponent());
	componentHandler.register(new NewSupportComponent());

	componentHandler.register(new ArchiveComponent());
	componentHandler.register(new CancelPromptsComponent());
	componentHandler.register(new CustomerPanelComponent());
	componentHandler.register(new CustomerPanelActionComponent());

	componentHandler.register(new DeleteMessageComponent());
	componentHandler.register(new DenyCommissionComponent());
	componentHandler.register(new DenyRejoinComponent());
	componentHandler.register(new PingPreferenceComponent());
	componentHandler.register(new UnarchiveComponent());
	return componentHandler;
};

export const withEvents = (eventHandler: EventHandler) => {
	eventHandler.register(new ChannelDeleteEvent());
	eventHandler.register(new DebugEvent());
	eventHandler.register(new GuildCreateEvent());
	eventHandler.register(new GuildMemberRemoveEvent());
	eventHandler.register(new InteractionCreateEvent());
	eventHandler.register(new MessageCreateEvent());
	eventHandler.register(new MessageDeleteEvent());
	eventHandler.register(new MessageUpdateEvent());
	eventHandler.register(new ReadyEvent());
	return eventHandler;
};

export const withContextMenuActions = (ctxMenuHandler: ContextMenuHandler) => {
	ctxMenuHandler.register(new CreateSupportTicketMessageAction() as any);
	ctxMenuHandler.register(new CreateSupportTicketUserAction() as any);
	return ctxMenuHandler;
};
