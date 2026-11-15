import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";

describe("ApiError.fieldErrors", () => {
  it("reads the backend's list of field errors", () => {
    const error = new ApiError(422, "VALIDATION_ERROR", "Some fields are invalid.", {
      fields: [
        { field: "spent_on", message: "The date can't be in the future." },
        { field: "amount", message: "Enter an amount." },
        { field: "amount", message: "A second message is ignored." },
        { message: "No field name" },
      ],
    });
    expect(error.fieldErrors()).toEqual({
      spent_on: "The date can't be in the future.",
      amount: "Enter an amount.",
    });
  });

  it("also reads a field-to-message map", () => {
    const error = new ApiError(422, "VALIDATION_ERROR", "Invalid", {
      fields: { zip: "Enter a 5-digit US ZIP code." },
    });
    expect(error.fieldErrors()).toEqual({ zip: "Enter a 5-digit US ZIP code." });
  });

  it("is empty when there are no field errors", () => {
    expect(new ApiError(500, "SERVER_ERROR", "Oops").fieldErrors()).toEqual({});
  });
});
