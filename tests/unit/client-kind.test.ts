import type { FastifyRequest } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import {
  getRequestHostname,
  isHtmxWebSubscribe,
  isWebDocumentClient,
  isWebHost,
  prefersJsonApiContract,
} from "../../src/modules/subscriptions/http/client-kind.ts";

function req(partial: {
  query?: FastifyRequest["query"];
  headers?: FastifyRequest["headers"];
}): FastifyRequest {
  return {
    query: partial.query ?? {},
    headers: partial.headers ?? {},
  } as FastifyRequest;
}

describe("getRequestHostname", () => {
  it("strips port from host", () => {
    expect(
      getRequestHostname(req({ headers: { host: "api.localhost:3000" } }))
    ).toBe("api.localhost");
  });

  it("uses first x-forwarded-host value", () => {
    expect(
      getRequestHostname(
        req({
          headers: {
            "x-forwarded-host": "app.example.com",
            host: "internal:8080",
          },
        })
      )
    ).toBe("app.example.com");
  });
});

describe("isWebHost", () => {
  const prevWeb = process.env.WEB_URL;
  const prevBase = process.env.BASE_URL;

  afterEach(() => {
    process.env.WEB_URL = prevWeb;
    process.env.BASE_URL = prevBase;
  });

  it("is true for app.* host", () => {
    expect(
      isWebHost(req({ headers: { host: "app.localhost:3000" } }))
    ).toBe(true);
  });

  it("is false for api.* host", () => {
    expect(
      isWebHost(req({ headers: { host: "api.localhost:3000" } }))
    ).toBe(false);
  });

  it("is false for bare localhost", () => {
    expect(isWebHost(req({ headers: { host: "localhost:3000" } }))).toBe(
      false
    );
  });

  it("matches WEB_URL hostname when set", () => {
    process.env.WEB_URL = "https://subscribe.example.org:8443/path";
    process.env.BASE_URL = "https://api.example.org";
    expect(
      isWebHost(req({ headers: { host: "subscribe.example.org" } }))
    ).toBe(true);
    expect(
      isWebHost(req({ headers: { host: "api.example.org" } }))
    ).toBe(false);
  });
});

describe("prefersJsonApiContract", () => {
  it("forces JSON with format=json on app host", () => {
    expect(
      prefersJsonApiContract(
        req({
          query: { format: "json" },
          headers: { host: "app.localhost:3000" },
        })
      )
    ).toBe(true);
  });

  it("is false on app host without override", () => {
    expect(
      prefersJsonApiContract(
        req({ headers: { host: "app.localhost:3000" } })
      )
    ).toBe(false);
  });

  it("is true on api host", () => {
    expect(
      prefersJsonApiContract(
        req({ headers: { host: "api.localhost:3000" } })
      )
    ).toBe(true);
  });
});

describe("isWebDocumentClient", () => {
  it("is true on app host", () => {
    expect(
      isWebDocumentClient(req({ headers: { host: "app.localhost" } }))
    ).toBe(true);
  });
});

describe("isHtmxWebSubscribe", () => {
  it("is true on app host with HX-Request", () => {
    expect(
      isHtmxWebSubscribe(
        req({
          headers: {
            host: "app.localhost:3000",
            "hx-request": "true",
          },
        })
      )
    ).toBe(true);
  });

  it("is false on api host even with HX-Request", () => {
    expect(
      isHtmxWebSubscribe(
        req({
          headers: {
            host: "api.localhost:3000",
            "hx-request": "true",
          },
        })
      )
    ).toBe(false);
  });

  it("is false without HX-Request on app host", () => {
    expect(
      isHtmxWebSubscribe(
        req({ headers: { host: "app.localhost:3000" } })
      )
    ).toBe(false);
  });
});
