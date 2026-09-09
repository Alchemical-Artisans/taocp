<script lang="ts">
 let m: number | null = $state(119)
 let n: number | null = $state(544)

 const rows = $derived(isPositiveInteger(m) && isPositiveInteger(n) ? euclid(m, n) : null)

 function isPositiveInteger(value: number | null): value is number {
   return value !== null && Number.isInteger(value) && value > 0
 }

 function euclid(m: number, n: number) {
   const values: [number, number, number][] = []

   while (true) {
     let r = m % n
     if (r == 0) return values
     m = n
     n = r
     values.push([m, n, m % n])
   }
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
      <td class:result={m && n && m % n == 0}><input name="n" type="number" bind:value={n} /></td>
      <td>&nbsp;</td>
    </tr>
    {#if rows}
      {#each rows as [sm, sn, sr], i (sm)}
        <tr>
          <td>{sm}</td>
          <td class:result={i === rows.length - 1}>{sn}</td>
          <td>{sr}</td>
        </tr>
      {/each}
    {:else}
      <tr>
        <td colspan="3" class="validation-error">m and n must both be positive integers.</td>
      </tr>
    {/if}
  </tbody>
</table>

<style>
  .validation-error {
    color: var(--danger);
    font-style: italic;
  }
</style>
