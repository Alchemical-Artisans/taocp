import { ComputeEngine, type BoxedExpression } from "@cortex-js/compute-engine"
import { NAMES, SAMPLE_COUNT, VARIABLE } from "./names"

export type Cell =
  /** A finite real value: `latex` is exact, `approx` a decimal when that differs. */
  | { kind: "value"; latex: string; approx: string | null }
  /** The formula has no value here — a recurrence below its base case, a division by zero. */
  | { kind: "none" }
  /** Evaluation got stuck or blew up at this value of the variable. */
  | { kind: "error"; message: string }

interface Named {
  /** The name this line was given by its position: `f`, `g`, `h`, and so on. */
  name: string
  /** The TeX given for the body, trimmed. */
  tex: string
}

export type Entry =
  /** Nothing typed yet. Named all the same, so the lines keep their identity. */
  | (Named & { kind: "blank" })
  /** A formula, tabulated over the variable. */
  | (Named & { kind: "formula"; cells: Cell[] })
  /** The body could not be read, or could not be made into a definition. */
  | (Named & { kind: "error"; message: string })

/** An entry that produced a column of values. */
export type FormulaEntry = Extract<Entry, { kind: "formula" }>

/** The signature of {@link tabulate}, for callers that import it on demand. */
export type Tabulate = (texts: string[], options?: TabulateOptions) => Tabulation

export interface Tabulation {
  /** The values of the variable the table walks, in order. */
  inputs: number[]
  /** One per TeX string given, in the same order, so the two can be shown together. */
  entries: Entry[]
}

export interface TabulateOptions {
  /** First value of the variable. Defaults to 1. */
  from?: number
  /** How many values to take. Defaults to {@link SAMPLE_COUNT}. */
  count?: number
}

/**
 * Evaluate TeX formula bodies over the first few values of {@link VARIABLE}.
 *
 * Each body given becomes the definition of a function named by its position —
 * `f`, `g`, `h` — so the reader writes `2f(x-1) + 1` and never an assignment.
 * That is also how a recurrence refers to itself, and how one line refers to
 * another.
 *
 * Every body is defined before any is evaluated, so the lines can call each
 * other in either direction: the names are a set, not a sequence. A body past
 * the end of {@link NAMES} has no name to be given and is dropped.
 *
 * A fresh engine per call keeps a runaway definition from one table out of the
 * next, since a recurrence with no base case recurses until something stops it.
 */
export function tabulate(texts: string[], options: TabulateOptions = {}): Tabulation {
  const { from = 1, count = SAMPLE_COUNT } = options
  const inputs = Array.from({ length: count }, (_, i) => from + i)
  const engine = new ComputeEngine()
  // Values are read against each other down a column, so a numeral should look
  // like one: the engine otherwise groups digits with thin spaces.
  engine.latexOptions = { digitGroupSeparator: "" }

  const defined = texts
    .slice(0, NAMES.length)
    .map((text, index) => define(engine, NAMES[index], text.trim()))

  return { inputs, entries: defined.map((line) => tabulateLine(engine, line, inputs)) }
}

/** A line that has been defined, or the reason it could not be. */
type Line = Entry | (Named & { kind: "defined" })

function define(engine: ComputeEngine, name: string, tex: string): Line {
  if (!tex) return { kind: "blank", name, tex }

  let body: BoxedExpression
  try {
    body = engine.parse(tex)
  } catch (error) {
    return { kind: "error", name, tex, message: describe(error) }
  }
  if (!body.isValid) return { kind: "error", name, tex, message: describeParse(body) }

  const json = body.json
  // The line already carries its own left-hand side, so a reader who writes one
  // anyway gets told that rather than a column of blanks.
  if (Array.isArray(json) && (json[0] === "Equal" || json[0] === "Assign")) {
    return {
      kind: "error",
      name,
      tex,
      message: `this line is already ${name}(${VARIABLE}) = …, so leave that part out`,
    }
  }

  try {
    engine.box(["Assign", name, ["Function", json, VARIABLE]]).evaluate()
  } catch (error) {
    return { kind: "error", name, tex, message: describe(error) }
  }

  return { kind: "defined", name, tex }
}

