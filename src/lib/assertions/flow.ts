/**
 * An algorithm laid out the way 1.1 lays one out, with Floyd's assertions
 * interlaced between its steps. Each row is a step or an assertion; steps are
 * numbered X1, X2, … and assertions A1, A2, … in the order they are written,
 * and an assertion names the arrow it sits on by the step numbers at its ends.
 *
 * The flow between steps is read from the steps themselves, the way a reader
 * reads Knuth: a step goes on to the next one unless it says otherwise, "go to
 * X1" sends it elsewhere, "terminate" ends the algorithm, and "If condition,
 * ..." makes the step a branch whose other arm carries on as usual.
 */

export const START = "Start"
export const END = "End"

/** The letter an algorithm is given until the reader picks another. */
export const DEFAULT_LETTER = "X"

/** Assertions are A1, A2, …, so an algorithm cannot also be lettered A. */
const ASSERTION_LETTER = "A"

/** Where an assertion's arrow starts or ends: Start, End, or a step's number. */
export type Endpoint = "start" | "end" | number

export type Row =
  { kind: "step"; text: string } | { kind: "assertion"; from: Endpoint; to: Endpoint; text: string }

export type Step = {
  /** `X1`, `X2`: the letter followed by the number. */
  id: string
  /** The bracketed name, as in `[Initialize.]`, without its brackets. */
  title: string | null
  /** What the step does, after the name. */
  body: string
}

export type Assertion = {
  id: string
  /** The step, or `Start`, that the arrow leaves. */
  from: string
  /** The step, or `End`, that the arrow enters. */
  to: string
  text: string
}

/** Which arm of a branch an arrow is, by the test that sends control along it. */
export type Condition = { text: string; negated: boolean }

export type Edge = { from: string; to: string; condition: Condition | null }

export type Flow = {
  letter: string
  steps: Step[]
  assertions: Assertion[]
  edges: Edge[]
  errors: string[]
}

/** What proving a step comes to: one precondition, one test, one postcondition. */
export type Obligation = {
  /** An assertion id, or null where the arrow in carries none. */
  pre: string | null
  condition: Condition | null
  post: string | null
}

/**
 * The letter as typed, if it can letter an algorithm: one letter, and not the
 * one the assertions already use.
 */
export function letterError(letter: string): string | null {
  const typed = letter.trim().toUpperCase()
  if (!/^[A-Z]$/.test(typed)) return "The algorithm's letter must be a single letter."
  if (typed === ASSERTION_LETTER) return "Algorithm A would share its labels with the assertions."
  return null
}

/** `X3` for step 3 of Algorithm X; Start and End by name. */
export function endpointId(letter: string, point: Endpoint): string {
  if (point === "start") return START
  if (point === "end") return END
  return `${letter}${point}`
}

export function build(letter: string, rows: Row[]): Flow {
  const errors: string[] = []
  const invalid = letterError(letter)
  if (invalid) errors.push(invalid)
  const name = invalid ? DEFAULT_LETTER : letter.trim().toUpperCase()

  const steps: Step[] = []
  const assertions: Assertion[] = []
  for (const row of rows) {
    if (row.kind === "step") {
      steps.push({ id: `${name}${steps.length + 1}`, ...titled(row.text.trim()) })
    } else {
      assertions.push({
        id: `A${assertions.length + 1}`,
        from: endpointId(name, row.from),
        to: endpointId(name, row.to),
        text: row.text.trim(),
      })
    }
  }

  const ids = new Set(steps.map((step) => step.id))
  const edges = flow(steps, name, ids, errors)

  for (const assertion of assertions) {
    const unknown = [assertion.from, assertion.to].filter(
      (point) => point !== START && point !== END && !ids.has(point),
    )
    if (assertion.from === END || assertion.to === START) {
      errors.push(`${assertion.id} runs backwards: arrows leave Start and enter End.`)
    } else if (unknown.length) {
      errors.push(`${assertion.id} names ${unknown.join(" and ")}, which is not a step.`)
    } else if (!edges.some((edge) => edge.from === assertion.from && edge.to === assertion.to)) {
      errors.push(
        `${assertion.id} sits on ${assertion.from} ⇒ ${assertion.to}, which no step takes.`,
      )
    }
  }

  return { letter: name, steps, assertions, edges, errors }
}

/** Knuth names a step in brackets before saying what it does: `[Divide.] …`. */
function titled(text: string): { title: string | null; body: string } {
  const named = text.match(/^\[([^\]]*)\]\s*(.*)$/)
  if (!named) return { title: null, body: text }
  return { title: named[1].trim(), body: named[2].trim() }
}

