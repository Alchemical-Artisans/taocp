import { expect, test, type Page } from "@playwright/test"

/* The A* trace's two reader-facing controls: how many steps to run before
   giving up, and whether to show the whole application or only its ends. */

const PAGE = "/vol-1/ch-1/1-1"

function traceRows(page: Page) {
  return page.locator("table.a-star-trace tbody tr")
}

function cells(page: Page, row: number) {
  return traceRows(page).nth(row).locator("td")
}

test("runs the default rules to a terminal stage", async ({ page }) => {
  await page.goto(PAGE)

  await expect(page.getByText("didn't reach a terminal stage")).toBeHidden()
})

test("gives up after the number of steps the reader asks for", async ({ page }) => {
  await page.goto(PAGE)
  await page.getByLabel("Maximum steps").fill("2")

  await expect(
    page.getByText("The algorithm didn't reach a terminal stage within 2 steps for this input."),
  ).toBeVisible()
  /* All three strings sit in stage 0, so they group into one collapsed row. */
  await expect(traceRows(page)).toHaveCount(1)
  await expect(page.getByRole("button", { name: "0…2" })).toBeVisible()
})

test("asks for a positive step limit when the box is cleared", async ({ page }) => {
  await page.goto(PAGE)
  await page.getByLabel("Maximum steps").fill("")

  await expect(
    page.getByText("The maximum number of steps must be a positive integer."),
  ).toBeVisible()
})

test("collapses the whole application to its start and end", async ({ page }) => {
  await page.goto(PAGE)
  await page.getByLabel("Collapse to start and end").check()

  await expect(traceRows(page)).toHaveCount(3)
  /* a^3 b^5 in, c^15 out: the rules multiply. */
  expect(await cells(page, 0).nth(1).innerText()).toBe("a3b5")
  expect(await cells(page, 2).nth(1).innerText()).toBe("c15")

  const [first, elided, last] = await traceRows(page).evaluateAll((rows) =>
    rows.map((row) => (row.firstElementChild as HTMLElement).innerText),
  )
  expect([first, elided, last]).toEqual(["0", "1…65", "66"])
})

test("keeps the collapsed ends in step with the step limit", async ({ page }) => {
  await page.goto(PAGE)
  await page.getByLabel("Collapse to start and end").check()
  await page.getByLabel("Maximum steps").fill("1")

  await expect(traceRows(page)).toHaveCount(2)
  expect(await cells(page, 1).nth(1).innerText()).toBe("a2bacb4")
})
