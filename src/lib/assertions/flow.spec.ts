import { describe, expect, it } from "vitest"
import { chart, obligationTex, obligations, parse } from "./flow"

const SKETCH = [
  "Algorithm X",
  "A1 [Start => X1]: Initial assertion",
  "X1: something",
  "A2 [X1 => X2]: something",
  "X2: If condition, terminate",
  "A3 [X2 => End]: Final assertion",
  "A4 [X2 => X3]: something",
  "X3: Go back to X1",
  "A5 [X3 => X1]: something",
].join("\n")

const edges = (source: string) =>
  parse(source).edges.map(({ from, to, condition }) =>
    condition ? `${from} ${condition.negated ? "¬" : ""}${condition.text} ${to}` : `${from} ${to}`,
  )

const proof = (source: string, step: string) => {
  const flow = parse(source)
  return obligations(flow, step).map(({ pre, condition, post }) => {
    const test = condition ? ` ∧ ${condition.negated ? "¬" : ""}${condition.text}` : ""
    return `${pre ?? "?"}${test} ⇒ ${post ?? "?"}`
  })
}

describe("parse", () => {
  it("reads steps and the assertions between them", () => {
    const flow = parse(SKETCH)
    expect(flow.errors).toEqual([])
    expect(flow.letter).toBe("X")
    expect(flow.steps.map((step) => step.id)).toEqual(["X1", "X2", "X3"])
    expect(flow.assertions.map(({ id, from, to }) => `${id} ${from} ${to}`)).toEqual([
      "A1 Start X1",
      "A2 X1 X2",
      "A3 X2 End",
      "A4 X2 X3",
      "A5 X3 X1",
    ])
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

  it("letters the algorithm X when it is not named", () => {
    expect(parse("X1. Go on.").letter).toBe("X")
  })

  it("takes the letter from the heading, as 1.1 writes it", () => {
    const flow = parse(
      [
        "Algorithm F (Factorial). Given a positive integer $n$.",
        "F1. [Initialize f.] Set $f \\gets n$.",
        "F2. [Is it 1?] If $n = 1$, the algorithm terminates; $f$ is the answer.",
        "F3. [Reduce.] Set $n \\gets n - 1$, $f \\gets f \\cdot n$, and go back to step F2.",
      ].join("\n"),
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

  it("ends a commaed condition at the first comma outside the maths", () => {
    const [, branch] = parse("X1. If $(a, b) = 0$, terminate.").edges
    expect(branch.condition).toEqual({ text: "$(a, b) = 0$", negated: false })
  })

  it("sends the other arm wherever otherwise says", () => {
    expect(edges("X1. If $a$, go to X3; otherwise go to X2.\nX2. Go on.\nX3. Terminate.")).toEqual([
      "Start X1",
      "X1 $a$ X3",
      "X1 ¬$a$ X2",
      "X2 X3",
      "X3 End",
    ])
  })

  it("does not branch on an If with nowhere to go", () => {
    expect(edges("X1. If $a < 0$, set $a \\gets -a$.\nX2. Terminate.")).toEqual([
      "Start X1",
      "X1 X2",
      "X2 End",
    ])
  })

  it("runs a line on into the step above it", () => {
    expect(parse("X1. Set $a \\gets 0$\nand terminate.").steps[0].body).toBe(
      "Set $a \\gets 0$ and terminate.",
    )
  })

  it("says what is wrong rather than guessing", () => {
    expect(
      parse(
        [
          "stray",
          "X1. Go to X7.",
          "X1. Again.",
          "Y2. Elsewhere.",
          "A1 [X1 => X9]: missing",
          "A2 [Start => End]: untaken",
          "A3. no arrow",
        ].join("\n"),
      ).errors,
    ).toEqual([
      "Line 1 is neither a step nor an assertion.",
      "A3 needs the arrow it sits on, as in [X1 => X2].",
      "X1 is written twice.",
      "Y2 is not a step of Algorithm X.",
      "X1 goes to X7, which is not a step.",
      "A1 names X9, which is not a step.",
      "A2 sits on Start ⇒ End, which no step takes.",
    ])
  })

  it("will not letter an algorithm A", () => {
    expect(parse("Algorithm A").errors).toEqual([
      "Algorithm A would share its labels with the assertions.",
    ])
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

  it("leaves a gap where an arrow carries no assertion", () => {
    expect(proof("A1 [Start => X1]: a\nX1. Terminate.", "X1")).toEqual(["A1 ⇒ ?"])
  })

  it("typesets prose in a condition as text and its maths as maths", () => {
    const [, otherwise] = obligations(parse(SKETCH.replace("condition", "$r = 0$")), "X2")
    expect(obligationTex(otherwise)).toBe("\\text{A2} \\land \\lnot(r = 0) \\Rightarrow \\text{A4}")
    const [taken] = obligations(parse(SKETCH), "X2")
    expect(obligationTex(taken)).toBe(
      "\\text{A2} \\land (\\text{condition}) \\Rightarrow \\text{A3}",
    )
  })
})

describe("chart", () => {
  const source = chart(parse(SKETCH))

  it("draws the algorithm and its assertions in subgraphs of their own", () => {
    expect(source).toContain('subgraph algorithm["Algorithm X"]')
    expect(source).toContain('subgraph assertions["Assertions"]')
  })

  it("draws Start and End as triangles, steps as boxes and assertions bare", () => {
    expect(source).toMatch(/Start@\{ shape: flip-tri/)
    expect(source).toMatch(/End@\{ shape: tri/)
    expect(source).toContain('X1["X1. something"]')
    expect(source).toContain("A1@{ shape: text, label: 'A1. Initial assertion' }")
  })

  it("dots a step to its postconditions and dashes a precondition to its step", () => {
    /* Five control-flow links come first, so the assertions' links are 5–14. */
    expect(source).toContain("X1 -.-> A2")
    expect(source).toContain("A2 --> X2")
    expect(source).toContain("linkStyle 5,7,9,11,13 stroke-dasharray:1 5")
    expect(source).toContain("linkStyle 6,8,10,12,14 stroke-dasharray:8 5")
  })

  it("doubles the reader's dollars and draws < with a command", () => {
    expect(chart(parse("A1 [Start => X1]: $0 < r$\nX1. Terminate."))).toContain(
      "label: 'A1. $$0 \\lt  r$$'",
    )
  })
})
