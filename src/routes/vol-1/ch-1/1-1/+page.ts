import type { PageLoad } from "./$types"

export const load: PageLoad = () => {
  return {
    onThisPage: [
      { id: "euclids-algorithm", label: "Euclid's Algorithm" },
      { id: "implementation", label: "Implementation" },
      { id: "algorithm-structure", label: "Algorithm Structure" },
      { id: "notation-reference", label: "Notation Reference" },
      { id: "algorithm-feature-reference", label: "Algorithm Feature Reference" },
      { id: "algorithm-e-correctness-proof-explanation", label: "Algorithm E Correctness Proof" },
      { id: "worked-example-of-t3", label: "Worked Example of T3" },
      { id: "explanation-of-set-theory-grounding", label: "Set Theory Grounding" },
      { id: "using-a-star", label: "Using A*" },
      { id: "exercise-and-answer-clarifications", label: "Exercise and Answer Clarifications" },
    ],
  }
}
