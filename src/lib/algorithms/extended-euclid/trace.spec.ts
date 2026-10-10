import { describe, expect, it } from "vitest"
import { trace } from "./trace"
import { trace as plainTrace } from "../euclid/trace"

const last = <T>(items: T[]) => items[items.length - 1]

describe("extended trace", () => {
  it("opens on E1's initial values", () => {
    expect(trace(1769, 551)[0]).toEqual({
      a_prime: 1,
      a: 0,
      b_prime: 0,
      b: 1,
      c: 1769,
      d: 551,
      q: 3,
      r: 116,
    })
  })

  it("finds the coefficients for 1769 and 551", () => {
    const { a, b, d } = last(trace(1769, 551))
    expect({ a, b, d }).toEqual({ a: 5, b: -16, d: 29 })
  })

  it("reaches a zero remainder exactly once, on the last step", () => {
    for (let m = 1; m <= 60; m++) {
      for (let n = 1; n <= 60; n++) {
        expect(trace(m, n).map((step) => step.r === 0)).toEqual(
          trace(m, n).map((_, i, steps) => i === steps.length - 1),
        )
      }
    }
  })

  it("ends with a·m + b·n = d, d being the greatest common divisor", () => {
    for (let m = 1; m <= 80; m++) {
      for (let n = 1; n <= 80; n++) {
        const { a, b, d } = last(trace(m, n))
        expect([m, n, a * m + b * n]).toEqual([m, n, d])
        expect([m, n, d]).toEqual([m, n, last(plainTrace(m, n)).n])
      }
    }
  })

  it("holds a'·m + b'·n = c and a·m + b·n = d at every step", () => {
    for (let m = 1; m <= 60; m++) {
      for (let n = 1; n <= 60; n++) {
        for (const s of trace(m, n)) {
          expect(s.a_prime * m + s.b_prime * n).toBe(s.c)
          expect(s.a * m + s.b * n).toBe(s.d)
        }
      }
    }
  })
})
