import { describe, expect, it } from "vitest"
import { render } from "vitest-browser-svelte"
import MermaidHarness from "./MermaidHarness.svelte"

/* Mermaid arrives as its own chunk and measures text before it can draw, so the
   first diagram in a run takes well past Vitest's one second default. */
const drawn = { timeout: 20_000 }

const flowchart = "graph TD\n  A[Start] --> B{Done?}\n  B -->|no| A\n  B -->|yes| C[Stop]"

describe("Mermaid.svelte", () => {
  it("renders a diagram given as a prop", async () => {
    const { container } = render(MermaidHarness, { chart: flowchart })

    await expect.poll(() => container.querySelector("figure svg"), drawn).toBeTruthy()
  })

  it("draws the nodes the source describes", async () => {
    const { container } = render(MermaidHarness, { chart: flowchart })

    await expect.poll(() => container.querySelector("figure svg"), drawn).toBeTruthy()
    expect(container.querySelector("figure svg")?.textContent).toContain("Start")
    expect(container.querySelector("figure svg")?.textContent).toContain("Stop")
  })

  it("hides the source once the diagram has drawn", async () => {
    const { container } = render(MermaidHarness, { chart: flowchart })

    await expect.poll(() => container.querySelector("figure svg"), drawn).toBeTruthy()
    expect(container.querySelector("pre.source")).toHaveAttribute("hidden")
  })

  it("shows the source until then, so a missing chunk still reads", async () => {
    const { container } = render(MermaidHarness, { chart: flowchart })

    expect(container.querySelector("pre.source")?.textContent).toContain("graph TD")
  })

  it("reports a syntax error instead of drawing nothing", async () => {
    const { container } = render(MermaidHarness, { chart: "graph TD\n  A --> --> B" })

    await expect.poll(() => container.querySelector(".failure")?.textContent, drawn).toBeTruthy()
    expect(container.querySelector("figure svg")).toBeNull()
  })

  it("keeps the source visible when the diagram fails", async () => {
    const { container } = render(MermaidHarness, { chart: "graph TD\n  A --> --> B" })

    await expect.poll(() => container.querySelector(".failure"), drawn).toBeTruthy()
    expect(container.querySelector("pre.source")).not.toHaveAttribute("hidden")
  })

  /* A diagram written between the tags loses its line breaks to Svelte's
     whitespace collapsing and to Prettier reflowing the text, so it can only be
     reported, never drawn. */
  it("refuses a diagram written between the tags", async () => {
    const { container } = render(MermaidHarness, { chart: flowchart, inline: true })

    await expect.poll(() => container.querySelector(".failure")?.textContent, drawn).toBeTruthy()
    expect(container.querySelector(".failure")?.textContent).toContain("chart={...}")
    expect(container.querySelector("figure svg")).toBeNull()
  })

  it("does not blame the tags for a genuine syntax error", async () => {
    const { container } = render(MermaidHarness, { chart: "graph TD\n  A --> --> B" })

    await expect.poll(() => container.querySelector(".failure")?.textContent, drawn).toBeTruthy()
    expect(container.querySelector(".failure")?.textContent).not.toContain("chart={...}")
  })
})
