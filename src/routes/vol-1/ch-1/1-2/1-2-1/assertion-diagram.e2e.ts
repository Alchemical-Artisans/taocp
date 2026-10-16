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

/* Exact, because "E1" otherwise also matches "Remove E1" and "A1 from". */
function field(page: Page, name: string) {
  return tool(page).getByRole("textbox", { name, exact: true })
}

/* The page opens on Knuth's Algorithm E, extended Euclid: E1 to E4, with E3
   branching on r = 0 and E4 going back to E2. The tests lean on that shape
   rather than on any wording, which is the author's to change. */
const STEPS = ["E1", "E2", "E3", "E4"]
const ASSERTIONS = ["A1", "A2", "A3", "A4", "A5", "A6"]

test("draws the opening algorithm with its assertions beside its steps", async ({ page }) => {
  await page.goto(PAGE)

  for (const id of ["Start", ...STEPS, "End"]) await expect(node(page, id)).toBeVisible()
  for (const id of ASSERTIONS) await expect(node(page, id)).toBeVisible()
  await expect(tool(page).locator("g.cluster")).toHaveCount(2)

  /* Side by side: every assertion is to the right of every step. */
  const stepsRight = Math.max(
    ...(await Promise.all(
      STEPS.map(async (id) => {
        const box = await node(page, id).boundingBox()
        return box!.x + box!.width
      }),
    )),
  )
  for (const id of ASSERTIONS) {
    expect((await node(page, id).boundingBox())!.x).toBeGreaterThan(stepsRight)
  }

  /* One dotted line out of each assertion's step, one dashed line into the next. */
  await expect(tool(page).locator("g.assertion-links path.dotted")).toHaveCount(6)
  await expect(tool(page).locator("g.assertion-links path.dashed")).toHaveCount(6)
  await expect(tool(page).locator("path.dotted[data-from='E1'][data-to='A2']")).toHaveCount(1)
  await expect(tool(page).locator("path.dashed[data-from='A2'][data-to='E2']")).toHaveCount(1)
})

test("keeps the line breaks a step was written with", async ({ page }) => {
  await page.goto(PAGE)

  /* In its box: E2 is written over two lines, so its label is two lines tall. */
  const start = (await node(page, "Start").locator("g.label").boundingBox())!
  const divide = (await node(page, "E2").locator("g.label").boundingBox())!
  expect(divide.height).toBeGreaterThan(1.8 * start.height)

  /* And in its input, which grows to show every line rather than scrolling. */
  const input = field(page, "E2")
  await expect(input).toHaveValue(/\n/)
  const fits = await input.evaluate((box) => box.scrollHeight <= box.clientHeight + 1)
  expect(fits).toBe(true)
  const lines = (await input.boundingBox())!.height
  const line = (await field(page, "E3").boundingBox())!.height
  expect(lines).toBeGreaterThan(1.5 * line)
})

test("shows each precondition against each postcondition on hover", async ({ page }) => {
  await page.goto(PAGE)

  await node(page, "E2").hover()
  await expect(proof(page)).toHaveText([
    "\\text{A2} \\Rightarrow \\text{A3}",
    "\\text{A6} \\Rightarrow \\text{A3}",
  ])
  /* The step and the assertions it is proved from and to are outlined. */
  await expect(tool(page).locator("g.node.lit")).toHaveCount(4)
})

test("puts a branch's test on one arm and its negation on the other", async ({ page }) => {
  await page.goto(PAGE)

  await node(page, "E3").hover()
  await expect(proof(page)).toHaveText([
    "\\text{A3} \\land (\\text{r = 0}) \\Rightarrow \\text{A4}",
    "\\text{A3} \\land \\lnot(\\text{r = 0}) \\Rightarrow \\text{A5}",
  ])
})

test("keeps a clicked step's proof up once the pointer leaves", async ({ page }) => {
  await page.goto(PAGE)

  await node(page, "E4").click()
  await page.mouse.move(0, 0)
  await expect(proof(page)).toHaveText(["\\text{A5} \\Rightarrow \\text{A6}"])

  await node(page, "E4").click()
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
  expect(names).toEqual(["A1", "E1.", "A2", "E2.", "A3", "E3.", "A4", "A5", "E4.", "A6"])
  await expect(arrow(page, "A4")).toHaveText("[E3 ⇒ End]")
  await expect(arrow(page, "A5")).toHaveText("[E3 ⇒ E4]")
  await expect(arrow(page, "A6")).toHaveText("[E4 ⇒ E2]")
  /* There is no adding or removing an assertion: there is one per arrow. */
  await expect(tool(page).getByRole("button", { name: /assertion/i })).toHaveCount(0)
  await expect(tool(page).getByRole("button", { name: /^Remove A/ })).toHaveCount(0)
})

