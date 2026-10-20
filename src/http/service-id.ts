// Generated snapshot of pypokerlost.enums.ServiceId, SDK main
// c4d8327e8318eab6769b3f05c4a7d848c75afb0b. Review SDK diff before regeneration.
import { z } from "zod";

export const serviceIdSchema = z.enum([
  "authService", "accountsService", "virtualMoney", "pokerService", "cryptoService",
]);
export type ServiceId = z.infer<typeof serviceIdSchema>;
export const serviceIdHeader = "x-pokerlost-serviceId";
