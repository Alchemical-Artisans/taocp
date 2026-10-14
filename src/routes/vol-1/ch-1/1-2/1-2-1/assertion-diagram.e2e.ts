import { expect, test, type Page } from "@playwright/test"

/* The assertion diagram: an algorithm typed with its assertions between the
   steps, drawn as a flowchart that shows what proving a step takes. */

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

test("draws the opening algorithm with its assertions apart from its steps", async ({ page }) => {
  await page.goto(PAGE)

  for (const id of ["Start", "X1", "X2", "X3", "End"]) await expect(node(page, id)).toBeVisible()
  for (const id of ["A1", "A2", "A3", "A4", "A5"]) await expect(node(page, id)).toBeVisible()
  await expect(tool(page).locator("g.cluster")).toHaveCount(2)
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

test("redraws under the reader's own letter", async ({ page }) => {
  await page.goto(PAGE)

  await tool(page)
    .getByLabel("Algorithm")
    .fill("Algorithm F\nA1 [Start => F1]: $n > 0$\nF1. [Is it 1?] If $n = 1$, terminate.")
  await expect(node(page, "F1")).toBeVisible()
  await expect(node(page, "X1")).toHaveCount(0)
  await expect(tool(page).locator(".errors")).toHaveCount(0)
})

test("lists what it cannot make sense of", async ({ page }) => {
  await page.goto(PAGE)

  await tool(page).getByLabel("Algorithm").fill("Algorithm X\nX1. Go to X4.\nA1 [X1 => X2]: lost")
  await expect(tool(page).locator(".errors li")).toHaveText([
    "X1 goes to X4, which is not a step.",
    "A1 names X2, which is not a step.",
  ])
})
