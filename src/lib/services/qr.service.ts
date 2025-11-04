export const validateTicket = async (
	ticketNumber: string
): Promise<{ valid: boolean; message: string; ticketNumber: string }> => {
	await new Promise((resolve) => setTimeout(resolve, 1000));

	const validTickets = ['12345', '67890', '11111', '22222', '33333'];
	const processedTickets = ['99999', '88888', '77777'];

	if (processedTickets.includes(ticketNumber)) {
		return { valid: false, message: 'Entrada ya procesada', ticketNumber };
	}

	if (validTickets.includes(ticketNumber)) {
		return { valid: true, message: 'Entrada válida - Acceso permitido', ticketNumber };
	}

	return { valid: false, message: 'Entrada no encontrada', ticketNumber };
};