/** Where control goes from each step, in the order the steps are written. */
function flow(steps: Step[], letter: string, ids: Set<string>, errors: string[]): Edge[] {
  const edges: Edge[] = []
  if (steps.length) edges.push({ from: START, to: steps[0].id, condition: null })

  steps.forEach((step, index) => {
    const next = steps[index + 1]?.id ?? END
    const target = (text: string) => destination(text, letter, ids, step.id, errors)
    const branch = conditional(step.body)

    if (!branch) {
      edges.push({ from: step.id, to: target(step.body) ?? next, condition: null })
      return
    }

    /* "If condition, do something" with nowhere to go is a step that does
       something and carries on either way, not a branch. */
    const taken = target(branch.then)
    const otherwise = branch.otherwise === null ? null : target(branch.otherwise)
    if (taken === null && otherwise === null) {
      edges.push({ from: step.id, to: next, condition: null })
      return
    }

    edges.push({
      from: step.id,
      to: taken ?? next,
      condition: { text: branch.condition, negated: false },
    })
    edges.push({
      from: step.id,
      to: otherwise ?? next,
      condition: { text: branch.condition, negated: true },
    })
  })

  return edges
}

/**
 * The step a stretch of text sends control to: End if it terminates, the first
 * step it names otherwise, or null if it does neither and control falls
 * through.
 */
function destination(
  text: string,
  letter: string,
  ids: Set<string>,
  from: string,
  errors: string[],
): string | null {
  if (/\bterminat/i.test(text)) return END
  const named = text.match(new RegExp(`\\b${letter}(\\d+)\\b`, "i"))
  if (!named) return null
  const id = `${letter}${named[1]}`
  if (!ids.has(id)) {
    errors.push(`${from} goes to ${id}, which is not a step.`)
    return null
  }
  return id
}

/**
 * `If condition, then; otherwise else` → its three parts. The condition ends
 * at the first comma outside of `$…$`, so a test like `$(a, b) = 0$` survives.
 */
function conditional(
  body: string,
): { condition: string; then: string; otherwise: string | null } | null {
  const start = body.search(/\bif\b/i)
  if (start < 0) return null

  const rest = body.slice(start + 2)
  let math = false
  let comma = -1
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "$" && rest[i - 1] !== "\\") math = !math
    else if (rest[i] === "," && !math) {
      comma = i
      break
    }
  }
  if (comma < 0) return null

  const condition = rest.slice(0, comma).trim()
  const consequence = rest.slice(comma + 1)
  const split = consequence.search(/[;.,]?\s*\botherwise\b/i)
  if (split < 0) return { condition, then: consequence.trim(), otherwise: null }
  return {
    condition,
    then: consequence.slice(0, split).trim(),
    otherwise: consequence
      .slice(split)
      .replace(/^[;.,]?\s*otherwise\s*,?/i, "")
      .trim(),
  }
}

/**
 * Every pair of arrows through a step: what holds coming in, the test that
 * picks the way out, and what must hold going out. An arrow with no assertion
 * on it still counts, with null in its place, since the proof needs one there.
 */
export function obligations(flow: Flow, step: string): Obligation[] {
  const on = (edge: { from: string; to: string }) => {
    const found = flow.assertions.filter((a) => a.from === edge.from && a.to === edge.to)
    return found.length ? found.map((a) => a.id) : [null]
  }

  /* Arrows an assertion claims but no step takes still belong to the step it
     names, so a mislabelled assertion shows up where the reader will look. */
  const claimed: Edge[] = flow.assertions
    .filter((a) => !flow.edges.some((edge) => edge.from === a.from && edge.to === a.to))
    .map((a) => ({ from: a.from, to: a.to, condition: null }))
  const edges = [...flow.edges, ...claimed]

  const ins = edges.filter((edge) => edge.to === step)
  const outs = edges.filter((edge) => edge.from === step)

  return ins.flatMap((edgeIn) =>
    on(edgeIn).flatMap((pre) =>
      outs.flatMap((edgeOut) =>
        on(edgeOut).map((post) => ({ pre, condition: edgeOut.condition, post })),
      ),
    ),
  )
}

/**
 * An obligation as TeX: `\text{A2} \land n = 1 \Rightarrow \text{A3}`. Prose
 * in a condition is set as text and its `$…$` as maths, so either reads.
 */
