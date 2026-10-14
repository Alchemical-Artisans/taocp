import { expect, test, type Page } from "@playwright/test"

/* The extended Euclid trace: the table redrawn from whatever m and n the
   reader puts in the two boxes above it. */

const PAGE = "/vol-1/ch-1/1-2/1-2-1"

function rows(page: Page) {
  return page.locator("table.trace tbody tr")
}

function cells(page: Page, row: number) {
  return rows(page).nth(row).locator("td")
}

/* The two equations under the table. Typeset, so the TeX KaTeX keeps beside
   its output is read rather than the glyphs. */
function answers(page: Page) {
  return page.locator(".answers li .katex-mathml annotation")
}

async function run(page: Page, m: string, n: string) {
  await page.goto(PAGE)
  await page.getByLabel("m", { exact: true }).fill(m)
  await page.getByLabel("n", { exact: true }).fill(n)
}

test("traces every step down to the remainder that ends it", async ({ page }) => {
  await run(page, "1769", "551")

  await expect(rows(page)).toHaveCount(4)
  await expect(cells(page, 0)).toHaveText(["1", "0", "0", "1", "1769", "551", "3", "116"])
  /* d is the greatest common divisor, and a·m + b·n = d: 5·1769 − 16·551 = 29. */
  await expect(cells(page, 3)).toHaveText(["-4", "5", "13", "-16", "87", "29", "3", "0"])
})

/* With m < n the first pass through E2 only swaps the two, which puts m back in
   the c column two rows later. A table that treated c as a row's identity
   stopped redrawing at that point. */
test("traces a pair given smaller first", async ({ page }) => {
  await run(page, "5", "12")

  await expect(rows(page)).toHaveCount(4)
  await expect(cells(page, 0)).toHaveText(["1", "0", "0", "1", "5", "12", "0", "5"])
  await expect(cells(page, 2)).toHaveText(["1", "-2", "0", "1", "5", "2", "2", "1"])
  await expect(cells(page, 3)).toHaveText(["-2", "5", "1", "-2", "2", "1", "2", "0"])
})

test("marks the coefficients and the divisor on the step that answers", async ({ page }) => {
  await run(page, "1769", "551")

  /* a, b and d on the last row, and nothing on the working above it. */
  await expect(cells(page, 3).and(page.locator(".result"))).toHaveText(["5", "-16", "29"])
  await expect(page.locator("table.trace tbody td.result")).toHaveCount(3)
})

test("states both results over the values that were put in", async ({ page }) => {
  await run(page, "1769", "551")

  await expect(answers(page)).toHaveText([
    "5 \\cdot 1769 - 16 \\cdot 551 = 29",
    "\\gcd(1769, 551) = 29",
  ])
})

/* b is negative more often than not, but when it isn't the identity is written
   as the addition it is rather than as a plus followed by a minus sign. */
test("writes a positive coefficient as an addition", async ({ page }) => {
  await run(page, "12", "4")

  await expect(answers(page)).toHaveText(["0 \\cdot 12 + 1 \\cdot 4 = 4", "\\gcd(12, 4) = 4"])
})

test("asks for positive integers when the boxes hold anything else", async ({ page }) => {
  await run(page, "12", "0")
  await expect(page.getByText("m and n must both be positive integers.")).toBeVisible()
  /* Nothing has been found, so neither equation is stated. */
  await expect(page.locator(".answers")).toHaveCount(0)

  await run(page, "12", "")
  await expect(page.getByText("m and n must both be positive integers.")).toBeVisible()

  await run(page, "2.5", "4")
  await expect(page.getByText("m and n must both be positive integers.")).toBeVisible()
})
