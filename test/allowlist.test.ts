import { afterEach, describe, expect, it } from "vitest";
import { getAdminEmails, isAllowedAdminEmail } from "@/lib/auth/allowlist";

const originalAdminEmails = process.env.ADMIN_EMAILS;

afterEach(() => {
  process.env.ADMIN_EMAILS = originalAdminEmails;
});

describe("admin allowlist", () => {
  it("normalizes configured owner emails", () => {
    process.env.ADMIN_EMAILS = " Owner@Example.com, second@example.com ";

    expect(getAdminEmails()).toEqual(["owner@example.com", "second@example.com"]);
  });

  it("rejects missing and non-owner emails", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";

    expect(isAllowedAdminEmail(null)).toBe(false);
    expect(isAllowedAdminEmail("stranger@example.com")).toBe(false);
  });

  it("accepts owner emails case-insensitively", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";

    expect(isAllowedAdminEmail("OWNER@example.com")).toBe(true);
  });
});
