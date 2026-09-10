<script lang="ts">
  import CodeTabs from "$lib/components/CodeTabs.svelte"
  import { trace } from "$lib/algorithms/euclid/trace"
  import faithfulSource from "$lib/algorithms/euclid/faithful.ts?raw"
  import idiomaticSource from "$lib/algorithms/euclid/idiomatic.ts?raw"

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

<CodeTabs {faithful} {idiomatic} />

<!-- Rendered from the modules the unit tests import, so the page can't drift
     from the code that is actually verified. -->
{#snippet faithful()}{faithfulSource}{/snippet}
{#snippet idiomatic()}{idiomaticSource}{/snippet}

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
