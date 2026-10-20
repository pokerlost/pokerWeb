import { z } from "zod";

import { serviceIdHeader, serviceIdSchema, type ServiceId } from "./service-id";

export type Authentication = { kind: "public" } | { kind: "bearer"; token: string };

export class GatewayError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super("Gateway request failed");
  }
}

const envelope = z.strictObject({
  ok: z.boolean(),
  result: z.unknown().optional().default(null),
  error: z.string().nullable().optional().default(null),
  error_message: z.string().nullable().optional().default(null),
  retry_after: z.number().finite().nonnegative().nullable().optional().default(null),
});

// A future HTTP integration can use this adapter. GameSource remains unavailable.
// No operation name, credential storage, game rules or realtime handshake is invented.
export class GatewayClient {
  private readonly origin: string;
  private readonly serviceId: ServiceId;

  constructor(origin: string, serviceId: ServiceId, private readonly request: typeof fetch = fetch) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error("Invalid gateway configuration");
    }
    const identity = serviceIdSchema.safeParse(serviceId);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password
      || url.pathname !== "/" || url.search || url.hash || !identity.success)
      throw new Error("Invalid gateway configuration");
    this.origin = url.origin;
    this.serviceId = identity.data;
  }

  async call<T>(operation: string, payload: unknown, result: z.ZodType<T>, options: {
    authentication?: Authentication;
    signal?: AbortSignal;
  } = {}): Promise<T> {
    if (!/^[a-z][A-Za-z0-9]*$/.test(operation)) throw new Error("Invalid operation");
    const headers = new Headers({
      "Content-Type": "application/json",
      [serviceIdHeader]: this.serviceId,
    });
    if (options.authentication?.kind === "bearer") {
      if (!/^[\x21-\x7e]+$/.test(options.authentication.token))
        throw new Error("Invalid authentication configuration");
      headers.set("Authorization", `Bearer ${options.authentication.token}`);
    }
    const timeout = AbortSignal.timeout(10_000);
    const response = await this.request(`${this.origin}/${operation}`, {
      method: "POST",
      body: JSON.stringify({ payload }),
      headers,
      credentials: "omit",
      redirect: "error",
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    });
    let decoded: unknown;
    try {
      decoded = await response.json();
    } catch {
      throw new GatewayError(response.status, "PROTOCOL_ERROR");
    }
    const parsed = envelope.safeParse(decoded);
    if (!parsed.success) throw new GatewayError(response.status, "PROTOCOL_ERROR");
    const value = parsed.data;
    if (!value.ok) {
      if (value.result !== null || !value.error)
        throw new GatewayError(response.status, "PROTOCOL_ERROR");
      throw new GatewayError(response.status, value.error);
    }
    if (!response.ok || value.error !== null || value.error_message !== null || value.retry_after !== null)
      throw new GatewayError(response.status, "PROTOCOL_ERROR");
    const validated = result.safeParse(value.result);
    if (!validated.success) throw new GatewayError(response.status, "PROTOCOL_ERROR");
    return validated.data;
  }
}