function tabulateLine(engine: ComputeEngine, line: Line, inputs: number[]): Entry {
  if (line.kind !== "defined") return line

  const { name, tex } = line
  return {
    kind: "formula",
    name,
    tex,
    cells: inputs.map((input) => evaluateAt(engine, name, input)),
  }
}

function evaluateAt(engine: ComputeEngine, name: string, input: number): Cell {
  let value: BoxedExpression
  try {
    value = engine.box([name, input]).evaluate()
  } catch (error) {
    return { kind: "error", message: describe(error) }
  }

  const approximation = value.N()
  if (approximation.im !== 0 || !Number.isFinite(approximation.re ?? NaN)) {
    const stuck = undefinedNames(engine, value)
    if (stuck.length) {
      return { kind: "error", message: `${stuck.join(", ")} has no definition` }
    }
    return { kind: "none" }
  }

  const exact = value.latex
  const re = approximation.re as number
  // Exactness is worth a wide cell but not an unbounded one: past a column's
  // width a 3000-digit power says less than its magnitude does.
  return exact.length <= 48
    ? { kind: "value", latex: exact, approx: value.isInteger ? null : formatApprox(re) }
    : { kind: "value", latex: formatApprox(re), approx: null }
}

/**
 * Names left in a result the engine could not reduce. A formula calling a line
 * that is blank or broken evaluates to `g(3)` rather than failing, so the stuck
 * names are what turn that into a message the reader can act on.
 *
 * Parsing a formula declares the names in it, so being declared says nothing.
 * What separates a name with nothing behind it from `\pi` or from a defined
 * line is that the engine still calls it a plain variable.
 */
function undefinedNames(engine: ComputeEngine, value: BoxedExpression): string[] {
  const names = new Set<string>()

  const walk = (json: unknown) => {
    if (typeof json === "string") {
      if (isName(json)) names.add(json)
      return
    }
    if (!Array.isArray(json)) return
    const [head, ...operands] = json
    if (typeof head === "string" && isName(head)) names.add(head)
    operands.forEach(walk)
  }
  walk(value.json)

  return [...names].filter((name) => {
    if (name === VARIABLE) return false
    const info = engine.symbolInfo(name)
    // `Missing` is the engine's own marker for a result it has no value for —
    // an unmatched case arm — which is an empty cell, not a missing definition.
    return info?.kind === "variable" && String(info.type) !== "missing"
  })
}

/** MathJSON writes string literals in single quotes, so a bare word is a name. */
function isName(json: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(json)
}

/**
 * An error arrives as `Error(code, LatexString(offending))` — a code the reader
 * has never seen plus the TeX that caused it, of which the TeX is the useful
 * half and the code is worth spelling out as words.
 */
function describeParse(expression: BoxedExpression): string {
  const problems = (expression.errors ?? []).map((error) => {
    const json = error.json
    if (!Array.isArray(json)) return "could not be read"

    const code = asString(json[1])?.replace(/-/g, " ") ?? "could not be read"
    const source = Array.isArray(json[2]) ? asString(json[2][1]) : undefined
    return source ? `${code}: ${source}` : code
  })
  return problems.length ? problems.join("; ") : "could not be read"
}

/** MathJSON holds a string either quoted inline or wrapped in a `str` object. */
function asString(json: unknown): string | undefined {
  if (typeof json === "string") return json.replace(/^'|'$/g, "")
  if (json && typeof json === "object" && "str" in json) return String(json.str)
  return undefined
}

const NO_BASE_CASE = "never reaches a base case"

/**
 * A recurrence with no reachable base case descends until something stops it,
 * and what stops it first — the engine's own recursion guard or the JavaScript
 * stack — depends on how much stack is left. Both mean the same thing to the
 * reader, so both are reported as the same thing.
 */
function describe(error: unknown): string {
  if (error instanceof RangeError) return NO_BASE_CASE
  if (!(error instanceof Error)) return String(error)
  return /recursion limit/i.test(error.message) ? NO_BASE_CASE : error.message
}

function formatApprox(value: number): string {
  if (value === 0) return "0"
  const magnitude = Math.abs(value)
  if (magnitude >= 1e12 || magnitude < 1e-4) return value.toExponential(4)
  return String(Number(value.toPrecision(10)))
}
