import { page, userEvent } from "vitest/browser"
import { describe, expect, it } from "vitest"
import { render } from "vitest-browser-svelte"
import CodeTabsHarness from "./CodeTabsHarness.svelte"

describe("CodeTabs.svelte", () => {
  it("labels each tab with the name of the snippet it was given", async () => {
    render(CodeTabsHarness)

    await expect.element(page.getByRole("tab", { name: "Faithful" })).toBeInTheDocument()
    await expect.element(page.getByRole("tab", { name: "Idiomatic" })).toBeInTheDocument()
  })

  it("selects the first tab and hides the rest", async () => {
    render(CodeTabsHarness)

    await expect
      .element(page.getByRole("tab", { name: "Faithful" }))
      .toHaveAttribute("aria-selected", "true")
    await expect
      .element(page.getByRole("tab", { name: "Idiomatic" }))
      .toHaveAttribute("aria-selected", "false")
    await expect.element(page.getByRole("tabpanel")).toHaveTextContent("while (true)")
  })

  it("shows the other panel once its tab is clicked", async () => {
    render(CodeTabsHarness)

    await page.getByRole("tab", { name: "Idiomatic" }).click()

    await expect.element(page.getByRole("tabpanel")).toHaveTextContent("euclids_algorithm(n, r)")
    await expect.element(page.getByRole("tabpanel")).not.toHaveTextContent("while (true)")
  })

  it("moves between tabs with the arrow keys", async () => {
    render(CodeTabsHarness)

    await page.getByRole("tab", { name: "Faithful" }).click()
    await userEvent.keyboard("{ArrowRight}")

    await expect
      .element(page.getByRole("tab", { name: "Idiomatic" }))
      .toHaveAttribute("aria-selected", "true")

    await userEvent.keyboard("{ArrowRight}")

    await expect
      .element(page.getByRole("tab", { name: "Faithful" }))
      .toHaveAttribute("aria-selected", "true")
  })

  it("syntax highlights the code it renders", async () => {
    const { container } = render(CodeTabsHarness)

    await expect.element(page.getByRole("tabpanel")).toBeInTheDocument()
    await expect.poll(() => container.querySelectorAll(".hljs-keyword").length).toBeGreaterThan(0)
    expect(container.querySelector(".hljs-comment")?.textContent).toBe("// E1")
  })
})
