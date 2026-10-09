import { expect, test, type Page } from "@playwright/test"

/* The closed-form tool. The algebra engine arrives after the page, so every
   assertion here waits on values rather than on the markup around them. */

const PAGE = "/vol-1/ch-1/1-2/1-2-1"

/**
 * The exact values of one row, the leading `x` included. Each is typeset, so
 * the TeX that KaTeX keeps beside its output is read rather than the glyphs,
 * which also leaves the decimal approximation beside a cell out of it.
 */
function row(page: Page, index: number) {
  return page.locator("table.values tbody tr").nth(index).locator(".katex-mathml annotation")
}

/* Exact, because "f(x)" otherwise also matches "Remove f(x)". */
function formula(page: Page, name: string) {
  return page.getByRole("textbox", { name: `${name}(x)`, exact: true })
}

/**
 * Put the table into a known state. The formulas the page opens on are the
 * author's to change, so a test that needs particular values says so itself
 * rather than reading them off the page and breaking when the prose around
 * them is revised.
 */
async function enter(page: Page, bodies: Record<string, string>) {
  await page.goto(PAGE)
  const removers = page.getByRole("button", { name: /^Remove / })
  await expect(removers.first()).toBeVisible()
  while ((await removers.count()) > 3) await removers.last().click()
  for (const name of ["f", "g", "h"]) {
    await formula(page, name).fill(bodies[name] ?? "")
  }
}

/* The one test that does look at the page's own formulas, and so says nothing
   about what they are: whatever the author has put there should tabulate. */
test("opens on formulas that all have values", async ({ page }) => {
  await page.goto(PAGE)
  await expect(page.locator("table.values tbody tr")).toHaveCount(10)

  const cells = page.locator("table.values tbody td")
  const count = await cells.count()
  expect(count).toBeGreaterThan(0)
  await expect(cells.locator(".katex")).toHaveCount(count)
  await expect(page.locator(".entry-error")).toHaveCount(0)
})

test("labels each line with the name the other lines call it by", async ({ page }) => {
  await enter(page, { f: "x", g: "x^2", h: "x^3" })

  await expect(row(page, 2)).toHaveText(["3", "3", "9", "27"])
  /* The columns are headed by the whole equation, name included, so a column
     reads without looking back up at the boxes. Read from the annotation, as
     the rows are: KaTeX writes the same text into its HTML, its MathML and the
     annotation, so the heading reads triple. */
  await expect(page.locator("table.values thead th .katex-mathml annotation")).toHaveText([
    "f(x) = x",
    "g(x) = x^2",
    "h(x) = x^3",
  ])
})

test("takes a formula written over several lines", async ({ page }) => {
  await enter(page, { f: "x" })
  const box = formula(page, "f")
  const short = await box.evaluate((node) => node.clientHeight)

  await box.fill(
    ["\\begin{cases}", "  0 & x \\lt 3 \\\\", "  x^2 & x \\gt 2", "\\end{cases}"].join("\n"),
  )

  await expect(row(page, 0)).toHaveText(["1", "0"])
  await expect(row(page, 3)).toHaveText(["4", "16"])
  /* The box grows to what it holds rather than scrolling inside itself. */
  expect(await box.evaluate((node) => node.clientHeight)).toBeGreaterThan(short)
  expect(await box.evaluate((node) => node.scrollHeight - node.clientHeight)).toBe(0)
})

test("tabulates a summation", async ({ page }) => {
  await enter(page, { f: "\\sum_{k=1}^{x} k" })

  await expect(row(page, 3)).toHaveText(["4", "10"])
  /* The triangular numbers, which the reader is left to recognise. */
  await expect(row(page, 9)).toHaveText(["10", "55"])
})

test("keeps a value exact and shows its decimal beside it", async ({ page }) => {
  await enter(page, { f: "\\sum_{k=1}^{x} 1/k" })

  await expect(row(page, 3)).toHaveText(["4", "\\frac{25}{12}"])
  await expect(page.getByText("≈ 2.083333333")).toBeVisible()
})

test("lets one line call another by name", async ({ page }) => {
  await enter(page, { f: "x^2", g: "f(x) + 1" })

  await expect(row(page, 2)).toHaveText(["3", "9", "10"])
})

test("names a line that is blank when another one calls it", async ({ page }) => {
  await enter(page, { f: "h(x) + 1" })

  await expect(page.getByText("h has no definition")).toHaveCount(1)
})

test("says what is wrong with a recurrence that has no base case", async ({ page }) => {
  await enter(page, { f: "f(x-1) + 1" })

  await expect(page.getByText("never reaches a base case")).toHaveCount(1)
})

test("tells a reader who writes a left-hand side anyway", async ({ page }) => {
  await enter(page, { f: "f(x) = x^2" })

  await expect(
    page.getByText("this line is already f(x) = …, so leave that part out"),
  ).toBeVisible()
})

test("reports TeX it cannot read instead of a column of blanks", async ({ page }) => {
  await enter(page, { h: "\\oops{x}" })

  await expect(page.getByText("unexpected command: \\oops")).toBeVisible()
})

test("adds and removes formulas, renaming the lines below", async ({ page }) => {
  await enter(page, { f: "x", g: "x^2", h: "x^3" })
  await expect(row(page, 1)).toHaveText(["2", "2", "4", "8"])

  await page.getByRole("button", { name: "Add formula" }).click()
  await formula(page, "p").fill("x^4")
  await expect(row(page, 1)).toHaveText(["2", "2", "4", "8", "16"])

  /* Removing g renames h to g and p to h; the bodies stay as they were typed. */
  await page.getByRole("button", { name: "Remove g(x)", exact: true }).click()
  await expect(formula(page, "g")).toHaveValue("x^3")
  await expect(formula(page, "h")).toHaveValue("x^4")
  await expect(row(page, 1)).toHaveText(["2", "2", "8", "16"])
})

test("stops adding formulas once the names run out", async ({ page }) => {
  await page.goto(PAGE)
  const add = page.getByRole("button", { name: "Add formula" })

  /* However many lines the page opens with, the list ends at the same name. */
  for (let i = 0; i < 12 && (await add.isEnabled()); i++) await add.click()

  await expect(page.getByRole("textbox", { name: "w(x)", exact: true })).toBeVisible()
  await expect(page.getByRole("textbox")).toHaveCount(10)
  await expect(add).toBeDisabled()
})

test("walks the ten values from wherever the reader starts", async ({ page }) => {
  await enter(page, { f: "x^2" })
  await page.getByLabel("First value of x").fill("0")

  await expect(row(page, 0)).toHaveText(["0", "0"])
  await expect(row(page, 9)).toHaveText(["9", "81"])
  await expect(page.locator("table.values tbody tr")).toHaveCount(10)
})
