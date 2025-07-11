export interface GatewayMetadata {
	id: string;
	name: string;
	description: string;
	version: string;
	supportsRefresh?: boolean;
}

export interface CreatePaymentResult {
	url: string;
	gatewayId: string;
	gatewayReference?: string;
}

export interface CreatePaymentOptions {
	amount: number;
	title: string;
	description: string;
}
