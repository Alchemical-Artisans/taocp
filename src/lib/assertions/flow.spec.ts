import { describe, expect, it } from "vitest"
import { build, chart, letterError, links, obligationTex, obligations } from "./flow"

const steps = (...texts: string[]) => texts.map((text, key) => ({ key, text }))

const SKETCH = steps("something", "If condition, terminate", "Go back to X1")

const edges = (inputs: ReturnType<typeof steps>, letter = "X") =>
  build(letter, inputs).edges.map(({ from, to, condition }) =>
    condition ? `${from} ${condition.negated ? "¬" : ""}${condition.text} ${to}` : `${from} ${to}`,
  )

const proof = (inputs: ReturnType<typeof steps>, id: string) =>
  obligations(build("X", inputs), id).map(({ pre, condition, post }) => {
    const test = condition ? ` ∧ ${condition.negated ? "¬" : ""}${condition.text}` : ""
    return `${pre}${test} ⇒ ${post}`
  })

describe("build", () => {
  it("puts an assertion on every arrow, in reading order", () => {
    const flow = build("X", SKETCH)
    expect(flow.errors).toEqual([])
    expect(flow.steps.map((s) => s.id)).toEqual(["X1", "X2", "X3"])
    expect(flow.assertions.map(({ id, from, to }) => `${id} ${from} ${to}`)).toEqual([
      "A1 Start X1",
      "A2 X1 X2",
      "A3 X2 End",
      "A4 X2 X3",
      "A5 X3 X1",
    ])
  })

  it("keys each assertion by its steps' keys, so renumbering keeps what was said", () => {
    const said = { "start>0": "first", "0>end": "last" }
    expect(
      build("X", [{ key: 0, text: "Terminate." }], said).assertions.map((a) => a.text),
    ).toEqual(["first", "last"])
    /* A step added in front renumbers the old one X2, but its arrow out keeps its words. */
    const later = build(
      "X",
      [
        { key: 1, text: "Go on." },
        { key: 0, text: "Terminate." },
      ],
      said,
    )
    expect(later.assertions.map((a) => `${a.id} ${a.from} ${a.to} ${a.text}`)).toEqual([
      "A1 Start X1 ",
      "A2 X1 X2 ",
      "A3 X2 End last",
    ])
  })

  it("tells the two arms of a branch apart even when they meet", () => {
    const keys = build("X", steps("If $a$, go to X2.", "Terminate.")).assertions.map((a) => a.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("follows the steps: on by default, branching on If, back on a named step", () => {
    expect(edges(SKETCH)).toEqual([
      "Start X1",
      "X1 X2",
      "X2 condition End",
      "X2 ¬condition X3",
      "X3 X1",
    ])
  })

  it("letters the steps by the letter given, in either case", () => {
    const flow = build(
      "f",
      steps(
        "[Initialize f.] Set $f \\gets n$.",
        "[Is it 1?] If $n = 1$, the algorithm terminates; $f$ is the answer.",
        "[Reduce.] Set $n \\gets n - 1$, $f \\gets f \\cdot n$, and go back to step F2.",
      ),
    )
    expect(flow.errors).toEqual([])
    expect(flow.letter).toBe("F")
    expect(flow.steps[0]).toEqual({ id: "F1", title: "Initialize f.", body: "Set $f \\gets n$." })
    expect(flow.edges.map(({ from, to }) => `${from} ${to}`)).toEqual([
      "Start F1",
      "F1 F2",
      "F2 End",
      "F2 F3",
      "F3 F2",
    ])
  })

  it("ends a condition at the first comma outside the maths", () => {
    const [, branch] = build("X", steps("If $(a, b) = 0$, terminate.")).edges
    expect(branch.condition).toEqual({ text: "$(a, b) = 0$", negated: false })
  })

  it("sends the other arm wherever otherwise says", () => {
    expect(edges(steps("If $a$, go to X3; otherwise go to X2.", "Go on.", "Terminate."))).toEqual([
      "Start X1",
      "X1 $a$ X3",
      "X1 ¬$a$ X2",
      "X2 X3",
      "X3 End",
    ])
  })

  it("does not branch on an If with nowhere to go", () => {
    expect(edges(steps("If $a < 0$, set $a \\gets -a$.", "Terminate."))).toEqual([
      "Start X1",
      "X1 X2",
      "X2 End",
    ])
  })

  it("says when a step goes nowhere that exists", () => {
    expect(build("X", steps("Go to X7.")).errors).toEqual(["X1 goes to X7, which is not a step."])
  })

  it("letters the steps E unless told otherwise", () => {
    expect(build("E", steps("Terminate.")).steps[0].id).toBe("E1")
    expect(build("", steps("Terminate.")).letter).toBe("E")
  })

  it("keeps the last usable letter while the letter cannot be used", () => {
    const flow = build("", steps("Terminate."), {}, "F")
    expect(flow.letter).toBe("F")
    expect(flow.errors).toEqual(["The algorithm's letter must be a single letter."])
  })
})

describe("letterError", () => {
  it("takes one letter other than A", () => {
    expect(letterError("x")).toBeNull()
    expect(letterError("XY")).toBe("The algorithm's letter must be a single letter.")
    expect(letterError("3")).toBe("The algorithm's letter must be a single letter.")
    expect(letterError("a")).toBe("Algorithm A would share its labels with the assertions.")
  })
})

describe("obligations", () => {
  it("pairs every precondition with every postcondition", () => {
    expect(proof(SKETCH, "X1")).toEqual(["A1 ⇒ A2", "A5 ⇒ A2"])
    expect(proof(SKETCH, "X3")).toEqual(["A4 ⇒ A5"])
  })

  it("adds the test to one arm and its negation to the other", () => {
    expect(proof(SKETCH, "X2")).toEqual(["A2 ∧ condition ⇒ A3", "A2 ∧ ¬condition ⇒ A4"])
  })

  it("typesets prose in a condition as text and its maths as maths", () => {
    const [, otherwise] = obligations(
      build("X", steps("something", "If $r = 0$, terminate", "Go back to X1")),
      "X2",
    )
    expect(obligationTex(otherwise)).toBe("\\text{A2} \\land \\lnot(r = 0) \\Rightarrow \\text{A4}")
    const [taken] = obligations(build("X", SKETCH), "X2")
    expect(obligationTex(taken)).toBe(
      "\\text{A2} \\land (\\text{condition}) \\Rightarrow \\text{A3}",
    )
  })
})

describe("chart", () => {
  const source = chart(build("X", SKETCH, { "start>0": "Initial assertion" }))

  it("sets the subgraphs side by side, each reading downwards", () => {
    expect(source).toContain("flowchart LR")
    expect(source).toContain('subgraph algorithm["Algorithm X"]\n    direction TB')
    expect(source).toContain('subgraph assertions["Assertions"]\n    direction TB')
    expect(source).toContain("algorithm ~~~ assertions")
  })

  it("draws Start and End as small triangles, steps as boxes and assertions bare", () => {
    expect(source).toMatch(/Start@\{ shape: flip-tri/)
    expect(source).toMatch(/End@\{ shape: tri/)
    expect(source).toContain("minNodeWidth: 0")
    expect(source).toContain("forceLegacyMathML: true")
    expect(source).toContain('X1["X1. something"]')
    expect(source).toContain('A1["A1. Initial assertion"]:::bare')
    /* Nothing said yet: the assertion is still drawn, by its name alone. */
    expect(source).toContain('A2["A2"]:::bare')
  })

  /* A node linked out of its subgraph makes Mermaid drop the subgraph's
     direction, so the lines between the two are left to be drawn over it. */
  it("links nothing across the subgraphs", () => {
    expect(source).not.toMatch(/X\d+ -\.?-?> A\d+|A\d+ -\.?-?> X\d+/)
  })

  it("sets a label with maths in it as one expression, its prose as text", () => {
    expect(chart(build("X", steps("Terminate."), { "start>0": "$0 < r$" }))).toContain(
      'A1["$$\\text{A1. }0 \\lt  r$$"]:::bare',
    )
  })

  it("keeps the reader's line breaks, as rows of an array where there is maths", () => {
    const source = chart(build("X", steps("$q \\gets c$\nthen $r \\gets d$", "Go on\nand stop.")))
    expect(source).toContain(
      'X1["$$\\begin{array}{c} \\text{X1. }q \\gets c \\cr \\text{then }r \\gets d \\end{array}$$"]',
    )
    expect(source).toContain('X2["X2. Go on<br>and stop."]')
  })

  it("names a step from a bracketed title even when its body runs over lines", () => {
    expect(build("X", steps("[Divide.] Let $q$\nbe the quotient.")).steps[0]).toEqual({
      id: "X1",
      title: "Divide.",
      body: "Let $q$\nbe the quotient.",
    })
  })
})

describe("links", () => {
  it("dots a step to its postconditions and dashes a precondition to its step", () => {
    expect(links(build("X", SKETCH)).slice(0, 4)).toEqual([
      { from: "Start", to: "A1", style: "dotted" },
      { from: "A1", to: "X1", style: "dashed" },
      { from: "X1", to: "A2", style: "dotted" },
      { from: "A2", to: "X2", style: "dashed" },
    ])
  })
})
