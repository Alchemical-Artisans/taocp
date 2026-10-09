import { describe, expect, it } from "vitest"
import { NAMES, SAMPLE_COUNT } from "./names"
import { tabulate, type Cell, type Entry } from "./tabulate"

/** The exact values of a formula's cells, for comparing against known sequences. */
function values(entry: Entry): string[] {
  if (entry.kind !== "formula") throw new Error(`expected a formula, got ${entry.kind}`)
  return entry.cells.map(exact)
}

function exact(cell: Cell): string {
  if (cell.kind !== "value") throw new Error(`expected a value, got ${cell.kind}`)
  return cell.latex
}

function formula(texts: string[], index = texts.length - 1): Entry {
  return tabulate(texts).entries[index]
}

describe("tabulate", () => {
  it("walks the first ten values of the variable by default", () => {
    const { inputs } = tabulate(["x"])
    expect(inputs).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(inputs).toHaveLength(SAMPLE_COUNT)
  })

  it("starts and stops where it is asked to", () => {
    expect(tabulate(["x"], { from: 0, count: 3 }).inputs).toEqual([0, 1, 2])
    expect(tabulate(["x"], { from: -2, count: 2 }).inputs).toEqual([-2, -1])
  })

  it("names each line by its position", () => {
    expect(tabulate(["x", "x^2", "x^3"]).entries.map((entry) => entry.name)).toEqual([
      "f",
      "g",
      "h",
    ])
  })

  it("keeps a blank line named and in place rather than reporting it as a mistake", () => {
    expect(tabulate(["", "   ", "x"]).entries).toMatchObject([
      { kind: "blank", name: "f" },
      { kind: "blank", name: "g" },
      { kind: "formula", name: "h" },
    ])
  })

  it("has no name to give a line past the end of the list, so drops it", () => {
    const texts = Array.from({ length: NAMES.length + 2 }, () => "x")
    expect(tabulate(texts).entries).toHaveLength(NAMES.length)
  })

  it.each([
    ["\\sum_{k=1}^{x} k", ["1", "3", "6", "10", "15", "21", "28", "36", "45", "55"]],
    ["\\frac{x(x+1)}{2}", ["1", "3", "6", "10", "15", "21", "28", "36", "45", "55"]],
    [
      "\\prod_{k=1}^{x} k",
      ["1", "2", "6", "24", "120", "720", "5040", "40320", "362880", "3628800"],
    ],
    ["2^x - 1", ["1", "3", "7", "15", "31", "63", "127", "255", "511", "1023"]],
    ["\\binom{x}{2}", ["0", "1", "3", "6", "10", "15", "21", "28", "36", "45"]],
    ["\\lfloor x/2 \\rfloor", ["0", "1", "1", "2", "2", "3", "3", "4", "4", "5"]],
    ["x!", ["1", "2", "6", "24", "120", "720", "5040", "40320", "362880", "3628800"]],
  ])("tabulates %s", (tex, expected) => {
    expect(values(formula([tex]))).toEqual(expected)
  })

  it("reads a body written over several lines", () => {
    const lines = ["\\begin{cases}", "  0 & x = 0 \\\\", "  2f(x-1) + 1 & x \\gt 0", "\\end{cases}"]
    expect(values(formula([lines.join("\n")]))).toEqual(values(formula([lines.join(" ")])))
  })

  it("tabulates a body that does not mention the variable", () => {
    expect(values(formula(["7"]))).toEqual(Array(10).fill("7"))
  })

  it("keeps values exact rather than rounding them, and shows the decimal too", () => {
    const entry = formula(["\\sum_{k=1}^{x} \\frac{1}{k}"])
    if (entry.kind !== "formula") throw new Error("expected a formula")
    expect(entry.cells[3]).toEqual({
      kind: "value",
      latex: "\\frac{25}{12}",
      approx: "2.083333333",
    })
  })

  it("leaves whole numbers without a redundant decimal", () => {
    const entry = formula(["x^2"])
    if (entry.kind !== "formula") throw new Error("expected a formula")
    expect(entry.cells[0]).toEqual({ kind: "value", latex: "1", approx: null })
  })
})

