import { z } from "zod";

export const paymentsConfig = z.any();

export type PaymentsConfig = z.infer<typeof paymentsConfig>;
