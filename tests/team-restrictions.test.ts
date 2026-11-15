import { describe, expect, test } from "vitest";

import {
  inviteTeamMemberSchema,
  updateMemberRestrictionsSchema,
} from "@/lib/validations/team";

describe("updateMemberRestrictionsSchema", () => {
  test("accepts all and assigned_only lead visibility and rejects team", () => {
    expect(
      updateMemberRestrictionsSchema.safeParse({ leadVisibility: "all" })
        .success,
    ).toBe(true);
    expect(
      updateMemberRestrictionsSchema.safeParse({
        leadVisibility: "assigned_only",
      }).success,
    ).toBe(true);
    expect(
      updateMemberRestrictionsSchema.safeParse({ leadVisibility: "team" })
        .success,
    ).toBe(false);
  });

  test("accepts known job functions and an empty string", () => {
    for (const jobFunction of [
      "cold_caller",
      "lead_manager",
      "acquisitions_manager",
      "",
    ]) {
      expect(
        updateMemberRestrictionsSchema.safeParse({
          leadVisibility: "all",
          jobFunction,
        }).success,
      ).toBe(true);
    }
  });

  test("rejects non-whole maxOpenLeads values and accepts empty, zero, and ten", () => {
    for (const maxOpenLeads of ["1.5", "-1", "x"]) {
      expect(
        updateMemberRestrictionsSchema.safeParse({
          leadVisibility: "all",
          maxOpenLeads,
        }).success,
      ).toBe(false);
    }

    for (const maxOpenLeads of ["", "0", "10"]) {
      expect(
        updateMemberRestrictionsSchema.safeParse({
          leadVisibility: "all",
          maxOpenLeads,
        }).success,
      ).toBe(true);
    }
  });
});

describe("inviteTeamMemberSchema", () => {
  test("rejects an invalid email and the owner role", () => {
    expect(
      inviteTeamMemberSchema.safeParse({
        email: "not-an-email",
        role: "member",
      }).success,
    ).toBe(false);
    expect(
      inviteTeamMemberSchema.safeParse({
        email: "owner@example.com",
        role: "owner",
      }).success,
    ).toBe(false);
  });

  test("accepts admin and member invites with a valid email", () => {
    expect(
      inviteTeamMemberSchema.safeParse({
        email: "admin@example.com",
        role: "admin",
      }).success,
    ).toBe(true);
    expect(
      inviteTeamMemberSchema.safeParse({
        email: "member@example.com",
        role: "member",
      }).success,
    ).toBe(true);
  });
});
