/** One row of an A* rule table. Its stage number is its position in the list. */
export type Rule = { theta: string; phi: string; b: number; a: number }

/* Rules as they come out of the editor, where clearing a number input leaves
   null behind. Serializing writes those as empty fields rather than invent a
   stage number for them. */
type PartialRule = { theta: string; phi: string; b: number | null; a: number | null }

const COLUMNS = ["theta", "phi", "b", "a"] as const

type Column = (typeof COLUMNS)[number]

function needsQuoting(field: string): boolean {
  return /[",\r\n]/.test(field) || field !== field.trim()
}

function quote(field: string): string {
  return needsQuoting(field) ? `"${field.replaceAll('"', '""')}"` : field
}

function number(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "" : String(value)
}

/**
 * A rule table as RFC 4180 CSV, with a header row naming the columns.
 *
 * θ and φ are arbitrary strings, so they are quoted whenever a comma, quote,
 * newline or edge whitespace would otherwise be lost.
 */
export function rulesToCsv(rules: readonly PartialRule[]): string {
  const rows = rules.map((rule) =>
    [quote(rule.theta), quote(rule.phi), number(rule.b), number(rule.a)].join(","),
  )
  return [COLUMNS.join(","), ...rows].join("\n") + "\n"
}

/** Splits CSV text into records of fields, honouring quoted fields. */
function parseRecords(text: string): string[][] {
  if (text.startsWith("﻿")) text = text.slice(1)

  const records: string[][] = []
  let record: string[] = []
  let field = ""
  let quoted = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
        } else {
          quoted = false
          i += 1
        }
      } else {
        field += char
        i += 1
      }
      continue
    }

    if (char === '"' && field === "") {
      quoted = true
      i += 1
    } else if (char === ",") {
      record.push(field)
      field = ""
      i += 1
    } else if (char === "\n" || char === "\r") {
      record.push(field)
      records.push(record)
      record = []
      field = ""
      i += char === "\r" && text[i + 1] === "\n" ? 2 : 1
    } else {
      field += char
      i += 1
    }
  }

  if (quoted) throw new Error("A quoted field is missing its closing quote.")

  record.push(field)
  records.push(record)
  return records
}

function isBlank(record: string[]): boolean {
  return record.every((field) => field.trim() === "")
}

/* A header is optional: without one the columns are read in the order the
   table shows them. With one, extra columns such as a copy of j are ignored,
   so a spreadsheet round trip does not have to be column-perfect. */
function columnIndexes(header: string[]): Record<Column, number> | null {
  const names = header.map((field) => field.trim().toLowerCase())
  if (!COLUMNS.some((column) => names.includes(column))) return null

  const missing = COLUMNS.filter((column) => !names.includes(column))
  if (missing.length > 0) {
    throw new Error(`The header row is missing the ${missing.join(", ")} column(s).`)
  }

  return Object.fromEntries(COLUMNS.map((column) => [column, names.indexOf(column)])) as Record<
    Column,
    number
  >
}

function integer(field: string, column: Column, row: number): number {
  const value = field.trim()
  if (!/^[+-]?\d+$/.test(value)) {
    const got = value === "" ? "nothing" : `"${value}"`
    throw new Error(`Row ${row}: ${column} must be a whole number, got ${got}.`)
  }
  return Number(value)
}

/**
 * Reads a rule table back out of CSV, throwing an Error whose message names
 * the offending row when it cannot.
 *
 * Blank lines are skipped, so a trailing newline is fine. Row numbers in error
 * messages count rules, not lines, matching the j column in the table.
 */
export function parseRulesCsv(text: string): Rule[] {
  const records = parseRecords(text).filter((record) => !isBlank(record))
  if (records.length === 0) throw new Error("No rules found.")

  const header = columnIndexes(records[0])
  const indexes = header ?? { theta: 0, phi: 1, b: 2, a: 3 }
  const body = header ? records.slice(1) : records
  if (body.length === 0) throw new Error("No rules found.")

  return body.map((record, row) => {
    const width = Math.max(...Object.values(indexes)) + 1
    if (record.length < width) {
      throw new Error(`Row ${row}: expected ${width} columns, got ${record.length}.`)
    }
    return {
      theta: record[indexes.theta],
      phi: record[indexes.phi],
      b: integer(record[indexes.b], "b", row),
      a: integer(record[indexes.a], "a", row),
    }
  })
}

/** The query parameter a share link carries the CSV in. */
export const RULES_PARAM = "rules"

/**
 * A link to `page` that carries `rules` with it, so sharing a rule table is
 * sharing a URL. The CSV rides in a query parameter, percent-encoded by
 * URLSearchParams, which keeps the whole thing client side.
 */
export function rulesToShareUrl(page: URL, rules: readonly PartialRule[]): string {
  const url = new URL(page)
  url.searchParams.set(RULES_PARAM, rulesToCsv(rules))
  return url.toString()
}

/** The rules a share link carries, or null if it carries none. */
export function rulesFromSearchParams(params: URLSearchParams): Rule[] | null {
  const csv = params.get(RULES_PARAM)
  return csv === null ? null : parseRulesCsv(csv)
}