describe("lines calling each other", () => {
  it("lets a line call itself, which is how a recurrence is written", () => {
    const entry = formula(["\\begin{cases} 0 & x = 0 \\\\ 2f(x-1)+1 & x \\gt 0 \\end{cases}"])
    expect(values(entry)).toEqual(["1", "3", "7", "15", "31", "63", "127", "255", "511", "1023"])
  })

  it("lets a line call one above it", () => {
    expect(values(formula(["x^2", "f(x) + 1"], 1))).toEqual([
      "2",
      "5",
      "10",
      "17",
      "26",
      "37",
      "50",
      "65",
      "82",
      "101",
    ])
  })

  it("lets a line call one below it, since the names are a set and not a sequence", () => {
    expect(values(formula(["g(x) + 1", "x^2"], 0))).toEqual([
      "2",
      "5",
      "10",
      "17",
      "26",
      "37",
      "50",
      "65",
      "82",
      "101",
    ])
  })

  it("names a line that is blank when another one calls it", () => {
    const entry = formula(["g(x) + 1", ""], 0)
    if (entry.kind !== "formula") throw new Error("expected a formula")
    expect(entry.cells[0]).toEqual({ kind: "error", message: "g has no definition" })
  })
})

describe("bodies that cannot be tabulated", () => {
  it("reports an unreadable body with the offending TeX", () => {
    expect(formula(["\\oops{x}"])).toEqual({
      kind: "error",
      name: "f",
      tex: "\\oops{x}",
      message: "unexpected command: \\oops",
    })
  })

  it("reports a body that trails off", () => {
    const entry = formula(["x +"])
    if (entry.kind !== "error") throw new Error("expected an error")
    expect(entry.message).toContain("unexpected operator")
  })

  it.each(["f(x) = x^2", "f(x) := x^2", "x^2 = 4"])(
    "tells a reader who writes a left-hand side anyway: %s",
    (tex) => {
      expect(formula([tex])).toMatchObject({
        kind: "error",
        message: "this line is already f(x) = …, so leave that part out",
      })
    },
  )

  it("names an undefined symbol", () => {
    const entry = formula(["q + x"])
    if (entry.kind !== "formula") throw new Error("expected a formula")
    expect(entry.cells[0]).toEqual({ kind: "error", message: "q has no definition" })
  })

  it("leaves a cell empty where the formula simply has no value", () => {
    const { entries } = tabulate(["\\frac{1}{x}"], { from: 0, count: 2 })
    if (entries[0].kind !== "formula") throw new Error("expected a formula")
    expect(entries[0].cells[0]).toEqual({ kind: "none" })
    expect(entries[0].cells[1]).toEqual({ kind: "value", latex: "1", approx: null })
  })

  it("leaves a recurrence empty below its base case rather than inventing a value", () => {
    const { entries } = tabulate(
      ["\\begin{cases} 0 & x = 0 \\\\ 2f(x-1)+1 & x \\gt 0 \\end{cases}"],
      { from: -1, count: 2 },
    )
    if (entries[0].kind !== "formula") throw new Error("expected a formula")
    expect(entries[0].cells[0]).toEqual({ kind: "none" })
    expect(entries[0].cells[1]).toEqual({ kind: "value", latex: "0", approx: null })
  })

  it("says what is wrong with a recurrence that never reaches a base case", () => {
    const entry = formula(["f(x-1) + 1"])
    if (entry.kind !== "formula") throw new Error("expected a formula")
    expect(entry.cells).toEqual(
      Array.from({ length: 10 }, () => ({ kind: "error", message: "never reaches a base case" })),
    )
  })

  it("keeps a runaway definition out of the next table", () => {
    tabulate(["f(x-1) + 1"])
    expect(values(formula(["x"]))[0]).toBe("1")
  })
})
