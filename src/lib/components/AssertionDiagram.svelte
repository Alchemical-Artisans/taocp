<script lang="ts">
  import Mermaid from "./Mermaid.svelte"
  import Tex from "./Tex.svelte"
  import {
    DEFAULT_LETTER,
    END,
    START,
    build,
    chart,
    letterError,
    links,
    obligationTex,
    obligations,
    type Assertion,
  } from "$lib/assertions/flow"

  type Props = {
    /** The algorithm's letter, X unless the page asks for another. */
    letter?: string
    /** Its steps, in order. */
    steps?: string[]
    /**
     * What is said on each arrow, in the order the arrows are read: the one
     * from Start, then each step's arrows out in turn.
     */
    assertions?: string[]
  }

  let {
    letter: initialLetter = DEFAULT_LETTER,
    steps: initialSteps = [],
    assertions: initialAssertions = [],
  }: Props = $props()

  /* Like the formula tool's opening lines, the opening algorithm is content the
     reader then edits, so it is read once. */
  // svelte-ignore state_referenced_locally
  let letter = $state(initialLetter)
  /* The letter the steps are named by: the reader's, once it is one that can
     letter an algorithm, and the last such until then. */
  // svelte-ignore state_referenced_locally
  let named = $state(initialLetter.trim().toUpperCase())
  // svelte-ignore state_referenced_locally
  let steps = $state(initialSteps.map((text, key) => ({ key, text })))
  let nextKey = steps.length

  /* What the reader has said on each arrow, by the arrow's key. An arrow that
     goes away keeps its words here, so they come back if it does. */
  // svelte-ignore state_referenced_locally
  let said: Record<string, string> = $state(
    Object.fromEntries(
      build(letter, steps).assertions.map((a, i) => [a.key, initialAssertions[i] ?? ""]),
    ),
  )

  const flow = $derived(build(letter, steps, said, named))
  const diagram = $derived(chart(flow))
  const stepIds = $derived(new Set(flow.steps.map((step) => step.id)))

  /* Each assertion is listed under the step its arrow leaves, the one from
     Start above them all, so the list reads as the diagram does. */
  const leaving = $derived.by(() => {
    const by: Record<string, Assertion[]> = {}
    for (const assertion of flow.assertions) (by[assertion.from] ??= []).push(assertion)
    return by
  })

  /**
   * A new letter renames the steps, so "go back to E1" in a step's text is
   * renamed with them; anything else the reader wrote is left alone. Clearing
   * the box on the way to a new letter renames nothing: the steps keep the old
   * one until the new one arrives.
   */
  function setLetter(value: string) {
    letter = value
    if (letterError(value)) return
    const before = named
    const after = value.trim().toUpperCase()
    named = after
    if (after === before) return
    const reference = new RegExp(`\\b${before}(\\d+)\\b`, "g")
    for (const step of steps) step.text = step.text.replace(reference, `${after}$1`)
  }

  /**
   * Hold a box open to exactly what it holds, as the formula tool does, so a
   * step written over several lines reads without scrolling inside a frame one
   * line tall. Takes the text so it runs again whenever the text changes,
   * including when a change of letter rewrites it.
   */
  function fit(text: string) {
    return (node: HTMLTextAreaElement) => {
      void text
      node.style.height = "auto"
      /* `scrollHeight` leaves out the border, which `border-box` counts. */
      const style = getComputedStyle(node)
      const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
      node.style.height = `${node.scrollHeight + border}px`
    }
  }

  function addStep() {
    steps.push({ key: nextKey++, text: "" })
  }

  /* Removing a step renumbers the steps after it. What the reader wrote is left
     as it was rather than being rewritten underneath them, as the rule table in
     1.1 treats its stage numbers. */
  function removeStep(index: number) {
    steps.splice(index, 1)
  }

  const SVG = "http://www.w3.org/2000/svg"

  /* Each diagram on a page needs its own marker ids, or every arrowhead would
     point at the first diagram's. */
  const markerPrefix = `assertion-arrow-${Math.random().toString(36).slice(2, 8)}`

  /**
   * Draw the lines between steps and assertions over Mermaid's layout. Each
   * runs from the right of whatever is on the algorithm's side to the left of
   * the assertion, or back; the assertion's postcondition line meets it above
   * its middle and its precondition line below, so the two do not merge.
   */
  function decorate(svg: SVGSVGElement) {
    for (const node of svg.querySelectorAll("g.node")) {
      const id = node.id.match(/-flowchart-(.+)-\d+$/)?.[1]
      if (id === START) reshapeTerminal(node, "down")
      if (id === END) reshapeTerminal(node, "up")
    }
    drawLinks(svg)
  }

  /**
   * Redraw Start or End as a triangle about as tall as an equilateral one, with
   * its label in the wide end. Mermaid draws its triangles as tall as they are
   * wide and centres the label where they have narrowed, so a readable label
   * makes a huge triangle. The tip stays where Mermaid put it, since that is
   * where its arrow meets the node.
   */
  function reshapeTerminal(node: Element, pointing: "down" | "up") {
    if (node.querySelector(":scope > polygon.terminal")) return
    const outline = node.querySelector(":scope > g.outer-path, :scope > path, :scope > polygon")
    const label = node.querySelector<SVGGElement>(":scope > g.label")
    const text = label?.querySelector("foreignObject")
    if (!(outline instanceof SVGGraphicsElement) || !label || !text) return

    const paths = [...outline.querySelectorAll("path, polygon")]
    const fill = paths.map((p) => p.getAttribute("fill")).find((f) => f && f !== "none")
    const stroke = paths.map((p) => p.getAttribute("stroke")).find((f) => f && f !== "none")
    const half = outline.getBBox().height / 2

    const labelWidth = Number(text.getAttribute("width"))
    const labelHeight = Number(text.getAttribute("height"))
    /* Wide enough that the label clears both sides at the edge of its band
       nearest the tip, with a margin of `inset` all round. */
    const inset = 5
    const base = labelWidth + 2 * inset + (labelHeight + inset) / Math.sin(Math.PI / 3)
    const height = Math.min((base * Math.sqrt(3)) / 2, 2 * half)

    const tip = pointing === "down" ? half : -half
    const baseY = pointing === "down" ? half - height : -half + height
    const towardTip = pointing === "down" ? 1 : -1
    const labelCentre = baseY + towardTip * (inset + labelHeight / 2)

    const triangle = document.createElementNS(SVG, "polygon")
    triangle.classList.add("terminal")
    triangle.setAttribute("points", `0,${tip} ${-base / 2},${baseY} ${base / 2},${baseY}`)
    if (fill) triangle.setAttribute("fill", fill)
    if (stroke) triangle.setAttribute("stroke", stroke)
    triangle.setAttribute("stroke-width", "1.3")

    outline.remove()
    node.prepend(triangle)
    label.setAttribute(
      "transform",
      `translate(${-labelWidth / 2}, ${labelCentre - labelHeight / 2})`,
    )
  }

  function drawLinks(svg: SVGSVGElement) {
    svg.querySelector("g.assertion-links")?.remove()
    const toSvg = svg.getScreenCTM()?.inverse()
    if (!toSvg) return

    const nodes: Record<string, Element> = {}
    for (const node of svg.querySelectorAll("g.node")) {
      const id = node.id.match(/-flowchart-(.+)-\d+$/)?.[1]
      if (id) nodes[id] = node
    }

    const box = (element: Element) => {
      const r = element.getBoundingClientRect()
      const corner = (x: number, y: number) => new DOMPoint(x, y).matrixTransform(toSvg)
      const a = corner(r.left, r.top)
      const b = corner(r.right, r.bottom)
      return { left: a.x, right: b.x, top: a.y, bottom: b.y }
    }

    const group = document.createElementNS(SVG, "g")
    group.classList.add("assertion-links")
    const defs = document.createElementNS(SVG, "defs")
    const marker = document.createElementNS(SVG, "marker")
    marker.id = markerPrefix
    for (const [name, value] of Object.entries({
      viewBox: "0 0 10 10",
      refX: "9",
      refY: "5",
      markerWidth: "7",
      markerHeight: "7",
      orient: "auto-start-reverse",
    }))
      marker.setAttribute(name, value)
    const head = document.createElementNS(SVG, "path")
    head.setAttribute("d", "M 0 0 L 10 5 L 0 10 z")
    marker.append(head)
    defs.append(marker)
    group.append(defs)

    for (const link of links(flow)) {
      const fromNode = nodes[link.from]
      const toNode = nodes[link.to]
      if (!fromNode || !toNode) continue
      const toAssertion = link.style === "dotted"
      const step = box(toAssertion ? fromNode : toNode)
      const assertion = box(toAssertion ? toNode : fromNode)

      /* Start and End are triangles, whose sides at mid-height are a quarter
         of their width in from the corners of the box around them. */
      const stepId = toAssertion ? link.from : link.to
      const inset = stepId === START || stepId === END ? (step.right - step.left) / 4 : 0
      const stepPoint = { x: step.right - inset, y: (step.top + step.bottom) / 2 }
      const height = assertion.bottom - assertion.top
      const assertionPoint = {
        x: assertion.left,
        y: assertion.top + height * (toAssertion ? 1 / 3 : 2 / 3),
      }
      const [start, end] = toAssertion ? [stepPoint, assertionPoint] : [assertionPoint, stepPoint]
      const bend = Math.max(Math.abs(end.x - start.x) / 2, 24)
      const outward = toAssertion ? 1 : -1

      const path = document.createElementNS(SVG, "path")
      path.setAttribute(
        "d",
        `M ${start.x} ${start.y} C ${start.x + outward * bend} ${start.y}, ` +
          `${end.x - outward * bend} ${end.y}, ${end.x} ${end.y}`,
      )
      path.classList.add(link.style)
      path.dataset.from = link.from
      path.dataset.to = link.to
      path.setAttribute("marker-end", `url(#${markerPrefix})`)
      group.append(path)
    }

    svg.append(group)
  }

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
</script>