export function obligationTex({ pre, condition, post }: Obligation): string {
  const label = (id: string | null) => `\\text{${id ?? "?"}}`
  const test = condition ? ` \\land ${conditionTex(condition)}` : ""
  return `${label(pre)}${test} \\Rightarrow ${label(post)}`
}

export function conditionTex({ text, negated }: Condition): string {
  const tex = mixedTex(text)
  return negated ? `\\lnot(${tex})` : `(${tex})`
}

function mixedTex(text: string): string {
  return text
    .split(/(?<!\\)\$/)
    .map((part, i) => (i % 2 ? part : part ? `\\text{${escapeText(part)}}` : ""))
    .join("")
}

function escapeText(text: string): string {
  return text.replace(/[\\{}]/g, (c) => `\\${c}`).replace(/[#%&_^~]/g, (c) => `\\${c}`)
}

/**
 * The flowchart: the algorithm's steps in one subgraph and its assertions in
 * another, side by side and each reading downwards.
 *
 * Mermaid ignores a subgraph's direction once any of its nodes links outside
 * it, so the lines between steps and assertions are not part of the chart;
 * `links` lists them for drawing over it once Mermaid has laid it out.
 */
export function chart(flow: Flow): string {
  const lines = ["flowchart LR"]

  lines.push(`  subgraph algorithm["Algorithm ${flow.letter}"]`)
  lines.push("    direction TB")
  lines.push(`    ${START}@{ shape: flip-tri, label: "${START}" }`)
  for (const step of flow.steps)
    lines.push(`    ${step.id}["${label(`${step.id}. ${step.title ?? step.body}`)}"]`)
  lines.push(`    ${END}@{ shape: tri, label: "${END}" }`)
  for (const edge of flow.edges) {
    const text = edge.condition ? ` -- "${label(`$${conditionTex(edge.condition)}$`)}" -->` : " -->"
    lines.push(`    ${edge.from}${text} ${edge.to}`)
  }
  lines.push("  end")

  if (flow.assertions.length) {
    lines.push(`  subgraph assertions["Assertions"]`)
    lines.push("    direction TB")
    for (const assertion of flow.assertions) {
      lines.push(
        `    ${assertion.id}@{ shape: text, label: ${shapeLabel(`${assertion.id}. ${assertion.text}`)} }`,
      )
    }
    /* Unlinked, the assertions would share one rank and sit in a row; chained
       invisibly they stand in a column, in the order they were written. */
    if (flow.assertions.length > 1)
      lines.push(`    ${flow.assertions.map((a) => a.id).join(" ~~~ ")}`)
    lines.push("  end")
    /* A link between the subgraphs themselves, which Mermaid allows without
       giving up their directions, puts the assertions beside the algorithm. */
    lines.push("  algorithm ~~~ assertions")
  }

  return lines.join("\n")
}

/**
 * The lines Mermaid is not asked to draw: dotted from a step to each of its
 * postconditions, dashed from each precondition to its step.
 */
export type Link = { from: string; to: string; style: "dotted" | "dashed" }

export function links(flow: Flow): Link[] {
  const known = new Set([START, END, ...flow.steps.map((step) => step.id)])
  return flow.assertions.flatMap((assertion) => {
    const drawn: Link[] = []
    if (known.has(assertion.from) && assertion.from !== END)
      drawn.push({ from: assertion.from, to: assertion.id, style: "dotted" })
    if (known.has(assertion.to) && assertion.to !== START)
      drawn.push({ from: assertion.id, to: assertion.to, style: "dashed" })
    return drawn
  })
}

/**
 * Text as a quoted Mermaid label. Mermaid typesets `$$…$$`, so the reader's
 * `$…$` is doubled; a quote would close the label, so it becomes an entity.
 * Mermaid escapes `<` and `>` before KaTeX sees them, so inside the maths they
 * become the commands that draw them.
 */
function label(text: string): string {
  return text
    .replace(/"/g, "#quot;")
    .replace(/(?<![\\$])\$(?!\$)((?:\\\$|[^$])+?)(?<!\\)\$(?!\$)/g, (_, math: string) => {
      return `$$${math.replace(/</g, "\\lt ").replace(/>/g, "\\gt ")}$$`
    })
}

/**
 * A label inside `@{ … }`, which Mermaid reads as YAML: a double-quoted string
 * there treats `\gcd` as an escape and rejects it, while a single-quoted one
 * keeps backslashes as they are and only needs its own quote doubled.
 */
function shapeLabel(text: string): string {
  return `'${label(text)
    .replace(/#quot;/g, '"')
    .replace(/'/g, "''")}'`
}
