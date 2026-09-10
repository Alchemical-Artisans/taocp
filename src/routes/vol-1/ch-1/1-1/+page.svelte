<script lang="ts">
  import CodeTabs from "$lib/components/CodeTabs.svelte"
  import { trace } from "$lib/algorithms/euclid/trace"
  import faithfulSource from "$lib/algorithms/euclid/faithful.ts?raw"
  import idiomaticSource from "$lib/algorithms/euclid/idiomatic.ts?raw"
  import Mermaid from "$lib/components/Mermaid.svelte"
  import Algorithm from "$lib/components/Algorithm.svelte"
  import Step from "$lib/components/Step.svelte"

  let m: number | null = $state(119)
  let n: number | null = $state(544)

  const steps = $derived(isPositiveInteger(m) && isPositiveInteger(n) ? trace(m, n) : null)
  const r = $derived((m ?? 0) % (n ?? 0))

  function isPositiveInteger(value: number | null): value is number {
    return value !== null && Number.isInteger(value) && value > 0
  }
</script>

<h2>Euclid's Algorithm</h2>

<p>
  Once you've stepped through Euclid's algorithm by hand, you may want to see a few more examples
  without the tedious calculations. Feel free to enter whatever values you want into the first row
  to see it in action:
</p>

<table>
  <thead>
    <tr>
      <th>m</th>
      <th>n</th>
      <th>r</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td><input name="m" type="number" bind:value={m} /></td>
      <td class:result={r == 0}><input name="n" type="number" bind:value={n} /></td>
      <td>{Number.isNaN(r) ? "" : r}</td>
    </tr>
    {#if steps}
      <!-- The first step is the input row above, which carries the two inputs. -->
      {#each steps.slice(1) as step (step.m)}
        <tr>
          <td>{step.m}</td>
          <td class:result={step.r === 0}>{step.n}</td>
          <td>{step.r}</td>
        </tr>
      {/each}
    {:else}
      <tr>
        <td colspan="3" class="validation-error">m and n must both be positive integers.</td>
      </tr>
    {/if}
  </tbody>
</table>

<h2>Implementation</h2>

<CodeTabs>
  <!-- Rendered from the modules the unit tests import, so the page can't drift
       from the code that is actually verified. -->
  {#snippet faithful()}{faithfulSource}{/snippet}
  {#snippet idiomatic()}{idiomaticSource}{/snippet}
</CodeTabs>

<h2>Algorithm Structure</h2>

<Algorithm letter="F" name="Factorial">
  {#snippet intro()}
    Given a positive integer $n$, find the <i>factorial</i> of $n$, that is, the product of all numbers
    $1, 2, \ldots, n$.
  {/snippet}

  <Step n={1}>[Initialize f.] Set $f \leftarrow n$.</Step>
  <Step n={2}>[Is it 1?] If $n = 1$, the algorithm terminates; $f$ is the answer.</Step>
  <Step n={3}
    >[Reduce.] Set $n \leftarrow n - 1$, $f \leftarrow f \cdot n$, and go back to step F2.</Step
  >
</Algorithm>

<Mermaid
  algorithm="F"
  chart={`
        flowchart LR
        F1[F1. Initialize $$f$$.]
        F2[Is it 1?]
        F3[Reduce.]
        Start --> F1 --> F2 -- No --> F3 --> F2
        F2 -- Yes --> Result
        `}
/>

<style>
  table {
    width: 100%;
    max-width: 26rem;
    table-layout: fixed;
  }

  input {
    width: 100%;
    box-sizing: border-box;
  }

  .validation-error {
    color: var(--danger);
    font-style: italic;
  }
</style>
