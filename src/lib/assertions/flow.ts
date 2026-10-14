/**
 * An algorithm written the way 1.1 lays one out, with Floyd's assertions
 * interlaced between its steps:
 *
 *     Algorithm X
 *     A1 [Start => X1]: Initial assertion
 *     X1. [Title.] Something.
 *     A2 [X1 => X2]: Something
 *     X2. If condition, terminate.
 *     A3 [X2 => End]: Final assertion
 *
 * The flow between steps is read from the steps themselves, the way a reader
 * reads Knuth: a step goes on to the next one unless it says otherwise, "go to
 * X1" sends it elsewhere, "terminate" ends the algorithm, and "If condition,
 * ..." makes the step a branch whose other arm carries on as usual. Each
 * assertion names the arrow it sits on.
 */

export const START = "Start"
export const END = "End"

/** The letter an algorithm is given when its source does not name one. */
export const DEFAULT_LETTER = "X"

/** Assertions are A1, A2, …, so an algorithm cannot also be lettered A. */
const ASSERTION_LETTER = "A"

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

const HEADER = /^Algorithm\s+([A-Za-z])\b/
const STEP = /^([A-Za-z])(\d+)\s*[.:]\s*(.*)$/
const ASSERTION = /^A(\d+)\s*\[\s*([^\]]*?)\s*(?:=>|⇒|->|→)\s*([^\]]*?)\s*\]\s*[.:]?\s*(.*)$/

type Entry =
  | { kind: "step"; id: string; letter: string; text: string[] }
  | { kind: "assertion"; id: string; from: string; to: string; text: string[] }

export function parse(source: string): Flow {
  const errors: string[] = []
  const entries: Entry[] = []
  let letter: string | null = null

  for (const [index, raw] of source.split("\n").entries()) {
    const line = raw.trim()
    if (!line) continue

    const header: RegExpMatchArray | null =
      !letter && entries.length === 0 ? line.match(HEADER) : null
    if (header) {
      letter = header[1].toUpperCase()
      continue
    }

    const assertion = line.match(ASSERTION)
    if (assertion) {
      entries.push({
        kind: "assertion",
        id: `A${assertion[1]}`,
        from: endpoint(assertion[2]),
        to: endpoint(assertion[3]),
        text: [assertion[4]],
      })
      continue
    }

    const step = line.match(STEP)
    if (step && step[1].toUpperCase() === ASSERTION_LETTER) {
      errors.push(`A${step[2]} needs the arrow it sits on, as in [X1 => X2].`)
      continue
    }
    if (step) {
      const stepLetter = step[1].toUpperCase()
      entries.push({
        kind: "step",
        id: `${stepLetter}${step[2]}`,
        letter: stepLetter,
        text: [step[3]],
      })
      continue
    }

    /* A long step or assertion runs on over as many lines as it likes. */
    const last = entries[entries.length - 1]
    if (last) last.text.push(line)
    else errors.push(`Line ${index + 1} is neither a step nor an assertion.`)
  }

  const name = letter ?? DEFAULT_LETTER
  if (name === ASSERTION_LETTER)
    errors.push("Algorithm A would share its labels with the assertions.")

  const steps: Step[] = []
  const assertions: Assertion[] = []
  const seen = new Set<string>()

  for (const entry of entries) {
    if (seen.has(entry.id)) {
      errors.push(`${entry.id} is written twice.`)
      continue
    }
    seen.add(entry.id)

    const text = entry.text.join(" ").trim()
    if (entry.kind === "assertion") {
      assertions.push({ id: entry.id, from: entry.from, to: entry.to, text })
    } else if (entry.letter !== name) {
      errors.push(`${entry.id} is not a step of Algorithm ${name}.`)
    } else {
      steps.push({ id: entry.id, ...titled(text) })
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

/** `Start` and `End` in whatever case they were typed; steps upper-cased. */
function endpoint(text: string): string {
  const lower = text.toLowerCase()
  if (lower === "start") return START
  if (lower === "end") return END
  return text.toUpperCase()
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
 * another, each step joined to its postconditions by a dotted line and each
 * precondition to its step by a dashed one.
 */
export function chart(flow: Flow): string {
  const lines = ["flowchart TB"]
  const steps = new Set(flow.steps.map((step) => step.id))

  lines.push(`  subgraph algorithm["Algorithm ${flow.letter}"]`)
  lines.push(`    ${START}@{ shape: flip-tri, label: "${START}" }`)
  for (const step of flow.steps)
    lines.push(`    ${step.id}["${label(`${step.id}. ${step.title ?? step.body}`)}"]`)
  lines.push(`    ${END}@{ shape: tri, label: "${END}" }`)
  lines.push("  end")

  if (flow.assertions.length) {
    lines.push(`  subgraph assertions["Assertions"]`)
    for (const assertion of flow.assertions) {
      lines.push(
        `    ${assertion.id}@{ shape: text, label: ${shapeLabel(`${assertion.id}. ${assertion.text}`)} }`,
      )
    }
    lines.push("  end")
  }

  /* linkStyle addresses links by the order they are written, so count them. */
  let links = 0
  const dotted: number[] = []
  const dashed: number[] = []

  for (const edge of flow.edges) {
    const text = edge.condition ? ` -- "${label(`$${conditionTex(edge.condition)}$`)}" -->` : " -->"
    lines.push(`  ${edge.from}${text} ${edge.to}`)
    links++
  }

  const known = (point: string) => point === START || point === END || steps.has(point)
  for (const assertion of flow.assertions) {
    if (known(assertion.from) && assertion.from !== END) {
      lines.push(`  ${assertion.from} -.-> ${assertion.id}`)
      dotted.push(links++)
    }
    if (known(assertion.to) && assertion.to !== START) {
      lines.push(`  ${assertion.id} --> ${assertion.to}`)
      dashed.push(links++)
    }
  }

  /* Unlinked, the assertions would sit side by side on one rank as wide as all
     of them together; chained invisibly they stand in a column, in the order
     they were written, beside the algorithm. Written last, so the links that
     linkStyle counts keep their numbers. */
  if (flow.assertions.length > 1) lines.push(`  ${flow.assertions.map((a) => a.id).join(" ~~~ ")}`)

  if (dotted.length)
    lines.push(`  linkStyle ${dotted.join(",")} stroke-dasharray:1 5,stroke-linecap:round`)
  if (dashed.length) lines.push(`  linkStyle ${dashed.join(",")} stroke-dasharray:8 5`)

  return lines.join("\n")
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
