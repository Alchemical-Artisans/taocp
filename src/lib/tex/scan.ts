export interface MathSpan {
  /** Offset of the opening delimiter in the source. */
  start: number
  /** Offset just past the closing delimiter. */
  end: number
  /** The TeX between the delimiters, with HTML entities decoded. */
  tex: string
  display: boolean
}

/** Elements whose text is never prose, so a `$` inside them is never math. */
const OPAQUE = ["script", "style", "pre", "code"]

/**
 * Find `$...$` and `$$...$$` spans in Svelte markup.
 *
 * This runs against raw source, before Svelte parses it, which is what lets
 * `$\frac{n}{2}$` work: the braces would otherwise read as an expression tag.
 * The cost is that the scanner has to step over the constructs Svelte cares
 * about — tags, comments, expression tags and opaque elements — itself.
 */
export function scan(source: string): MathSpan[] {
  const spans: MathSpan[] = []
  let i = 0

  while (i < source.length) {
    const char = source[i]

    if (char === "\\" && source[i + 1] === "$") {
      // An escaped dollar is literal text, and never opens math.
      i += 2
    } else if (source.startsWith("<!--", i)) {
      i = skipTo(source, i + 4, "-->")
    } else if (char === "<") {
      i = skipElement(source, i)
    } else if (char === "{") {
      i = skipExpression(source, i)
    } else if (char === "$") {
      const span = readMath(source, i)
      if (span) {
        spans.push(span)
        i = span.end
      } else {
        i += 1
      }
    } else {
      i += 1
    }
  }
  return spans
}

function skipTo(source: string, from: number, needle: string): number {
  const at = source.indexOf(needle, from)
  return at === -1 ? source.length : at + needle.length
}

/**
 * Step over a tag. For an opaque element the whole body goes with it, so that
 * a `$` in a code sample is left exactly as the author typed it.
 */
function skipElement(source: string, start: number): number {
  const name = source.slice(start + 1).match(/^([a-zA-Z][-\w]*)/)?.[1]
  const afterTag = skipTagBody(source, start)

  if (!name || !OPAQUE.includes(name.toLowerCase())) return afterTag
  if (source[afterTag - 2] === "/") return afterTag // self-closing, so there is no body

  const close = source.toLowerCase().indexOf(`</${name.toLowerCase()}`, afterTag)
  return close === -1 ? source.length : skipTagBody(source, close)
}

/** Step over `<...>`, honouring quotes so an attribute may contain `>`. */
function skipTagBody(source: string, start: number): number {
  let i = start + 1
  let quote = ""

  while (i < source.length) {
    const char = source[i]
    if (quote) {
      if (char === quote) quote = ""
    } else if (char === '"' || char === "'") {
      quote = char
    } else if (char === ">") {
      return i + 1
    }
    i += 1
  }
  return source.length
}

/** Step over a Svelte expression tag, so `{$store}` is never read as math. */
function skipExpression(source: string, start: number): number {
  let depth = 0
  let i = start

  while (i < source.length) {
    if (source[i] === "{") depth += 1
    else if (source[i] === "}" && --depth === 0) return i + 1
    i += 1
  }
  return source.length
}

function readMath(source: string, start: number): MathSpan | null {
  const display = source[start + 1] === "$"
  const delimiter = display ? "$$" : "$"
  const from = start + delimiter.length

  const end = display ? findDisplayEnd(source, from) : findInlineEnd(source, from)
  if (end === -1) return null

  const tex = decodeEntities(source.slice(from, end))
  if (!tex.trim()) return null

  return { start, end: end + delimiter.length, tex, display }
}

function findDisplayEnd(source: string, from: number): number {
  for (let i = from; i < source.length - 1; i++) {
    if (source[i] === "\\") i += 1
    else if (source[i] === "$" && source[i + 1] === "$") return i
  }
  return -1
}

/**
 * Inline math ends at the next unescaped `$`, but never crosses a blank line.
 * Without that limit a lone `$` in prose — a price, a shell prompt — would
 * swallow everything up to the next one.
 */
function findInlineEnd(source: string, from: number): number {
  if (isSpace(source[from])) return -1

  for (let i = from; i < source.length; i++) {
    if (source[i] === "\\") {
      i += 1
    } else if (source[i] === "$") {
      return i > from && !isSpace(source[i - 1]) ? i : -1
    } else if (/^[ \t]*\r?\n[ \t]*\r?\n/.test(source.slice(i))) {
      return -1
    }
  }
  return -1
}

function isSpace(char: string | undefined): boolean {
  return char === undefined || /\s/.test(char)
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
}
