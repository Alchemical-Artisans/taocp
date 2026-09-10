/**
 * What the reader is currently pointing at, shared by the prose and the diagram
 * so the two can light each other up.
 *
 * Two separate things are tracked. The letter is Knuth's naming convention made
 * visible: every step of Algorithm F is named F-something, and pointing at any
 * one of those letters shows the rest. The step is the finer link, tying one
 * line of the algorithm to the box that draws it.
 */
let letter = $state<string | null>(null)
let step = $state<string | null>(null)

export const highlight = {
  get letter() {
    return letter
  },
  get step() {
    return step
  },
  hoverLetter(value: string | null) {
    letter = value
  },
  hoverStep(value: string | null) {
    step = value
  },
}

/** Lets a step find the algorithm it belongs to without being told twice. */
export const ALGORITHM = Symbol("algorithm")

export type AlgorithmContext = { readonly letter: string }
