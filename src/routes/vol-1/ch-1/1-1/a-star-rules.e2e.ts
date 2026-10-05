import { expect, test, type Page } from "@playwright/test"

/* The rule table's CSV export, import and share link are the parts of the A*
   tool that only exist in a browser: a Blob download, a file read and a query
   string. The CSV itself is covered by $lib/algorithms/a-star/csv.spec.ts. */

const PAGE = "/vol-1/ch-1/1-1"

const KNUTHS_CSV = ["theta,phi,b,a", "ab,bac,0,1", "ba,a,2,3", "ac,ca,2,0", "a,,3,4", ""].join("\n")

function rules(page: Page) {
  return page.locator("table.rules tbody tr")
}

async function ruleAt(page: Page, j: number) {
  const row = rules(page).nth(j)
  return Promise.all(
    ["theta", "phi", "b", "a"].map((column) =>
      row.getByLabel(`${column} sub ${j}`, { exact: true }).inputValue(),
    ),
  )
}

test("exports the rule table as CSV", async ({ page }) => {
  await page.goto(PAGE)

  const downloaded = page.waitForEvent("download")
  await page.getByRole("button", { name: "Export CSV" }).click()
  const download = await downloaded

  expect(download.suggestedFilename()).toBe("a-star-rules.csv")
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  expect(Buffer.concat(chunks).toString()).toBe(KNUTHS_CSV)
})

test("imports a rule table from a CSV file", async ({ page }) => {
  await page.goto(PAGE)

  await page.locator("input[type=file]").setInputFiles({
    name: "my-rules.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("theta,phi,b,a\nxy,z,1,0\n"),
  })

  await expect(rules(page)).toHaveCount(1)
  expect(await ruleAt(page, 0)).toEqual(["xy", "z", "1", "0"])
  await expect(page.getByText("Loaded 1 rule from my-rules.csv.")).toBeVisible()
})

test("says which row of a CSV file it could not read", async ({ page }) => {
  await page.goto(PAGE)

  await page.locator("input[type=file]").setInputFiles({
    name: "broken.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("theta,phi,b,a\nab,bac,0,1\nba,a,2,oops\n"),
  })

  await expect(page.getByText("Row 1: a must be a whole number")).toBeVisible()
  /* The rules the reader had are left alone when the file cannot be read. */
  await expect(rules(page)).toHaveCount(4)
})

test("shares the edited rules through a link", async ({ page, context }) => {
  await page.goto(PAGE)

  await page.getByLabel("theta sub 0", { exact: true }).fill("qq")
  await page.getByRole("button", { name: "Remove rule 3" }).click()
  await page.getByRole("button", { name: "Copy share link" }).click()

  const link = await page.getByLabel("Share link").inputValue()
  expect(new URL(link).searchParams.get("rules")).toBe(
    ["theta,phi,b,a", "qq,bac,0,1", "ba,a,2,3", "ac,ca,2,0", ""].join("\n"),
  )

  const shared = await context.newPage()
  await shared.goto(link)
  await expect(rules(shared)).toHaveCount(3)
  expect(await ruleAt(shared, 0)).toEqual(["qq", "bac", "0", "1"])
})

test("reports a share link whose rules cannot be read", async ({ page }) => {
  await page.goto(`${PAGE}?rules=${encodeURIComponent("theta,phi,b,a\nab,bac,0,nope\n")}`)

  await expect(page.getByText("The rules in this link could not be read.")).toBeVisible()
  await expect(rules(page)).toHaveCount(4)
})
