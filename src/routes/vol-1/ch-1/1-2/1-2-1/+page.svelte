<script lang="ts">
  import FormulaTable from "$lib/components/FormulaTable.svelte"
  import { trace } from "$lib/algorithms/extended-euclid/trace"

  let m: number | null = $state(1769)
  let n: number | null = $state(551)

  const steps = $derived(isPositiveInteger(m) && isPositiveInteger(n) ? trace(m, n) : null)

  function isPositiveInteger(value: number | null): value is number {
    return value !== null && Number.isInteger(value) && value > 0
  }

  /* Written over four lines rather than one: a case analysis is the formula a
    reader is most likely to want broken up, so the tool opens showing that it
    can be. */
  const recurrence = [
    "\\begin{cases}",
    "  0 & x = 0 \\\\",
    "  2h(x-1) + 1 & x > 0",
    "\\end{cases}",
  ].join("\n")

  /* A recurrence, a closed form to test against it, and the summation they both
    come from — the shape of every induction argument in the section, so the
    tool opens on one rather than on an empty field. */
  const openingFormulas = ["x^2", "2x - 1", "\\sum_{k=1}^{x} g(k)", recurrence]
</script>

<h2 id="closed-forms">Closed Forms</h2>

<p>
  An important theme of induction is determining closed forms from recursive functions and
  summations. This is a tool where you can use $T_EX$ notation to describe these and see how
  different values play out.
</p>

<FormulaTable initial={openingFormulas} />

<h2 id="extended-euclids-algorithm">Extended Euclid's Algorithm</h2>

<div class="inputs">
  <label>$m$ <input name="m" type="number" aria-label="m" bind:value={m} /></label>
  <label>$n$ <input name="n" type="number" aria-label="n" bind:value={n} /></label>
</div>

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
      {#each steps as step (step.c)}
        <tr class:result={step.r === 0}>
          <td>{step.a_prime}</td>
          <td>{step.a}</td>
          <td>{step.b_prime}</td>
          <td>{step.b}</td>
          <td>{step.c}</td>
          <td>{step.d}</td>
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

<style>
  .inputs {
    display: flex;
    gap: 1.2rem;
    margin-bottom: 0.8rem;
  }

  .inputs input {
    width: 6rem;
  }

  table.trace {
    max-width: 100%;
  }

  table.trace td,
  table.trace th {
    padding: 4px 10px;
    text-align: right;
  }

  tr.result {
    font-weight: 700;
    color: var(--accent);
  }

  .validation-error {
    text-align: left;
  }
</style>
