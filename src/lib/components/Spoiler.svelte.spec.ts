import { page, userEvent } from "vitest/browser"
import { describe, expect, it } from "vitest"
import { render } from "vitest-browser-svelte"
import SpoilerHarness from "./SpoilerHarness.svelte"

describe("Spoiler.svelte", () => {
  it("keeps the answer hidden until it is asked for", async () => {
    render(SpoilerHarness)

    await expect.element(page.getByText("Exercise 1. Prove it.")).toBeVisible()
    await expect.element(page.getByText("remainder strictly decreases")).not.toBeVisible()
  })

  it("calls itself a solution by default", async () => {
    render(SpoilerHarness)

    await expect.element(page.getByText("Solution")).toBeVisible()
  })

  it("takes a label for exercises that need a different one", async () => {
    render(SpoilerHarness, { label: "Hint" })

    await expect.element(page.getByText("Hint")).toBeVisible()
  })

  it("reveals the answer when the summary is clicked", async () => {
    render(SpoilerHarness)

    await page.getByText("Solution").click()

    await expect.element(page.getByText("remainder strictly decreases")).toBeVisible()
  })

  it("hides it again on a second click", async () => {
    render(SpoilerHarness)

    await page.getByText("Solution").click()
    await expect.element(page.getByText("remainder strictly decreases")).toBeVisible()

    await page.getByText("Solution").click()
    await expect.element(page.getByText("remainder strictly decreases")).not.toBeVisible()
  })

  it("opens from the keyboard", async () => {
    render(SpoilerHarness)

    await userEvent.keyboard("{Tab}")
    await userEvent.keyboard("{Enter}")

    await expect.element(page.getByText("remainder strictly decreases")).toBeVisible()
  })

  it("can start open where the answer is the point", async () => {
    render(SpoilerHarness, { open: true })

    await expect.element(page.getByText("remainder strictly decreases")).toBeVisible()
  })

  /* A block spoiler is a `details`, which a paragraph may not contain, so a
     word hidden mid-sentence takes the inline form instead. */
  it("hides an inline phrase without breaking the sentence", async () => {
    const { container } = render(SpoilerHarness, { inline: true })

    expect(container.querySelector("p")?.textContent).toContain("each round")
    expect(container.querySelector("details")).toBeNull()
  })

  it("names an unrevealed inline spoiler rather than reading it out", async () => {
    const { container } = render(SpoilerHarness, { inline: true })

    await expect.element(page.getByRole("button", { name: "Reveal solution" })).toBeInTheDocument()
    expect(container.querySelector(".inline span")).toHaveAttribute("aria-hidden", "true")
  })

  it("reveals an inline phrase when clicked", async () => {
    const { container } = render(SpoilerHarness, { inline: true })

    await page.getByRole("button", { name: "Reveal solution" }).click()

    expect(container.querySelector(".inline")).toHaveClass("revealed")
    expect(container.querySelector(".inline span")).toHaveAttribute("aria-hidden", "false")
  })

  it("takes a label for an inline hint too", async () => {
    render(SpoilerHarness, { inline: true, label: "Hint" })

    await expect.element(page.getByRole("button", { name: "Reveal hint" })).toBeInTheDocument()
  })

  it("can start an inline spoiler revealed", async () => {
    const { container } = render(SpoilerHarness, { inline: true, open: true })

    expect(container.querySelector(".inline")).toHaveClass("revealed")
  })
})