<div class="tool">
  <p class="letter">
    <label>
      Algorithm
      <input
        class="mono"
        type="text"
        maxlength="1"
        autocapitalize="characters"
        autocomplete="off"
        spellcheck="false"
        aria-label="Letter"
        value={letter}
        oninput={(event) => setLetter(event.currentTarget.value)}
      />
    </label>
  </p>

  {#snippet assertionRow(assertion: Assertion)}
    <li class="assertion">
      <span class="name mono">{assertion.id}</span>
      <span class="arrow mono">[{assertion.from} &rArr; {assertion.to}]</span>
      <textarea
        class="text mono"
        rows="1"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-label={assertion.id}
        value={said[assertion.key] ?? ""}
        oninput={(event) => (said[assertion.key] = event.currentTarget.value)}
        {@attach fit(said[assertion.key] ?? "")}></textarea>
    </li>
  {/snippet}

  <ol class="rows">
    {#each leaving[START] ?? [] as assertion (assertion.key)}
      {@render assertionRow(assertion)}
    {/each}
    {#each steps as step, index (step.key)}
      {@const name = flow.steps[index].id}
      <li>
        <span class="name mono">{name}.</span>
        <textarea
          class="text mono"
          rows="1"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          aria-label={name}
          bind:value={step.text}
          {@attach fit(step.text)}></textarea>
        <button
          type="button"
          class="tool-button"
          aria-label="Remove {name}"
          onclick={() => removeStep(index)}>&times;</button
        >
      </li>
      {#each leaving[name] ?? [] as assertion (assertion.key)}
        {@render assertionRow(assertion)}
      {/each}
    {/each}
  </ol>

  <p class="controls">
    <button type="button" class="tool-button" onclick={addStep}>Add step</button>
  </p>

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
      onrender={decorate}
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

  .letter label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }

  .letter input {
    width: 2.5em;
    text-align: center;
    text-transform: uppercase;
  }

  .rows {
    list-style: none;
    margin: 0 0 0.6em;
    padding: 0;
    max-width: none;
  }

  /* One line a row: the label in a fixed column so the inputs line up, the
     arrow an assertion sits on, then what it says. */
  /* Aligned to the top, so a label stays beside the first line of a box that
     has grown over several. */
  .rows li {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.4rem;
    margin-bottom: 0.4em;
  }

  /* Indented, so the steps read as the algorithm and the assertions as what is
     said between them. */
  .rows li.assertion {
    padding-left: 1.5rem;
  }

  .name {
    flex: 0 0 2.6em;
    font-weight: 600;
  }

  .arrow {
    font-size: 0.85rem;
    color: var(--ink-soft);
    white-space: nowrap;
  }

  /* Assertion rows have no remove button, since there is one for every arrow
     however many that is; the gap keeps their inputs flush with the steps'. */
  .rows li.assertion::after {
    content: "";
    flex: 0 0 2.1rem;
  }

  /* Grown to its content by `fit`, so it never scrolls inside itself and never
     offers a resize handle that would fight the measurement. */
  .text {
    flex: 1 1 16rem;
    min-width: 0;
    resize: none;
    overflow: hidden;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
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
  .tool-button:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .tool-button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
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

  /* Each label here is a single expression, its prose set as text, so it needs
     none of the room Mermaid.svelte gives maths beside prose; Mermaid does not
     count that room when sizing the box, so it would clip the label. */
  /* Mermaid sizes a label's frame from a measurement that can come up a few
     pixels short of the typeset maths; showing the overflow costs nothing,
     as the box around it has padding to spare. */
  .diagram :global(.mermaid foreignObject) {
    overflow: visible;
  }

  .diagram :global(.mermaid .nodeLabel .katex),
  .diagram :global(.mermaid .edgeLabel .katex) {
    margin: 0;
  }

  .diagram :global(g.node) {
    cursor: pointer;
  }

  /* Assertions are bare text. !important because Mermaid styles its nodes from
     a stylesheet keyed on the render's id, which outranks anything here. Lit,
     they take the outline every other lit node does. */
  .diagram :global(g.node.bare rect) {
    fill: none !important;
    stroke: none !important;
  }
  .diagram :global(g.node.bare.lit rect) {
    stroke: var(--accent) !important;
    stroke-width: 3px !important;
  }

  /* Drawn in the diagram's own line colour, under the same rules as its edges:
     dotted out of a step to what it guarantees, dashed into a step from what
     it needs. */
  .diagram :global(g.assertion-links path) {
    fill: none;
    stroke: var(--ink-soft);
    stroke-width: 1.5px;
  }
  .diagram :global(g.assertion-links marker path) {
    fill: var(--ink-soft);
    stroke: none;
  }
  .diagram :global(g.assertion-links path.dotted) {
    stroke-dasharray: 1 5;
    stroke-linecap: round;
  }
  .diagram :global(g.assertion-links path.dashed) {
    stroke-dasharray: 8 5;
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