test("renames the steps, and the steps they name, under a new letter", async ({ page }) => {
  await page.goto(PAGE)

  const said = await field(page, "A1").inputValue()
  await field(page, "Letter").fill("F")
  await expect(node(page, "F1")).toBeVisible()
  await expect(node(page, "E1")).toHaveCount(0)
  await expect(field(page, "F4")).toHaveValue(/Go back to F2/)
  await expect(arrow(page, "A1")).toHaveText("[Start ⇒ F1]")
  await expect(field(page, "A1")).toHaveValue(said)
  await expect(errors(page)).toHaveCount(0)
})

/* Typing a new letter means clearing the old one first. In between, the steps
   keep the old letter, so the new one still renames what refers to them. */
test("keeps the old letter while the box is cleared for a new one", async ({ page }) => {
  await page.goto(PAGE)

  const letter = field(page, "Letter")
  await letter.click()
  await letter.press("End")
  await letter.press("Backspace")
  await expect(letter).toHaveValue("")
  await expect(node(page, "E1")).toBeVisible()
  await expect(field(page, "E4")).toHaveValue(/Go back to E2/)

  await letter.pressSequentially("F")
  await expect(node(page, "F1")).toBeVisible()
  await expect(field(page, "F4")).toHaveValue(/Go back to F2/)
  await expect(errors(page)).toHaveCount(0)
})

test("refuses a letter the assertions already use", async ({ page }) => {
  await page.goto(PAGE)

  await field(page, "Letter").fill("A")
  await expect(errors(page)).toHaveText(["Algorithm A would share its labels with the assertions."])
  /* The diagram stays drawn under the letter it had. */
  await expect(node(page, "E1")).toBeVisible()
})

test("gives a new step's arrow an assertion of its own", async ({ page }) => {
  await page.goto(PAGE)

  await tool(page).getByRole("button", { name: "Add step" }).click()
  await field(page, "E5").fill("Terminate.")
  await expect(arrow(page, "A7")).toHaveText("[E5 ⇒ End]")
  await field(page, "A7").fill("done")

  await expect(node(page, "E5")).toBeVisible()
  await expect(node(page, "A7")).toBeVisible()
})

test("redraws the arrows, and their assertions, when a step is removed", async ({ page }) => {
  await page.goto(PAGE)

  await tool(page).getByRole("button", { name: "Remove E4" }).click()
  await expect(field(page, "E4")).toHaveCount(0)
  /* E3's other arm now falls through to End, a new arrow with nothing said on it. */
  await expect(arrow(page, "A5")).toHaveText("[E3 ⇒ End]")
  await expect(field(page, "A5")).toHaveValue("")
  await expect(field(page, "A6")).toHaveCount(0)
  await expect(errors(page)).toHaveCount(0)
})

test("says when a step goes to one that does not exist", async ({ page }) => {
  await page.goto(PAGE)

  await field(page, "E4").fill("Go back to E9")
  await expect(errors(page)).toHaveText(["E4 goes to E9, which is not a step."])
})

/* Mermaid draws its triangles as tall as they are wide with the label where
   they have narrowed; Start and End are redrawn about equilateral, with the
   label inside their wide end at the size every other label is. */
test("draws Start and End as triangles that fit their labels", async ({ page }) => {
  await page.goto(PAGE)

  for (const id of ["Start", "End"]) {
    const triangle = node(page, id).locator("polygon.terminal")
    await expect(triangle).toHaveCount(1)
    const shape = (await triangle.boundingBox())!
    expect(shape.height / shape.width).toBeCloseTo(Math.sqrt(3) / 2, 1)

    const label = (await node(page, id).locator("g.label").boundingBox())!
    expect(label.x).toBeGreaterThan(shape.x)
    expect(label.x + label.width).toBeLessThan(shape.x + shape.width)
    expect(label.y).toBeGreaterThanOrEqual(shape.y)
    expect(label.y + label.height).toBeLessThanOrEqual(shape.y + shape.height)

    const size = await node(page, id)
      .locator("g.label span")
      .first()
      .evaluate((span) => getComputedStyle(span).fontSize)
    const stepSize = await node(page, "A1")
      .locator("g.label span")
      .first()
      .evaluate((span) => getComputedStyle(span).fontSize)
    expect(size).toBe(stepSize)
  }
})
