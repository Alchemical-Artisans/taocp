import { describe, expect, it } from "vitest"
import { parseRulesCsv, rulesFromSearchParams, rulesToCsv, rulesToShareUrl, type Rule } from "./csv"

const knuthsRules: Rule[] = [
  { theta: "ab", phi: "bac", b: 0, a: 1 },
  { theta: "ba", phi: "a", b: 2, a: 3 },
  { theta: "ac", phi: "ca", b: 2, a: 0 },
  { theta: "a", phi: "", b: 3, a: 4 },
]

describe("rulesToCsv", () => {
  it("writes a header and one row per rule", () => {
    expect(rulesToCsv(knuthsRules)).toBe(
      ["theta,phi,b,a", "ab,bac,0,1", "ba,a,2,3", "ac,ca,2,0", "a,,3,4", ""].join("\n"),
    )
  })

  it("quotes strings that would otherwise lose their meaning", () => {
    const rules = [
      { theta: "a,b", phi: 'say "hi"', b: 0, a: 1 },
      { theta: " a", phi: "x\ny", b: 0, a: 1 },
    ]
    expect(rulesToCsv(rules)).toBe(
      ["theta,phi,b,a", '"a,b","say ""hi""",0,1', '" a","x\ny",0,1', ""].join("\n"),
    )
  })

  it("leaves a cleared stage number empty rather than inventing one", () => {
    expect(rulesToCsv([{ theta: "a", phi: "", b: null, a: 4 }])).toBe("theta,phi,b,a\na,,,4\n")
  })
})

describe("parseRulesCsv", () => {
  it("round trips a rule table", () => {
    expect(parseRulesCsv(rulesToCsv(knuthsRules))).toEqual(knuthsRules)
  })

  it.each([
    ["commas", [{ theta: "a,b", phi: "c", b: 0, a: 1 }]],
    ["quotes", [{ theta: 'a"b', phi: "c", b: 0, a: 1 }]],
    ["newlines", [{ theta: "a\nb", phi: "c", b: 0, a: 1 }]],
    ["edge whitespace", [{ theta: " a ", phi: "c", b: 0, a: 1 }]],
    ["empty strings", [{ theta: "", phi: "", b: 0, a: 1 }]],
  ])("round trips %s", (_name, rules: Rule[]) => {
    expect(parseRulesCsv(rulesToCsv(rules))).toEqual(rules)
  })

  it("reads columns by name, ignoring order and extra columns", () => {
    expect(parseRulesCsv("j,a,b,phi,theta\n0,1,0,bac,ab\n")).toEqual([
      { theta: "ab", phi: "bac", b: 0, a: 1 },
    ])
  })

  it("reads columns positionally when there is no header", () => {
    expect(parseRulesCsv("ab,bac,0,1\n")).toEqual([{ theta: "ab", phi: "bac", b: 0, a: 1 }])
  })

  it("accepts CRLF line endings and a BOM, as a spreadsheet writes them", () => {
    expect(parseRulesCsv("﻿theta,phi,b,a\r\nab,bac,0,1\r\n")).toEqual([
      { theta: "ab", phi: "bac", b: 0, a: 1 },
    ])
  })

  it("skips blank lines", () => {
    expect(parseRulesCsv("theta,phi,b,a\n\nab,bac,0,1\n\n")).toEqual([
      { theta: "ab", phi: "bac", b: 0, a: 1 },
    ])
  })

  it("keeps negative stage numbers, which simply terminate", () => {
    expect(parseRulesCsv("theta,phi,b,a\na,,-1,0\n")).toEqual([
      { theta: "a", phi: "", b: -1, a: 0 },
    ])
  })

  it.each([
    ["nothing to read", "", "No rules found."],
    ["only a header", "theta,phi,b,a\n", "No rules found."],
    ["a header missing columns", "theta,phi\nab,bac\n", "missing the b, a column(s)"],
    ["a short row", "theta,phi,b,a\nab,bac,0\n", "Row 0: expected 4 columns, got 3."],
    [
      "a non-numeric stage",
      "theta,phi,b,a\nab,bac,x,1\n",
      'Row 0: b must be a whole number, got "x".',
    ],
    [
      "a fractional stage",
      "theta,phi,b,a\nab,bac,0,1.5\n",
      'Row 0: a must be a whole number, got "1.5".',
    ],
    [
      "an empty stage",
      "theta,phi,b,a\nab,bac,,1\n",
      "Row 0: b must be a whole number, got nothing.",
    ],
    ["an unclosed quote", 'theta,phi,b,a\n"ab,bac,0,1\n', "missing its closing quote"],
  ])("rejects %s", (_name, csv, message) => {
    expect(() => parseRulesCsv(csv)).toThrow(message)
  })

  it("names the row a later error is in", () => {
    expect(() => parseRulesCsv("theta,phi,b,a\nab,bac,0,1\nba,a,2,oops\n")).toThrow("Row 1: a")
  })
})

describe("share links", () => {
  const page = new URL("https://example.com/taocp/vol-1/ch-1/1-1?other=kept#using-a-star")

  it("round trips rules through a link", () => {
    const link = new URL(rulesToShareUrl(page, knuthsRules))
    expect(rulesFromSearchParams(link.searchParams)).toEqual(knuthsRules)
  })

  it("keeps the rest of the URL intact", () => {
    const link = new URL(rulesToShareUrl(page, knuthsRules))
    expect([link.origin + link.pathname, link.hash, link.searchParams.get("other")]).toEqual([
      "https://example.com/taocp/vol-1/ch-1/1-1",
      "#using-a-star",
      "kept",
    ])
  })

  it("replaces any rules the link already carried", () => {
    const first = rulesToShareUrl(page, knuthsRules)
    const second = new URL(rulesToShareUrl(new URL(first), [knuthsRules[0]]))
    expect(rulesFromSearchParams(second.searchParams)).toEqual([knuthsRules[0]])
  })

  it("has no rules to read from a plain link", () => {
    expect(rulesFromSearchParams(page.searchParams)).toBeNull()
  })
})
