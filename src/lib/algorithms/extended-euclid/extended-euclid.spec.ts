import { describe, expect, it } from "vitest"
import { euclids_algorithm } from "../euclid/faithful"
import { extended_euclids_algorithm as faithful } from "./faithful"
import { extended_euclids_algorithm as idiomatic } from "./idiomatic"

const implementations = { faithful, idiomatic }

describe.each(Object.entries(implementations))("%s", (_name, extended_euclids_algorithm) => {
  it.each([
    [1769, 551, 5, -16, 29],
    [119, 544, -9, 2, 17],
    [6, 4, 1, -1, 2],
    [13, 7, -1, 2, 1],
    [12, 12, 0, 1, 12],
    [7, 21, 1, 0, 7],
  ])("gives a, b, d for m=%i, n=%i", (m, n, a, b, d) => {
    expect(extended_euclids_algorithm(m, n)).toEqual({ a, b, remainder: d })
  })

  it("satisfies am + bn = d", () => {
    for (let m = 1; m <= 60; m++) {
      for (let n = 1; n <= 60; n++) {
        const { a, b, remainder: d } = extended_euclids_algorithm(m, n)
        expect([m, n, a * m + b * n]).toEqual([m, n, d])
      }
    }
  })

  it("finds the greatest common divisor", () => {
    for (let m = 1; m <= 60; m++) {
      for (let n = 1; n <= 60; n++) {
        expect(extended_euclids_algorithm(m, n).remainder).toBe(euclids_algorithm(m, n))
      }
    }
  })

  it("returns integer coefficients", () => {
    for (let m = 1; m <= 60; m++) {
      for (let n = 1; n <= 60; n++) {
        const { a, b } = extended_euclids_algorithm(m, n)
        expect(Number.isInteger(a) && Number.isInteger(b)).toBe(true)
      }
    }
  })

  it("keeps the coefficients small: |a| <= n/d and |b| <= m/d", () => {
    for (let m = 1; m <= 60; m++) {
      for (let n = 1; n <= 60; n++) {
        const { a, b, remainder: d } = extended_euclids_algorithm(m, n)
        expect(Math.abs(a)).toBeLessThanOrEqual(n / d)
        expect(Math.abs(b)).toBeLessThanOrEqual(m / d)
      }
    }
  })

  it("gives a = 0 and b = 1 when n already divides m", () => {
    for (let n = 1; n <= 30; n++) {
      for (let k = 1; k <= 10; k++) {
        expect(extended_euclids_algorithm(k * n, n)).toEqual({ a: 0, b: 1, remainder: n })
      }
    }
  })

  it("handles large coprime arguments", () => {
    const { a, b, remainder: d } = extended_euclids_algorithm(1_000_003, 999_983)
    expect(d).toBe(1)
    expect(a * 1_000_003 + b * 999_983).toBe(1)
  })
})

it("the two implementations agree with each other", () => {
  for (let m = 1; m <= 80; m++) {
    for (let n = 1; n <= 80; n++) {
      expect(idiomatic(m, n)).toEqual(faithful(m, n))
    }
  }
})
