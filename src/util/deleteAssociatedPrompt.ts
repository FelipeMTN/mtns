import Ticket from "@classes/Ticket";

export const deleteAssociatedPrompt = async (ticket: Ticket) => {
	// This function uses raw SQL queries to avoid a circular dependency to Prompt, causing an error.
	const [results] = await ticket.sequelize.query(`SELECT * FROM prompts WHERE "ticketId" = '${ticket.id}'`);
	if (results.length > 0) {
		await ticket.sequelize.query(`DELETE FROM prompts WHERE "ticketId" = '${ticket.id}'`);
	}
};
