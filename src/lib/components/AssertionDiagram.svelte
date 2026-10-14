<script lang="ts">
  import Mermaid from "./Mermaid.svelte"
  import Tex from "./Tex.svelte"
  import { chart, obligationTex, obligations, parse } from "$lib/assertions/flow"

  let { initial = "" }: { initial?: string } = $props()

  /* Like the formula tool's opening lines, the opening algorithm is content the
     reader then edits, so it is read once. */
  // svelte-ignore state_referenced_locally
  let source = $state(initial)

  const flow = $derived(parse(source))
  const diagram = $derived(chart(flow))
  const stepIds = $derived(new Set(flow.steps.map((step) => step.id)))

  let wrapper: HTMLElement | undefined = $state()

  type Shown = { id: string; x: number; y: number; side: "left" | "right" }

  /* Hovering shows a step for as long as the pointer is on it; clicking pins it,
     which is the only way to see one on a touch screen. */
  let hovered = $state<Shown | null>(null)
  let pinned = $state<Shown | null>(null)
  const shown = $derived(hovered ?? pinned)

  /* A redrawn diagram puts every node somewhere new, and may have dropped the
     step altogether, so neither survives an edit. */
  $effect(() => {
    void diagram
    hovered = null
    pinned = null
  })

  const proof = $derived(shown && stepIds.has(shown.id) ? obligations(flow, shown.id) : [])

  const lit = $derived.by(() => {
    if (!shown) return []
    const ids = [shown.id, ...proof.flatMap(({ pre, post }) => [pre, post])]
    return ids.filter((id, i): id is string => id !== null && ids.indexOf(id) === i)
  })

  /* Measured against the wrapper, so the note sits beside the box it belongs to
     wherever the diagram has scrolled to: on whichever side has more room, and
     never over the step below, which is usually the next thing to look at. */
  function place(id: string, element: Element): Shown | null {
    if (!stepIds.has(id) || !wrapper) return null
    const box = element.getBoundingClientRect()
    const frame = wrapper.getBoundingClientRect()
    const right = box.left + box.width / 2 - frame.left < frame.width / 2
    return {
      id,
      x: right ? box.right - frame.left + 8 : box.left - frame.left - 8,
      y: box.top - frame.top + box.height / 2,
      side: right ? "right" : "left",
    }
  }

  function grow(node: HTMLTextAreaElement) {
    node.style.height = "auto"
    const style = getComputedStyle(node)
    const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
    node.style.height = `${node.scrollHeight + border}px`
  }
</script>

<div class="tool">
  <textarea
    class="source mono"
    spellcheck="false"
    autocapitalize="off"
    autocomplete="off"
    aria-label="Algorithm"
    rows={source.split("\n").length}
    oninput={(event) => grow(event.currentTarget)}
    {@attach grow}
    bind:value={source}></textarea>

  {#if flow.errors.length}
    <ul class="errors">
      {#each flow.errors as error, i (i)}
        <li>{error}</li>
      {/each}
    </ul>
  {/if}

  <div class="diagram" bind:this={wrapper}>
    <Mermaid
      chart={diagram}
      {lit}
      onnodehover={(node) => (hovered = node && place(node.id, node.element))}
      onnodeclick={(node) => {
        const next = place(node.id, node.element)
        pinned = pinned && next && pinned.id === next.id ? null : next
      }}
    />

    {#if shown}
      <div
        class="obligations"
        role="status"
        aria-label="{shown.id} proof"
        class:before={shown.side === "left"}
        style:left="{shown.x}px"
        style:top="{shown.y}px"
      >
        {#each proof as obligation, i (i)}
          <div><Tex tex={obligationTex(obligation)} /></div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .tool {
    margin: 0 0 1.4em;
  }

  .source {
    display: block;
    width: 100%;
    max-width: 72ch;
    resize: none;
    overflow: hidden;
  }

  .errors {
    margin: 0.5em 0 0;
    padding-left: 1.2em;
    color: var(--danger);
    font-size: 0.85rem;
  }

  .diagram {
    position: relative;
  }

  .diagram :global(g.node) {
    cursor: pointer;
  }

  .obligations {
    position: absolute;
    z-index: 2;
    transform: translateY(-50%);
    max-width: min(90vw, 36rem);
    padding: 6px 12px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--surface);
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.12);
    white-space: nowrap;
    pointer-events: none;
  }

  .obligations.before {
    transform: translate(-100%, -50%);
  }

  .obligations:empty {
    display: none;
  }
</style>
