import { z } from "zod";

import { GatewayClient } from "./gateway";
import type { ServiceId } from "./service-id";

export const environmentSchema = z.enum(["main", "dev", "test", "local"]);
export type Environment = z.infer<typeof environmentSchema>;
export type EnvironmentConfig = Readonly<{
  environment: Environment;
  endpoints: Readonly<Partial<Record<Environment, string>>>;
}>;

// Explicit data only: no ambient build variables, browser storage or fallback to main.
export function createGatewayClient(config: EnvironmentConfig, service: ServiceId, request: typeof fetch = fetch): GatewayClient {
  const selected = environmentSchema.safeParse(config.environment);
  if (!selected.success) throw new Error("Invalid environment configuration");
  const endpoint = config.endpoints[selected.data];
  if (!endpoint) throw new Error("Selected environment is not_configured");
  return new GatewayClient(endpoint, service, request, selected.data);
}
