import { describe, expect, it } from "vitest"
import { euclids_algorithm as faithful } from "./faithful"
import { euclids_algorithm as idiomatic } from "./idiomatic"

/* Deliberately not Euclid: a definition-driven reference to check the
   algorithm against, rather than a second copy of the algorithm itself. */
function greatestCommonDivisorByDefinition(m: number, n: number): number {
  for (let d = Math.min(m, n); d >= 1; d--) {
    if (m % d === 0 && n % d === 0) return d
  }
  return 1
}

const implementations = { faithful, idiomatic }

describe.each(Object.entries(implementations))("%s", (_name, euclids_algorithm) => {
  it.each([
    [119, 544, 17],
    [544, 119, 17],
    [6, 4, 2],
    [40902, 24140, 34],
    [13, 7, 1],
    [12, 12, 12],
    [1, 1, 1],
    [7, 21, 7],
  ])("gcd(%i, %i) is %i", (m, n, expected) => {
    expect(euclids_algorithm(m, n)).toBe(expected)
  })

  it("agrees with the definition of the greatest common divisor", () => {
    for (let m = 1; m <= 60; m++) {
      for (let n = 1; n <= 60; n++) {
        expect([m, n, euclids_algorithm(m, n)]).toEqual([
          m,
          n,
          greatestCommonDivisorByDefinition(m, n),
        ])
      }
    }
  })

  it("is symmetric in its arguments", () => {
    for (let m = 1; m <= 40; m++) {
      for (let n = 1; n <= 40; n++) {
        expect(euclids_algorithm(m, n)).toBe(euclids_algorithm(n, m))
      }
    }
  })
})

it("the two implementations agree with each other", () => {
  for (let m = 1; m <= 80; m++) {
    for (let n = 1; n <= 80; n++) {
      expect(idiomatic(m, n)).toBe(faithful(m, n))
    }
  }
})
