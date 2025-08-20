import { releaseNotesMode } from "../src/modes/release-notes";

describe("releaseNotesMode", () => {
  it("should trigger on push to main", () => {
    const context = { eventName: "push", payload: { ref: "refs/heads/main" }, inputs: { target_branch: "main" } };
    expect(releaseNotesMode.shouldTrigger(context)).toBe(true);
  });

  it("should not trigger on non-push", () => {
    const context = { eventName: "issues" };
    expect(releaseNotesMode.shouldTrigger(context)).toBe(false);
  });

  // Add more tests for other methods
});
