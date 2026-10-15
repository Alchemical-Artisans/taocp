import { expect, test, type Page } from "@playwright/test"

/* The assertion diagram: an algorithm entered a step or assertion at a time,
   drawn as a flowchart that shows what proving a step takes. */

const PAGE = "/vol-1/ch-1/1-2/1-2-1"

function tool(page: Page) {
  return page.locator("#diagramming ~ .tool")
}

function node(page: Page, id: string) {
  return tool(page).locator(`g.node[id*='-flowchart-${id}-']`)
}

/* Typeset, so the TeX KaTeX keeps beside its output is read rather than the glyphs. */
function proof(page: Page) {
  return tool(page).locator(".obligations .katex-mathml annotation")
}

function errors(page: Page) {
  return tool(page).locator(".errors li")
}

/* Exact, because "X1" otherwise also matches "Remove X1" and "A1 from". */
function field(page: Page, name: string) {
  return tool(page).getByRole("textbox", { name, exact: true })
}

test("draws the opening algorithm with its assertions beside its steps", async ({ page }) => {
  await page.goto(PAGE)

  for (const id of ["Start", "X1", "X2", "X3", "End"]) await expect(node(page, id)).toBeVisible()
  for (const id of ["A1", "A2", "A3", "A4", "A5"]) await expect(node(page, id)).toBeVisible()
  await expect(tool(page).locator("g.cluster")).toHaveCount(2)

  /* Side by side: every assertion is to the right of every step. */
  const stepsRight = Math.max(
    ...(await Promise.all(
      ["X1", "X2", "X3"].map(async (id) => {
        const box = await node(page, id).boundingBox()
        return box!.x + box!.width
      }),
    )),
  )
  for (const id of ["A1", "A2", "A3", "A4", "A5"]) {
    expect((await node(page, id).boundingBox())!.x).toBeGreaterThan(stepsRight)
  }

  /* One dotted line out of each assertion's step, one dashed line into the next. */
  await expect(tool(page).locator("g.assertion-links path.dotted")).toHaveCount(5)
  await expect(tool(page).locator("g.assertion-links path.dashed")).toHaveCount(5)
  await expect(tool(page).locator("path.dotted[data-from='X1'][data-to='A2']")).toHaveCount(1)
  await expect(tool(page).locator("path.dashed[data-from='A2'][data-to='X2']")).toHaveCount(1)
})

test("shows each precondition against each postcondition on hover", async ({ page }) => {
  await page.goto(PAGE)

  await node(page, "X1").hover()
  await expect(proof(page)).toHaveText([
    "\\text{A1} \\Rightarrow \\text{A2}",
    "\\text{A5} \\Rightarrow \\text{A2}",
  ])
  /* The step and the assertions it is proved from and to are outlined. */
  await expect(tool(page).locator("g.node.lit")).toHaveCount(4)
})

test("puts a branch's test on one arm and its negation on the other", async ({ page }) => {
  await page.goto(PAGE)

  await node(page, "X2").hover()
  await expect(proof(page)).toHaveText([
    "\\text{A2} \\land (\\text{condition}) \\Rightarrow \\text{A3}",
    "\\text{A2} \\land \\lnot(\\text{condition}) \\Rightarrow \\text{A4}",
  ])
})

test("keeps a clicked step's proof up once the pointer leaves", async ({ page }) => {
  await page.goto(PAGE)

  await node(page, "X3").click()
  await page.mouse.move(0, 0)
  await expect(proof(page)).toHaveText(["\\text{A4} \\Rightarrow \\text{A5}"])

  await node(page, "X3").click()
  await page.mouse.move(0, 0)
  await expect(proof(page)).toHaveCount(0)
})

/* An assertion row names its arrow in brackets after its label. */
function arrow(page: Page, name: string) {
  return field(page, name).locator("xpath=preceding-sibling::span[contains(@class, 'arrow')]")
}

test("puts an assertion row on every arrow, under the step it leaves", async ({ page }) => {
  await page.goto(PAGE)

  const names = await tool(page)
    .locator(".rows li .name")
    .evaluateAll((spans) => spans.map((span) => span.textContent))
  expect(names).toEqual(["A1", "X1.", "A2", "X2.", "A3", "A4", "X3.", "A5"])
  await expect(arrow(page, "A3")).toHaveText("[X2 ⇒ End]")
  await expect(arrow(page, "A4")).toHaveText("[X2 ⇒ X3]")
  /* There is no adding or removing an assertion: there is one per arrow. */
  await expect(tool(page).getByRole("button", { name: /assertion/i })).toHaveCount(0)
  await expect(tool(page).getByRole("button", { name: /^Remove A/ })).toHaveCount(0)
})

test("renames the steps, and the steps they name, under a new letter", async ({ page }) => {
  await page.goto(PAGE)

  await field(page, "Letter").fill("F")
  await expect(node(page, "F1")).toBeVisible()
  await expect(node(page, "X1")).toHaveCount(0)
  await expect(field(page, "F3")).toHaveValue("Go back to F1")
  await expect(arrow(page, "A1")).toHaveText("[Start ⇒ F1]")
  await expect(field(page, "A1")).toHaveValue("Initial assertion")
  await expect(errors(page)).toHaveCount(0)
})

test("refuses a letter the assertions already use", async ({ page }) => {
  await page.goto(PAGE)

  await field(page, "Letter").fill("A")
  await expect(errors(page)).toHaveText(["Algorithm A would share its labels with the assertions."])
  /* The diagram stays drawn under the letter it had. */
  await expect(node(page, "X1")).toBeVisible()
})

test("gives a new step's arrow an assertion of its own", async ({ page }) => {
  await page.goto(PAGE)

  await tool(page).getByRole("button", { name: "Add step" }).click()
  await field(page, "X4").fill("Terminate.")
  await expect(arrow(page, "A6")).toHaveText("[X4 ⇒ End]")
  await field(page, "A6").fill("done")

  await expect(node(page, "X4")).toBeVisible()
  await expect(node(page, "A6")).toBeVisible()
})

test("redraws the arrows, and their assertions, when a step is removed", async ({ page }) => {
  await page.goto(PAGE)

  await tool(page).getByRole("button", { name: "Remove X3" }).click()
  await expect(field(page, "X3")).toHaveCount(0)
  /* X2's other arm now falls through to End, a new arrow with nothing said on it. */
  await expect(arrow(page, "A4")).toHaveText("[X2 ⇒ End]")
  await expect(field(page, "A4")).toHaveValue("")
  await expect(field(page, "A5")).toHaveCount(0)
  await expect(errors(page)).toHaveCount(0)
})

test("says when a step goes to one that does not exist", async ({ page }) => {
  await page.goto(PAGE)

  await field(page, "X3").fill("Go back to X9")
  await expect(errors(page)).toHaveText(["X3 goes to X9, which is not a step."])
})
