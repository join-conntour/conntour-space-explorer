import { expect, test, type APIRequestContext } from "@playwright/test";

async function deleteSourcesByNasaId(request: APIRequestContext, nasaId: string) {
  const listed = await request.get("/api/sources", {
    params: { page: 1, page_size: 60, sort: "most_recent" },
  });
  expect(listed.ok()).toBeTruthy();
  const body = await listed.json();
  const matches = (body.items || []).filter((item: { nasa_id?: string }) => item.nasa_id === nasaId);
  for (const item of matches) {
    const deleted = await request.delete(`/api/sources/${item.id}`);
    expect(deleted.status()).toBe(204);
  }
}

test.describe("NASA Space Explorer", () => {
  test("browses the catalog and restores it after clearing search", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "NASA Space Explorer" })).toBeVisible();
    await expect(page.getByText(/Showing \d+ of 100 images/)).toBeVisible();

    await page.getByPlaceholder(/Search NASA images/).fill("mars");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByText(/Search results for "mars"/)).toBeVisible();

    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.getByText("Browsing NASA image catalog")).toBeVisible();
    await expect(page.getByText(/Showing \d+ of 100 images/)).toBeVisible();
  });

  test("smile search is not stuck under a prior women filter", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder(/Search NASA images/).fill("women");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByText(/Showing \d+ of 11 images/)).toBeVisible({ timeout: 15_000 });

    await page.getByPlaceholder(/Search NASA images/).fill("smile");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByText(/Showing \d+ of 13 images/)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.getByText("Browsing NASA image catalog")).toBeVisible();
    await expect(page.getByText(/Showing \d+ of 100 images/)).toBeVisible();
  });

  test("finds blue-shirt images for men with blue shirt", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/Search NASA images/).fill("men with blue shirt");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(
      page.getByRole("heading", {
        name: "NASA Astronaut Victor Glover Views Artemis II Rocket Stage at NASA Michoud",
      })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", {
        name: "Artemis I Baton Handoff from EGS Ops to Launch Director",
      })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Expedition 6 Press Conference" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("heading", { name: "KSC-07pd1929" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "KSC-2010-1278" })).toBeVisible();
  });

  test("clears search history from the sidebar", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/Search NASA images/).fill("orion");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByText(/Search results for "orion"/)).toBeVisible();

    await page.getByRole("button", { name: "History" }).click();
    await expect(page.getByRole("button", { name: "Clear history" })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Clear history" }).click();
    await expect(page.getByRole("heading", { name: "Clear search history?" })).toBeVisible();
    await page.getByRole("button", { name: "Clear all" }).click();
    await expect(page.getByText(/No searches yet/)).toBeVisible({ timeout: 10_000 });
  });

  test("opens the immersive image details modal", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Showing \d+ of \d+ images/)).toBeVisible();
    await page.locator(".cursor-pointer").first().click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Classifications" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Record" })).toBeVisible();
  });

  test("adds a new image through the ingest dialog", async ({ page, request }) => {
    const nasaId = "e2e-playwright-probe";
    const unique = `Playwright Probe ${Date.now()}`;
    try {
      await page.goto("/");
      await page.getByRole("button", { name: "Add image" }).click();
      await page.getByLabel("Title").fill(unique);
      await page.getByLabel("Image URL").fill("https://images-assets.nasa.gov/image/PIA22505/PIA22505~medium.jpg");
      await page.getByLabel("Description").fill("A rover on Mars captured by Odyssey.");
      await page.getByLabel("NASA ID").fill(nasaId);
      await page.getByRole("button", { name: "Save image" }).click();
      await expect(page.getByText("Browsing NASA image catalog")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(unique)).toBeVisible({ timeout: 15_000 });
    } finally {
      await deleteSourcesByNasaId(request, nasaId);
    }
  });
});
