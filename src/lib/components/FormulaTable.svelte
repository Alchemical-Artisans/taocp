<script lang="ts">
  import { onMount } from "svelte"
  import Tex from "./Tex.svelte"
  import { NAMES, VARIABLE } from "$lib/formulas/names"
  import type { Cell, FormulaEntry, Tabulate, Tabulation } from "$lib/formulas/tabulate"

  let { initial = [] }: { initial?: string[] } = $props()

  /* The opening formulas are content the reader then edits, not state the page
     keeps feeding in, so they are read once. */
  // svelte-ignore state_referenced_locally
  let entries = $state(initial.slice(0, NAMES.length).map((tex, id) => ({ id, tex })))
  let nextId = entries.length
  let start: number | null = $state(1)

  /* The algebra engine is a much larger download than the page it serves, so it
     is fetched after the page rather than with it. The formulas themselves
     typeset either way — KaTeX is small enough to come along with the page —
     so it is only the values that wait. */
  let tabulate = $state<Tabulate | null>(null)

  onMount(async () => {
    tabulate = (await import("$lib/formulas/tabulate")).tabulate
  })

  const tabulation: Tabulation | null = $derived(
    tabulate?.(
      entries.map((entry) => entry.tex),
      { from: startValue(start) },
    ) ?? null,
  )

  const columns = $derived(
    (tabulation?.entries ?? []).filter((entry): entry is FormulaEntry => entry.kind === "formula"),
  )

  const columnFailures = $derived(columns.map(sharedError))

  /* Ten values are cheap, but a summation whose upper limit is the variable is
     not: the work grows with where the table starts, so the start is held
     inside a range a keystroke can afford. */
  const START_LIMIT = 1000

  function startValue(value: number | null): number {
    if (value === null || !Number.isInteger(value)) return 1
    return Math.min(Math.max(value, -START_LIMIT), START_LIMIT)
  }

  /** `f(x)`, `g(x)` — how a line is labelled, and how another line calls it. */
  function signature(name: string): string {
    return `${name}(${VARIABLE})`
  }

  function addEntry() {
    entries.push({ id: nextId++, tex: "" })
  }

  /**
   * Hold a box open to exactly what it holds. A formula worth writing over
   * several lines — a case analysis usually is — should be readable without
   * scrolling inside a frame two lines tall.
   */
  function grow(node: HTMLTextAreaElement) {
    node.style.height = "auto"
    /* `scrollHeight` measures padding and content but not the border, while
       `box-sizing: border-box` makes the height we set include it — so without
       this the box ends up a border short and scrolls by exactly that. */
    const style = getComputedStyle(node)
    const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
    node.style.height = `${node.scrollHeight + border}px`
  }

  /* A line's name comes from its position, so removing one renames every line
     below it. The bodies are left as the reader typed them rather than being
     rewritten underneath them, which matches how the rule table in 1.1 treats
     its stage numbers. */
  function removeEntry(index: number) {
    entries.splice(index, 1)
  }

  /**
   * A line that calls a blank one, or a recurrence with no reachable base case,
   * fails in every cell of its column. That is one thing to tell the reader
   * rather than ten, so it is said once above the column and the cells are left
   * empty.
   */
  function sharedError(entry: FormulaEntry): string | null {
    const first = entry.cells[0]
    if (first?.kind !== "error") return null
    return entry.cells.every((cell) => cell.kind === "error") ? first.message : null
  }

  function cellOf(entry: FormulaEntry, row: number): Cell {
    return entry.cells[row]
  }
</script>

