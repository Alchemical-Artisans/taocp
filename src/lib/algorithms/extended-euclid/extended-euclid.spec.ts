import { describe, expect, it } from "vitest"
import { euclids_algorithm } from "../euclid/faithful"
import { extended_euclids_algorithm } from "./faithful"

describe("extended Euclid's algorithm", () => {
  it.each([
    [1769, 551, 29],
    [119, 544, 17],
    [544, 119, 17],
    [13, 7, 1],
    [12, 12, 12],
    [1, 1, 1],
    [7, 21, 7],
  ])("finds the gcd of %i and %i, which is %i", (m, n, expected) => {
    expect(extended_euclids_algorithm(m, n).d).toBe(expected)
  })

  it("finds the coefficients Knuth gives for 1769 and 551", () => {
    expect(extended_euclids_algorithm(1769, 551)).toEqual({ a: 5, b: -16, d: 29 })
  })

  it("returns a and b with am + bn = d", () => {
    for (let m = 1; m <= 80; m++) {
      for (let n = 1; n <= 80; n++) {
        const { a, b, d } = extended_euclids_algorithm(m, n)
        expect([m, n, a * m + b * n]).toEqual([m, n, d])
      }
    }
  })

  it("agrees with Algorithm E on the gcd", () => {
    for (let m = 1; m <= 80; m++) {
      for (let n = 1; n <= 80; n++) {
        expect(extended_euclids_algorithm(m, n).d).toBe(euclids_algorithm(m, n))
      }
    }
  })
})
