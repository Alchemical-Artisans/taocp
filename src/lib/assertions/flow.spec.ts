import { describe, expect, it } from "vitest"
import {
  build,
  chart,
  letterError,
  links,
  obligationTex,
  obligations,
  type Endpoint,
  type Row,
} from "./flow"

const step = (text: string): Row => ({ kind: "step", text })
const assertion = (from: Endpoint, to: Endpoint, text = ""): Row => ({
  kind: "assertion",
  from,
  to,
  text,
})

const SKETCH: Row[] = [
  assertion("start", 1, "Initial assertion"),
  step("something"),
  assertion(1, 2, "something"),
  step("If condition, terminate"),
  assertion(2, "end", "Final assertion"),
  assertion(2, 3, "something"),
  step("Go back to X1"),
  assertion(3, 1, "something"),
]

const edges = (rows: Row[], letter = "X") =>
  build(letter, rows).edges.map(({ from, to, condition }) =>
    condition ? `${from} ${condition.negated ? "¬" : ""}${condition.text} ${to}` : `${from} ${to}`,
  )

const proof = (rows: Row[], id: string) =>
  obligations(build("X", rows), id).map(({ pre, condition, post }) => {
    const test = condition ? ` ∧ ${condition.negated ? "¬" : ""}${condition.text}` : ""
    return `${pre ?? "?"}${test} ⇒ ${post ?? "?"}`
  })

describe("build", () => {
  it("numbers steps and assertions apart, in the order they are written", () => {
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
      [
        "[Initialize f.] Set $f \\gets n$.",
        "[Is it 1?] If $n = 1$, the algorithm terminates; $f$ is the answer.",
        "[Reduce.] Set $n \\gets n - 1$, $f \\gets f \\cdot n$, and go back to step F2.",
      ].map(step),
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
    const [, branch] = build("X", [step("If $(a, b) = 0$, terminate.")]).edges
    expect(branch.condition).toEqual({ text: "$(a, b) = 0$", negated: false })
  })

  it("sends the other arm wherever otherwise says", () => {
    expect(
      edges([step("If $a$, go to X3; otherwise go to X2."), step("Go on."), step("Terminate.")]),
    ).toEqual(["Start X1", "X1 $a$ X3", "X1 ¬$a$ X2", "X2 X3", "X3 End"])
  })

  it("does not branch on an If with nowhere to go", () => {
    expect(edges([step("If $a < 0$, set $a \\gets -a$."), step("Terminate.")])).toEqual([
      "Start X1",
      "X1 X2",
      "X2 End",
    ])
  })

  it("says what is wrong rather than guessing", () => {
    expect(
      build("X", [
        step("Go to X7."),
        assertion(1, 9, "missing"),
        assertion("start", "end", "untaken"),
        assertion("end", 1, "backwards"),
      ]).errors,
    ).toEqual([
      "X1 goes to X7, which is not a step.",
      "A1 names X9, which is not a step.",
      "A2 sits on Start ⇒ End, which no step takes.",
      "A3 runs backwards: arrows leave Start and enter End.",
    ])
  })

  it("falls back to X while the letter cannot be used", () => {
    const flow = build("", [step("Terminate.")])
    expect(flow.letter).toBe("X")
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

  it("leaves a gap where an arrow carries no assertion", () => {
    expect(proof([assertion("start", 1, "a"), step("Terminate.")], "X1")).toEqual(["A1 ⇒ ?"])
  })

  it("typesets prose in a condition as text and its maths as maths", () => {
    const rows = SKETCH.map((row) =>
      row.kind === "step" ? { ...row, text: row.text.replace("condition", "$r = 0$") } : row,
    )
    const [, otherwise] = obligations(build("X", rows), "X2")
    expect(obligationTex(otherwise)).toBe("\\text{A2} \\land \\lnot(r = 0) \\Rightarrow \\text{A4}")
    const [taken] = obligations(build("X", SKETCH), "X2")
    expect(obligationTex(taken)).toBe(
      "\\text{A2} \\land (\\text{condition}) \\Rightarrow \\text{A3}",
    )
  })
})

describe("chart", () => {
  const source = chart(build("X", SKETCH))

  it("sets the subgraphs side by side, each reading downwards", () => {
    expect(source.split("\n")[0]).toBe("flowchart LR")
    expect(source).toContain('subgraph algorithm["Algorithm X"]\n    direction TB')
    expect(source).toContain('subgraph assertions["Assertions"]\n    direction TB')
    expect(source).toContain("algorithm ~~~ assertions")
  })

  it("draws Start and End as triangles, steps as boxes and assertions bare", () => {
    expect(source).toMatch(/Start@\{ shape: flip-tri/)
    expect(source).toMatch(/End@\{ shape: tri/)
    expect(source).toContain('X1["X1. something"]')
    expect(source).toContain("A1@{ shape: text, label: 'A1. Initial assertion' }")
  })

  /* A node linked out of its subgraph makes Mermaid drop the subgraph's
     direction, so the lines between the two are left to be drawn over it. */
  it("links nothing across the subgraphs", () => {
    expect(source).not.toMatch(/X\d+ -\.?-?> A\d+|A\d+ -\.?-?> X\d+/)
  })

  it("doubles the reader's dollars and draws < with a command", () => {
    expect(chart(build("X", [assertion("start", 1, "$0 < r$"), step("Terminate.")]))).toContain(
      "label: 'A1. $$0 \\lt  r$$'",
    )
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

  it("leaves out an end that names no step", () => {
    expect(links(build("X", [step("Terminate."), assertion(1, 4)]))).toEqual([
      { from: "X1", to: "A1", style: "dotted" },
    ])
  })
})
