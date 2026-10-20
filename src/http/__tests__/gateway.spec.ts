import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { GatewayClient, GatewayError } from "@/http/gateway";
import { serviceIdHeader } from "@/http/service-id";

describe("explicit gateway HTTP transport", () => {
  it("selects different services for the same operation without changing the body", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify({ ok: true, result: 7 })));
    for (const service of ["authService", "accountsService"] as const) {
      await expect(new GatewayClient("https://gateway.invalid", service, request)
        .call("technicalProbe", { synthetic: true }, z.number())).resolves.toBe(7);
      const [url, options] = request.mock.lastCall!;
      expect(url).toBe("https://gateway.invalid/technicalProbe");
      const headers = new Headers(options?.headers);
      expect(headers.get(serviceIdHeader)).toBe(service);
      expect(headers.has("Authorization")).toBe(false);
      expect(JSON.parse(String(options?.body))).toEqual({ payload: { synthetic: true } });
    }
  });
  it("keeps bearer authentication separate and preserves HTTP failures", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      ok: false, error: "FIXTURE_FORBIDDEN", result: null,
    }), { status: 403 }));
    const client = new GatewayClient("https://gateway.invalid", "accountsService", request);
    await expect(client.call("technicalProbe", null, z.null(), {
      authentication: { kind: "bearer", token: "synthetic-only" },
    })).rejects.toMatchObject({ status: 403, code: "FIXTURE_FORBIDDEN" });
    expect(new Headers(request.mock.lastCall![1]?.headers).get("Authorization")).toBe("Bearer synthetic-only");
  });
  it("rejects HTML/invalid success and unsafe configuration without leaking input", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("<html>private</html>"));
    await expect(new GatewayClient("https://gateway.invalid", "authService", request)
      .call("technicalProbe", null, z.null())).rejects.toEqual(new GatewayError(200, "PROTOCOL_ERROR"));
    expect(() => new GatewayClient("https://gateway.invalid/api/authService", "authService", request))
      .toThrow("Invalid gateway configuration");
    request.mockClear();
    await expect(new GatewayClient("https://gateway.invalid", "authService", request)
      .call("../probe", null, z.null())).rejects.toThrow("Invalid operation");
    expect(request).not.toHaveBeenCalled();
  });
});
