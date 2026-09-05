import { expect, test } from "@playwright/test";

const dates = ["2026-09-10", "2026-09-11", "2026-09-12"];

test("unknown calendar renders 404", async ({ page }) => {
  const response = await page.goto("/no-calendar-e2e-404");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("No calendar here")).toBeVisible();
});

test("creator can open dates, add items, and a guest can book a buffered slot", async ({
  page,
}) => {
  const username = `e2e-${Date.now()}`;

  await page.goto("/");
  await page.getByPlaceholder("alex").fill(username);
  await page.getByRole("button", { name: "Create calendar" }).click();
  await expect(page).toHaveURL(new RegExp(`/setup/${username}$`));
  await expect(page.getByTestId("setup-heading")).toHaveText(`/${username}`);

  for (const date of dates) {
    await page.getByTestId(`day-${date}`).click();
  }

  const firstItem = page.locator("article").nth(0);
  await firstItem.getByLabel("Item name").fill("Dinner");
  await firstItem.getByLabel("Duration").selectOption("90");
  await firstItem.getByRole("button", { name: "10 Sep" }).click();
  await firstItem.getByRole("button", { name: "11 Sep" }).click();
  await firstItem.getByRole("button", { name: "12 Sep" }).click();

  await page.getByRole("button", { name: "Add item" }).click();
  const secondItem = page.locator("article").nth(1);
  await secondItem.getByLabel("Item name").fill("Badminton");
  await secondItem.getByLabel("Duration").selectOption("60");
  await secondItem.getByRole("button", { name: "10 Sep" }).click();
  await secondItem.getByRole("button", { name: "11 Sep" }).click();
  await secondItem.getByRole("button", { name: "12 Sep" }).click();

  await page.getByLabel("Email").fill(`host-${username}@example.com`);
  await page.getByPlaceholder("+44 7911 123456").fill("+447496888123");
  await page.getByRole("button", { name: "Save calendar" }).click();
  await expect(page.getByRole("heading", { name: `/${username} is live` })).toBeVisible();
  const editKey = new URL(page.url()).searchParams.get("key");
  expect(editKey).toBeTruthy();
  await expect(page.getByRole("link", { name: "Open bookings" })).toBeVisible();

  await page.goto(`/${username}`);
  await expect(page.getByRole("heading", { name: username })).toBeVisible();
  await expect(page.getByTestId("day-2026-09-10")).toHaveAttribute("data-open", "true");
  await expect(page.getByTestId("day-2026-09-09")).toHaveAttribute("data-open", "false");
  await page.getByTestId("chip-2026-09-10-Dinner").click();

  const firstSlot = page.locator("[data-testid^='slot-']").first();
  await expect(firstSlot).toBeVisible();
  const bookedLabel = (await firstSlot.innerText()).trim();
  await firstSlot.click();

  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByPlaceholder("+44 7911 123456").fill("+447496888124");
  await page.getByRole("button", { name: "Book slot" }).click();
  await expect(page.getByRole("heading", { name: "You are on the ledger" })).toBeVisible();
  await expect(page.getByText("Dinner")).toBeVisible();

  await page.getByRole("button", { name: "Book another slot" }).click();
  await page.getByTestId("chip-2026-09-10-Badminton").click();
  await expect(page.locator("[data-testid^='slot-']").first()).toBeVisible();
  await expect(page.getByTestId(`slot-${bookedLabel}`)).toHaveCount(0);

  await page.goto(`/setup/${username}/bookings`);
  await expect(page.getByTestId("bookings-denied")).toBeVisible();
  await expect(page.getByText("Ada Lovelace")).toHaveCount(0);

  await page.goto(
    `/setup/${username}/bookings?key=${encodeURIComponent(editKey!)}`,
  );
  await expect(page.getByTestId("bookings-heading")).toHaveText(`/${username}`);
  await expect(page.getByTestId("booking-date-2026-09-10")).toBeVisible();
  await expect(page.getByText("Ada Lovelace")).toBeVisible();
  await expect(page.getByText("Dinner")).toBeVisible();
});
