import { describe, it, expect } from "vitest"
import { dedent } from "./dedent"

describe("dedent", () => {
  it("removes the indentation every line shares", () => {
    expect(dedent("    a\n    b")).toBe("a\nb")
  })

  it("keeps indentation relative to the shallowest line", () => {
    expect(dedent("    a\n      b")).toBe("a\n  b")
  })

  it("drops surrounding blank lines", () => {
    expect(dedent("\n\n  a\n\n")).toBe("a")
  })

  it("ignores blank lines when measuring indentation", () => {
    expect(dedent("  a\n\n  b")).toBe("a\n\nb")
  })

  it("expands tabs so they measure alongside spaces", () => {
    expect(dedent("\ta\n\t\tb")).toBe("a\n  b")
  })

  it("returns nothing for blank input", () => {
    expect(dedent("\n  \n")).toBe("")
  })
})
