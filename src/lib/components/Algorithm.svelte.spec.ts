import { userEvent } from "vitest/browser"
import { beforeEach, describe, expect, it } from "vitest"
import { render } from "vitest-browser-svelte"
import AlgorithmHarness from "./AlgorithmHarness.svelte"
import { highlight } from "./highlight.svelte"

/* The hover state is module scoped so the prose and the diagram can share it,
   which means it outlives a component. */
beforeEach(() => {
  highlight.hoverLetter(null)
  highlight.hoverStep(null)
})

const drawn = { timeout: 20_000 }

const letters = (container: HTMLElement) => [...container.querySelectorAll(".letter")]
const lit = (container: HTMLElement, selector: string) =>
  [...container.querySelectorAll(selector)].filter((el) => el.classList.contains("lit"))

describe("Algorithm.svelte", () => {
  it("writes the algorithm and its steps in Knuth's naming", async () => {
    const { container } = render(AlgorithmHarness)

    expect(container.textContent).toContain("Algorithm F")
    expect([...container.querySelectorAll(".steps li b")].map((b) => b.textContent)).toEqual([
      "F1.",
      "F2.",
      "F3.",
      "E1.",
    ])
  })

  /* The point of the highlight: every step of Algorithm F is named F-something,
     and pointing at one letter shows the rest of the family. */
  it("lights every letter of the algorithm when one is hovered", async () => {
    const { container } = render(AlgorithmHarness)

    await userEvent.hover(letters(container)[2])

    expect(lit(container, ".letter").map((el) => el.textContent)).toEqual(["F", "F", "F", "F"])
  })

  it("leaves another algorithm's letters alone", async () => {
    const { container } = render(AlgorithmHarness)

    await userEvent.hover(letters(container)[2])

    /* Four for Algorithm F — its name and its three steps — out of six, the
       other two belonging to Algorithm E. */
    expect(lit(container, ".letter")).toHaveLength(4)
    expect(container.querySelectorAll(".letter")).toHaveLength(6)
  })

  it("lights the letters of whichever algorithm is hovered", async () => {
    const { container } = render(AlgorithmHarness)

    await userEvent.hover(letters(container).at(-1)!)

    expect(lit(container, ".letter").map((el) => el.textContent)).toEqual(["E", "E"])
  })

  it("clears the letters once the pointer leaves", async () => {
    const { container } = render(AlgorithmHarness)

    await userEvent.hover(letters(container)[2])
    await userEvent.unhover(letters(container)[2])

    expect(lit(container, ".letter")).toHaveLength(0)
  })

  it("lights only the step being pointed at", async () => {
    const { container } = render(AlgorithmHarness)

    await userEvent.hover(container.querySelectorAll(".steps li")[1])

    expect(lit(container, ".steps li").map((el) => el.textContent?.trim().slice(0, 3))).toEqual([
      "F2.",
    ])
  })
})

describe("Algorithm.svelte linked to a diagram", () => {
  const node = (container: HTMLElement, step: string) =>
    container.querySelector(`[id*="flowchart-${step}-"]`)

  it("lights the step when its node is hovered", async () => {
    const { container } = render(AlgorithmHarness, { withDiagram: true })

    await expect.poll(() => node(container, "F3"), drawn).toBeTruthy()
    await userEvent.hover(node(container, "F3")!)

    expect(lit(container, ".steps li").map((el) => el.textContent?.trim().slice(0, 3))).toEqual([
      "F3.",
    ])
  })

  it("lights the node when its step is hovered", async () => {
    const { container } = render(AlgorithmHarness, { withDiagram: true })

    await expect.poll(() => node(container, "F1"), drawn).toBeTruthy()
    await userEvent.hover(container.querySelectorAll(".steps li")[0])

    await expect.poll(() => node(container, "F1")?.classList.contains("lit")).toBe(true)
    expect(node(container, "F2")?.classList.contains("lit")).toBe(false)
  })

  it("clears the node once the pointer leaves the step", async () => {
    const { container } = render(AlgorithmHarness, { withDiagram: true })

    await expect.poll(() => node(container, "F1"), drawn).toBeTruthy()
    const step = container.querySelectorAll(".steps li")[0]
    await userEvent.hover(step)
    await expect.poll(() => node(container, "F1")?.classList.contains("lit")).toBe(true)

    await userEvent.unhover(step)

    await expect.poll(() => node(container, "F1")?.classList.contains("lit")).toBe(false)
  })
})