<div class="tool">
  <ul class="entries">
    {#each entries as entry, index (entry.id)}
      {@const name = NAMES[index]}
      {@const result = tabulation?.entries[index]}
      <li>
        <div class="entry-row">
          <span class="entry-name" aria-hidden="true"><Tex tex="{signature(name)} =" /></span>
          <textarea
            class="tex-input mono"
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            aria-label={signature(name)}
            placeholder={"\\sum_{k=1}^{x} k"}
            rows={entry.tex.split("\n").length}
            oninput={(event) => grow(event.currentTarget)}
            {@attach grow}
            bind:value={entry.tex}></textarea>
          <button
            type="button"
            class="tool-button"
            aria-label="Remove {signature(name)}"
            onclick={() => removeEntry(index)}>&times;</button
          >
        </div>

        <p class="entry-note">
          {#if entry.tex.trim()}
            <Tex tex={entry.tex} />
          {/if}
          {#if result?.kind === "error"}
            <span class="entry-error">{result.message}</span>
          {:else if result?.kind === "formula"}
            {@const failure = sharedError(result)}
            {#if failure}
              <span class="entry-error">{failure}</span>
            {/if}
          {/if}
        </p>
      </li>
    {/each}
  </ul>

  <p class="controls">
    <button
      type="button"
      class="tool-button"
      disabled={entries.length >= NAMES.length}
      onclick={addEntry}>Add formula</button
    >
    <label>
      $x$ starts at
      <input
        type="number"
        step="1"
        min={-START_LIMIT}
        max={START_LIMIT}
        aria-label="First value of x"
        bind:value={start}
      />
    </label>
  </p>

  {#if !tabulation}
    <p class="entry-aside">Working out the values&hellip;</p>
  {:else if columns.length === 0}
    <p class="entry-aside">Enter a formula in $x$ to see its first ten values.</p>
  {:else}
    <div class="table-scroll">
      <table class="values">
        <thead>
          <tr>
            <th scope="col">$x$</th>
            {#each columns as column (column.name)}
              <th scope="col"><Tex tex={signature(column.name)} /></th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each tabulation.inputs as input, row (input)}
            <tr>
              <!-- Typeset like the values beside it, so the row reads as one line of maths. -->
              <th scope="row"><Tex tex={String(input)} /></th>
              {#each columns as column, j (column.name)}
                {@const cell = cellOf(column, row)}
                {@const said = cell.kind === "error" && columnFailures[j] !== null}
                <td>
                  {#if cell.kind === "value"}
                    <Tex tex={cell.latex} />
                    {#if cell.approx}
                      <span class="approx mono">&approx; {cell.approx}</span>
                    {/if}
                  {:else if cell.kind === "error" && !said}
                    <span class="entry-error">{cell.message}</span>
                  {:else}
                    <span aria-hidden="true">&mdash;</span>
                    <span class="sr-only">no value</span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .tool {
    margin: 0 0 1.4em;
  }

  .entries {
    list-style: none;
    margin: 0 0 0.9em;
    padding: 0;
    max-width: none;
  }
  .entries li {
    margin-bottom: 0.7em;
  }

  .entry-row {
    display: flex;
    gap: 0.5rem;
    align-items: start;
  }

  /* Right-aligned on a fixed width so the input boxes line up down the list
     however wide a name's typeset signature turns out to be. */
  .entry-name {
    flex: 0 0 auto;
    min-width: 4.5em;
    padding-top: 0.25em;
    text-align: right;
  }

  /* Grown to its content by `grow`, so it never scrolls inside itself and never
     offers a resize handle that would fight the measurement. */
  .tex-input {
    flex: 1 1 auto;
    min-width: 0;
    max-width: 52ch;
    resize: none;
    overflow: hidden;
  }

  /* Reserved so the typeset formula appearing under an entry does not shift the
     table every time the reader finishes a token. */
  .entry-note {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem;
    min-height: 1.9em;
    margin: 0.25em 0 0 4.5em;
    line-height: 1.5;
  }

  .entry-aside {
    color: var(--ink-faint);
    font-size: 0.85rem;
  }

  .entry-error {
    color: var(--danger);
    font-size: 0.85rem;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.9rem;
  }
  .controls label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
    color: var(--ink-soft);
  }

  /* A wide table of values scrolls rather than widening the page on a phone. */
  .table-scroll {
    overflow-x: auto;
  }

  .values tbody th {
    font-weight: 400;
    color: var(--ink-faint);
  }

  .approx {
    display: block;
    color: var(--ink-faint);
    font-size: 0.78rem;
  }

  .tool-button {
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 4px 10px;
    font: inherit;
    font-size: 0.9rem;
    cursor: pointer;
  }
  .tool-button:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }
  .tool-button:disabled {
    cursor: default;
    opacity: 0.55;
  }
  .tool-button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
</style>
