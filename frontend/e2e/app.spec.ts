"use client";

import { test, expect, type Page } from "@playwright/test";

const TERMS =
  "1. AGREEMENT. Provider shall deliver 100 widgets to Client by March 1st for 50 GEN.  2. QUALITY. All widgets shall pass inspection.  3. PAYMENT. Client shall pay within 14 days of accepted delivery.";
const SALT = "p2p-live-salt-0f1a9b2c3d4e5f6a";

async function fillCommit(page: Page) {
  await page.locator("#terms").fill(TERMS);
  await page.locator("#salt").fill(SALT);
  await page.getByRole("button", { name: "Commit hash" }).click();
}

async function switchParty(page: Page, to: "A" | "B") {
  await page.getByRole("button", { name: `Switch to Party ${to}` }).click();
}

test("home page renders hero, how-it-works and contract bar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Vacto", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("How it works")).toBeVisible();
  await expect(
    page.getByText("Contract of record", { exact: true })
  ).toBeVisible();
});

test("demo: two parties commit identical terms → private close resolves", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start Demo" }).click();

  await expect(page.getByText("Demo Mode — Party A")).toBeVisible();

  // Party A commits
  await fillCommit(page);
  await expect(page.getByText(/counterparty committed/i)).toBeHidden();

  // Party B commits the SAME terms + salt
  await switchParty(page, "B");
  await fillCommit(page);

  // ACTIVE reached when private-close panel appears → both sides approve
  const approveBtn = page.getByRole("button", { name: "Approve private close" });
  await expect(approveBtn).toBeVisible();
  await expect(approveBtn).toBeEnabled();
  await approveBtn.click();
  await switchParty(page, "A");
  await expect(approveBtn).toBeEnabled();
  await approveBtn.click();

  await expect(page.getByText(/Matter closed privately/i)).toBeVisible();
});

test("demo: full dispute — commit → reveal → statements → evidence → resolve", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start Demo" }).click();

  await fillCommit(page);
  await switchParty(page, "B");
  await fillCommit(page);
  // ACTIVE reached when private-close panel appears
  await expect(
    page.getByRole("button", { name: "Approve private close" })
  ).toBeVisible();

  // Open dispute from ACTIVE
  await switchParty(page, "A");
  await page.locator("#d-terms").fill(TERMS);
  await page.locator("#d-salt").fill(SALT);
  const revealBtn = page.locator("button", { hasText: "Reveal terms" });
  await expect(revealBtn).toBeEnabled();
  await revealBtn.click();

  await expect(
    page.getByRole("heading", { name: "Dispute in progress" })
  ).toBeVisible();

  // Statements
  await page.locator("#stmt").fill("I delivered all 100 widgets on time.");
  await page.getByRole("button", { name: "Submit statement" }).click();
  await switchParty(page, "B"); // note: party label resets—we are on B now
  await page
    .locator("#stmt")
    .fill("The delivery arrived late and defective.");
  await page.getByRole("button", { name: "Submit statement" }).click();

  // Both mark "no evidence" → resolution unlocks
  await page.getByRole("button", { name: /I have no evidence/ }).click();
  await switchParty(page, "A");
  await page.getByRole("button", { name: /I have no evidence/ }).click();

  await expect(page.getByText(/Ready for arbitration/i)).toBeVisible();
  await page.getByRole("button", { name: "Resolve with AI jury" }).click();

  await expect(page.getByText(/Arbitration verdict|Matter closed privately/)).toBeVisible();
});

test("contract bar: invalid address blocked, reset unloads", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("Contract address");
  await input.fill("0x123");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "Load contract" })).toBeDisabled();

  // After filling a valid address and loading, a Reset (unload) control exists.
  await input.fill("0x9f5dcb8b5eb62e3b56d63ecc706a48d846c2d949");
  await page.getByRole("button", { name: "Load contract" }).click();
  await expect(page.getByTitle(/Unload this contract/)).toBeVisible();
});