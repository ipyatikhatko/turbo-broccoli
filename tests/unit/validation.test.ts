import { describe, expect, it } from "vitest";

import { parseOwnerRepo } from "../../src/modules/subscriptions/validation.ts";

describe("parseOwnerRepo", () => {
  it("parses golang/go", () => {
    expect(parseOwnerRepo("golang/go")).toEqual({
      owner: "golang",
      repo: "go",
    });
  });

  it("trims whitespace", () => {
    expect(parseOwnerRepo("  foo/bar  ")).toEqual({
      owner: "foo",
      repo: "bar",
    });
  });

  it("returns null for missing slash", () => {
    expect(parseOwnerRepo("foorepo")).toBeNull();
  });

  it("returns null for empty segment", () => {
    expect(parseOwnerRepo("/bar")).toBeNull();
    expect(parseOwnerRepo("foo/")).toBeNull();
  });

  it("returns null for double slash extra path", () => {
    expect(parseOwnerRepo("foo/bar/baz")).toBeNull();
  });
});
