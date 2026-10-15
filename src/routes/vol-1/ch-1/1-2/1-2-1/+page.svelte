<script lang="ts">
  import FormulaTable from "$lib/components/FormulaTable.svelte"
  import Tex from "$lib/components/Tex.svelte"
  import { NAMES } from "$lib/formulas/names"
  import { trace, type Step } from "$lib/algorithms/extended-euclid/trace"
  import faithfulSource from "$lib/algorithms/extended-euclid/faithful.ts?raw"
  import idiomaticSource from "$lib/algorithms/extended-euclid/idiomatic.ts?raw"
  import CodeTabs from "$lib/components/CodeTabs.svelte"
  import AssertionDiagram from "$lib/components/AssertionDiagram.svelte"

  let m: number | null = $state(1769)
  let n: number | null = $state(551)

  const steps = $derived(isPositiveInteger(m) && isPositiveInteger(n) ? trace(m, n) : null)
  const answer = $derived(steps ? steps[steps.length - 1] : null)

  function isPositiveInteger(value: number | null): value is number {
    return value !== null && Number.isInteger(value) && value > 0
  }

  /* Written over four lines rather than one: a case analysis is the formula a
    reader is most likely to want broken up, so the tool opens showing that it
    can be. */
  const recurrence = [
    "\\begin{cases}",
    "  0 & x = 0 \\\\",
    "  2\\self(x-1) + 1 & x > 0",
    "\\end{cases}",
  ].join("\n")

  /* A recurrence, a closed form to test against it, and the summation they both
    come from — the shape of every induction argument in the section, so the
    tool opens on one rather than on an empty field.

    A line is named by its position, so `\self` stands in for the name a line
    will turn out to have: a recurrence that wrote its own name in by hand
    would come to call whichever line later took that position. */
  const openingFormulas = ["x^2", "2x - 1", "\\sum_{k=1}^{x} g(k)", recurrence].map((tex, index) =>
    tex.replaceAll("\\self", NAMES[index]),
  )

  /* The author's own sketch of the input: the steps as laid out in 1.1, and
     what holds on each arrow, read from Start and then out of each step in turn. */
  const openingSteps = ["something", "If condition, terminate", "Go back to E1"]
  const openingAssertions = [
    "Initial assertion",
    "something",
    "Final assertion",
    "something",
    "something",
  ]

  /** `a \cdot m + b \cdot n = d`, a negative coefficient written as a subtraction. */
  function bezout(step: Step, m: number, n: number): string {
    const second = step.b < 0 ? `- ${-step.b} \\cdot ${n}` : `+ ${step.b} \\cdot ${n}`
    return `${step.a} \\cdot ${m} ${second} = ${step.d}`
  }
</script>

<h2 id="closed-forms">Closed Forms</h2>

<p>
  An important theme of induction is determining closed forms from recursive functions and
  summations. This is a tool where you can use $T_EX$ notation to describe these and see how
  different values play out.
</p>

<FormulaTable initial={openingFormulas} />

<h2 id="extended-euclids-algorithm">Extended Euclid's Algorithm</h2>

<p>
  Knuth provides an extended form of Euclid's Algorithm to illustrate the concepts in this section.
  Here is a table to explore how different values behave going through that algorithm.
</p>

<div class="inputs">
  <label>$m$ <input name="m" type="number" aria-label="m" bind:value={m} /></label>
  <label>$n$ <input name="n" type="number" aria-label="n" bind:value={n} /></label>
</div>

<div class="table-scroll">
  <table class="trace">
    <thead>
      <tr>
        <th scope="col">$a'$</th>
        <th scope="col">$a$</th>
        <th scope="col">$b'$</th>
        <th scope="col">$b$</th>
        <th scope="col">$c$</th>
        <th scope="col">$d$</th>
        <th scope="col">$q$</th>
        <th scope="col">$r$</th>
      </tr>
    </thead>
    <tbody>
      {#if steps}
        <!-- Keyed by position, as the A* trace in 1.1 is: a row is its place in
             the trace and nothing else. c is not an identity — it repeats
             whenever m < n, since E2's first pass only swaps the two. -->
        {#each steps as step, i (i)}
          <!-- The last step is the one that answers: a and b are the coefficients
               and d the divisor, while the rest of that row is working like any
               other. -->
          {@const done = step.r === 0}
          <tr>
            <td>{step.a_prime}</td>
            <td class:result={done}>{step.a}</td>
            <td>{step.b_prime}</td>
            <td class:result={done}>{step.b}</td>
            <td>{step.c}</td>
            <td class:result={done}>{step.d}</td>
            <td>{step.q}</td>
            <td>{step.r}</td>
          </tr>
        {/each}
      {:else}
        <tr>
          <td colspan="8" class="validation-error">m and n must both be positive integers.</td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>

{#if answer && m !== null && n !== null}
  <ul class="answers">
    <li><Tex tex={bezout(answer, m, n)} /></li>
    <li><Tex tex={`\\gcd(${m}, ${n}) = ${answer.d}`} /></li>
  </ul>
{/if}

<h3 id="implementation">Implementation</h3>

<CodeTabs>
  {#snippet faithful()}{faithfulSource}{/snippet}
  {#snippet idiomatic()}{idiomaticSource}{/snippet}
</CodeTabs>

<h2 id="diagramming">Creating Diagrams</h2>

<p>
  To help you explore Assertions within diagrams more extensively, here is a tool to assist you in
  creating them and labelling assertions. Connect to other steps by mentioning their label (e.g. E1,
  E2, etc.). To branch, state "If condition, whatever." The word "terminate" signals the end of the
  algorithm. If you hover over or click a step in the diagram, it will show what's needed to prove
  that step.
</p>

<AssertionDiagram steps={openingSteps} assertions={openingAssertions} />

<style>
  .inputs {
    display: flex;
    gap: 1.2rem;
    margin-bottom: 0.8rem;
  }

  .inputs input {
    width: 6rem;
  }

  /* Eight columns of a reader's own m and n outgrow a phone, so the table
     scrolls rather than widening the page. */
  .table-scroll {
    overflow-x: auto;
  }

  table.trace td,
  table.trace th {
    padding: 4px 10px;
    text-align: right;
  }

  /* The two equations the table was run to find, stated over the values that
     were put in. Marked as a list so each reads as its own statement, but set
     flush and apart so neither reads as a bullet of prose. */
  .answers {
    list-style: none;
    margin: 0.2em 0 1.4em;
    padding: 0;
  }

  .answers li {
    margin: 0.35em 0;
  }

  .validation-error {
    text-align: left;
  }
</style>
