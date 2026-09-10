import { describe, it, expect } from "vitest"
import { tex } from "./preprocess.ts"

const preprocessor = tex()

function run(source: string, filename = "Page.svelte") {
  return preprocessor.markup?.({ content: source, filename }) as
    { code: string; map: unknown } | undefined
}

describe("tex preprocessor", () => {
  it("replaces inline math with svg", () => {
    const output = run("<p>the integer $n$ is positive</p>")
    expect(output?.code).toMatch(
      /<p>the integer <mjx-container[\s\S]*<\/mjx-container> is positive<\/p>/,
    )
  })

  it("leaves markup without math untouched", () => {
    expect(run("<p>nothing here</p>")).toBeUndefined()
  })

  it("ships no raw delimiters to the page", () => {
    expect(run("<p>$n$ and $$m$$</p>")?.code).not.toContain("$")
  })

  it("escapes braces so svelte cannot read the output as an expression", () => {
    expect(run("<p>$\\frac{n}{2}$</p>")?.code).not.toMatch(/[{}]/)
  })

  it("emits a source map", () => {
    expect(run("<p>$n$</p>")?.map).toBeTruthy()
  })

  it("preserves surrounding markup", () => {
    expect(run('<a href="/x">$n$</a>')?.code).toContain('<a href="/x">')
  })

  it("reports the file and line of a bad expression", () => {
    expect(() => run("<p>ok</p>\n<p>$\\notAMacro$</p>", "src/routes/+page.svelte")).toThrow(
      /src\/routes\/\+page\.svelte:2:4/,
    )
  })

  it("names the undefined control sequence", () => {
    expect(() => run("<p>$\\notAMacro$</p>")).toThrow(/Undefined control sequence/)
  })
})
