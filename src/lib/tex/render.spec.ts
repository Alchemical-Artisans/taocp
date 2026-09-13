import { describe, it, expect } from "vitest"
import { renderTex, TexError } from "./render.ts"

describe("renderTex", () => {
  it("produces a self-contained svg", () => {
    const svg = renderTex("n")
    expect(svg).toMatch(/^<mjx-container[^>]*>[\s\S]*<svg[\s\S]*<\/mjx-container>$/)
  })

  it("marks display math", () => {
    expect(renderTex("n", { display: true })).toContain('display="true"')
  })

  it("leaves inline math undisplayed", () => {
    expect(renderTex("n")).not.toContain('display="true"')
  })

  it("renders an ams environment", () => {
    expect(
      renderTex("\\begin{align} a &= b \\\\ c &= d \\end{align}", { display: true }),
    ).toContain("<svg")
  })

  it("renders a bussproofs derivation", () => {
    const tex = "\\begin{prooftree}\\AxiomC{a}\\UnaryInfC{b}\\end{prooftree}"
    expect(renderTex(tex, { display: true })).toContain("<svg")
  })

  it("renders a mathtools construct", () => {
    expect(renderTex("\\mathclap{a}")).toContain("<svg")
  })

  it("accepts a user macro defined inline", () => {
    expect(renderTex("\\newcommand{\\half}{\\frac{1}{2}}\\half")).toContain("<svg")
  })

  it("accepts a macro from the shared preamble", () => {
    expect(renderTex("a \\divides b")).toContain("<svg")
  })

  it("draws the tombstone in the current text colour", () => {
    // MathJax renders a bare \rule as a fixed black box, which vanishes on a
    // dark background; the macro pins it to currentColor.
    const rule = renderTex("\\tombstone").match(/<rect[^>]*data-bgcolor[^>]*>/)?.[0]
    expect(rule).toContain('fill="currentColor"')
  })

  it("rejects an undefined control sequence", () => {
    expect(() => renderTex("\\notAMacro")).toThrow(TexError)
  })

  it("names the offending expression when it fails", () => {
    expect(() => renderTex("\\frac{1")).toThrow(/\\frac\{1/)
  })

  it("gives each expression its own glyph ids", () => {
    const ids = (svg: string) => [...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1])
    const overlap = ids(renderTex("x")).filter((id) => ids(renderTex("y")).includes(id))
    expect(overlap).toEqual([])
  })
})

describe("inline layout", () => {
  const svgCount = (html: string) => html.match(/<svg/g)?.length ?? 0

  it("keeps a relation in a single svg", () => {
    // MathJax 4 would otherwise split at the relation to allow wrapping, which
    // drops the space before it.
    expect(svgCount(renderTex("n = 1"))).toBe(1)
  })

  it("keeps a long expression in a single svg", () => {
    expect(svgCount(renderTex("a = b + c + d + e + f + g + h + i + j + k"))).toBe(1)
  })

  it("emits no break elements", () => {
    expect(renderTex("f \\leftarrow n")).not.toContain("mjx-break")
  })
})
