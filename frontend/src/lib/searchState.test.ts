import {
  filtersAfterClearingSearch,
  filtersForNewSearch,
  shouldClearSubmittedSearch,
} from "./searchState";

const base = {
  centers: [] as string[],
  keywords: [] as string[],
  objectTags: [] as string[],
};

describe("searchState", () => {
  it("replaces prior activated tags instead of accumulating them", () => {
    const filters = { ...base, objectTags: ["women", "ksc-manual", "smile"] };
    const next = filtersForNewSearch(filters, ["women", "smile"], ["smile"]);
    expect(next.objectTags.sort()).toEqual(["ksc-manual", "smile"]);
  });

  it("keeps manual object tags across a new search", () => {
    const filters = { ...base, objectTags: ["rover", "women"] };
    const next = filtersForNewSearch(filters, ["women"], ["smile"]);
    expect(next.objectTags.sort()).toEqual(["rover", "smile"]);
  });

  it("drops activated tags when clearing search", () => {
    const filters = { ...base, objectTags: ["smile", "rover"] };
    const next = filtersAfterClearingSearch(filters, ["smile"]);
    expect(next.objectTags).toEqual(["rover"]);
  });

  it("detects clearing the submitted query text", () => {
    expect(shouldClearSubmittedSearch("", "smile")).toBe(true);
    expect(shouldClearSubmittedSearch("sm", "smile")).toBe(false);
  });
});
