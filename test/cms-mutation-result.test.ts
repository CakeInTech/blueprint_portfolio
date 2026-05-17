import { describe, expect, it } from "vitest";
import {
  cmsMutationFailure,
  cmsMutationSuccess,
  normalizeMutationError,
} from "@/lib/cms/mutation-result";

describe("cms mutation result", () => {
  it("returns a standardized success envelope", () => {
    const result = cmsMutationSuccess({ id: "1" }, "Saved profile.");

    expect(result).toEqual({
      ok: true,
      code: "OK",
      message: "Saved profile.",
      data: { id: "1" },
    });
  });

  it("returns a standardized failure envelope", () => {
    expect(cmsMutationFailure("CONFLICT", "Conflict.")).toEqual({
      ok: false,
      code: "CONFLICT",
      message: "Conflict.",
    });
  });

  it("normalizes auth errors", () => {
    expect(normalizeMutationError(new Error("Unauthorized"))).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "You are not authorized.",
    });
  });

  it("normalizes db errors from known db code", () => {
    expect(normalizeMutationError({ code: "23505" })).toEqual({
      ok: false,
      code: "DB_ERROR",
      message: "Unable to save changes right now.",
    });
  });
});
