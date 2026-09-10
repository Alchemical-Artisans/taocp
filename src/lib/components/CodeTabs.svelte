<script lang="ts">
  import type { Snippet } from "svelte"
  import hljs from "highlight.js/lib/core"
  import typescript from "highlight.js/lib/languages/typescript"
  import "./code-tabs.css"

  hljs.registerLanguage("typescript", typescript)

  type Props = { language?: string } & Record<string, Snippet>

  let { language = "typescript", ...tabs }: Props = $props()

  const names = $derived(Object.keys(tabs))

  let active = $state("")
  const current = $derived(names.includes(active) ? active : names[0])

  /* Panels are all rendered, hidden ones included, so each snippet is highlighted
     once on mount rather than every time a tab is selected. */
  let panels: Record<string, HTMLElement | undefined> = $state({})

  $effect(() => {
    for (const name of names) {
      const el = panels[name]
      if (!el || el.dataset.highlighted) continue
      el.innerHTML = hljs.highlight(dedent(el.textContent ?? ""), { language }).value
      el.dataset.highlighted = "yes"
    }
  })

  /* A snippet may render a whole source file or an excerpt lifted out of one,
     so trim the surrounding blank lines and any indentation shared by every line. */
  function dedent(source: string): string {
    const lines = source.replace(/\t/g, "  ").split("\n")
    while (lines.length && lines[0].trim() === "") lines.shift()
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop()

    const indent = Math.min(
      ...lines.filter((line) => line.trim() !== "").map((line) => line.match(/^ */)![0].length),
    )
    return lines.map((line) => line.slice(indent)).join("\n")
  }

  function label(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  function onkeydown(event: KeyboardEvent) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const next = names[(names.indexOf(current) + step + names.length) % names.length]
    active = next
    document.getElementById(`tab-${next}`)?.focus()
  }
</script>

<div class="code-tabs">
  <div class="tablist" role="tablist">
    {#each names as name (name)}
      <button
        id="tab-{name}"
        type="button"
        role="tab"
        aria-selected={name === current}
        aria-controls="panel-{name}"
        tabindex={name === current ? 0 : -1}
        onclick={() => (active = name)}
        {onkeydown}
      >
        {label(name)}
      </button>
    {/each}
  </div>

  {#each names as name (name)}
    <div id="panel-{name}" role="tabpanel" aria-labelledby="tab-{name}" hidden={name !== current}>
      <pre><code bind:this={panels[name]}>{@render tabs[name]()}</code></pre>
    </div>
  {/each}
</div>

<style>
  .code-tabs {
    max-width: 68ch;
    margin: 0 0 1.4em;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    overflow: hidden;
  }

  .tablist {
    display: flex;
    gap: 2px;
    border-bottom: 1px solid var(--line);
    background: var(--rail);
    padding: 0 6px;
  }

  .tablist button {
    appearance: none;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    padding: 9px 14px;
    font-family: "Libre Franklin", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.74rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-faint);
    cursor: pointer;
  }

  .tablist button:hover {
    color: var(--ink-soft);
  }

  .tablist button[aria-selected="true"] {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .tablist button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  pre {
    margin: 0;
    padding: 16px 18px;
    overflow-x: auto;
    font-family: "Space Mono", ui-monospace, monospace;
    font-size: 0.82rem;
    line-height: 1.65;
    tab-size: 2;
  }

  [hidden] {
    display: none;
  }

  code {
    font: inherit;
  }
</style>
