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

/**
 * A step as the reader entered it. The key stays with the step however it is
 * renumbered, so what was said about the arrows into and out of it stays too.
 */
export type StepInput = { key: string | number; text: string }

export type Step = {
  /** `X1`, `X2`: the letter followed by the number. */
  id: string
  /** The bracketed name, as in `[Initialize.]`, without its brackets. */
  title: string | null
  /** What the step does, after the name. */
  body: string
}

/** Which arm of a branch an arrow is, by the test that sends control along it. */
export type Condition = { text: string; negated: boolean }

export type Edge = { from: string; to: string; condition: Condition | null }

/** What holds on one arrow. There is one for every arrow, in reading order. */
export type Assertion = Edge & {
  id: string
  /**
   * Names the arrow by the keys of the steps at its ends, so what the reader
   * wrote about it survives renumbering and a change of letter.
   */
  key: string
  text: string
}

export type Flow = {
  letter: string
  steps: Step[]
  assertions: Assertion[]
  edges: Edge[]
  errors: string[]
}

/** What proving a step comes to: one precondition, one test, one postcondition. */
export type Obligation = { pre: string; condition: Condition | null; post: string }

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

/**
 * The algorithm the steps make, with an assertion on every arrow: A1 on the
 * arrow from Start, then each step's arrows out in turn. `said` holds what the
 * reader has written about each, by its key.
 */
export function build(
  letter: string,
  inputs: StepInput[],
  said: Record<string, string> = {},
): Flow {
  const errors: string[] = []
  const invalid = letterError(letter)
  if (invalid) errors.push(invalid)
  const name = invalid ? DEFAULT_LETTER : letter.trim().toUpperCase()

  const steps = inputs.map((input, i) => ({ id: `${name}${i + 1}`, ...titled(input.text.trim()) }))
  const keyOf = new Map<string, string>([
    [START, "start"],
    [END, "end"],
    ...steps.map((step, i): [string, string] => [step.id, String(inputs[i].key)]),
  ])

  const ids = new Set(steps.map((step) => step.id))
  const edges = flow(steps, name, ids, errors)

  const assertions = edges.map((edge, i) => {
    const arm = edge.condition?.negated ? "!" : ""
    const key = `${keyOf.get(edge.from)}>${keyOf.get(edge.to)}${arm}`
    return { ...edge, id: `A${i + 1}`, key, text: (said[key] ?? "").trim() }
  })

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
 * picks the way out, and what must hold going out.
 */
export function obligations(flow: Flow, step: string): Obligation[] {
  const ins = flow.assertions.filter((a) => a.to === step)
  const outs = flow.assertions.filter((a) => a.from === step)
  return ins.flatMap((pre) =>
    outs.map((post) => ({ pre: pre.id, condition: post.condition, post: post.id })),
  )
}

/**
 * An obligation as TeX: `\text{A2} \land n = 1 \Rightarrow \text{A3}`. Prose
 * in a condition is set as text and its `$…$` as maths, so either reads.
 */
export function obligationTex({ pre, condition, post }: Obligation): string {
  const label = (id: string) => `\\text{${id}}`
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
  const lines = ["---", "config:", "  flowchart:", "    minNodeWidth: 0", "---", "flowchart LR"]

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
        `    ${assertion.id}@{ shape: text, label: ${shapeLabel(assertion.text ? `${assertion.id}. ${assertion.text}` : assertion.id)} }`,
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
  return flow.assertions.flatMap((assertion): Link[] => [
    { from: assertion.from, to: assertion.id, style: "dotted" },
    { from: assertion.id, to: assertion.to, style: "dashed" },
  ])
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
