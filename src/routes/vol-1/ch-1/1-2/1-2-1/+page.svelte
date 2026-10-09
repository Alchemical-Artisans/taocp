<script lang="ts">
  import Algorithm from "$lib/components/Algorithm.svelte"
  import CodeTabs from "$lib/components/CodeTabs.svelte"
  import FormulaTable from "$lib/components/FormulaTable.svelte"
  import Step from "$lib/components/Step.svelte"
  import extendedSource from "$lib/algorithms/extended-euclid/faithful.ts?raw"

  /* Written over four lines rather than one: a case analysis is the formula a
    reader is most likely to want broken up, so the tool opens showing that it
    can be. */
  const recurrence = [
    "\\begin{cases}",
    "  f(x) & x = 0 \\\\",
    "  2h(x-1) + 1 & x > 0",
    "\\end{cases}",
  ].join("\n")

  /* A recurrence, a closed form to test against it, and the summation they both
    come from — the shape of every induction argument in the section, so the
    tool opens on one rather than on an empty field. */
  const openingFormulas = ["x^2", "\\sum_{k=1}^{x} {2k - 1}", recurrence]
</script>

<h2 id="closed-forms">Closed Forms</h2>

<p>
  An important theme of induction is determining closed forms from recursive functions and
  summations. This is a tool where you can use $T_EX$ notation to describe these and see how
  different values play out.
</p>

<FormulaTable initial={openingFormulas} />

<h2 id="extended-euclids-algorithm">Extended Euclid's Algorithm</h2>

<Algorithm letter="E" name="Extended Euclid's algorithm">
  {#snippet intro()}
    Given positive integers $m$ and $n$, we compute their greatest common divisor $d$ and two
    integers $a$ and $b$ such that $am + bn = d$.
  {/snippet}

  <Step n={1}
    >[Initialize.] Set $a' \leftarrow b \leftarrow 1$, $a \leftarrow b' \leftarrow 0$, $c \leftarrow
    m$, $d \leftarrow n$.</Step
  >
  <Step n={2}>[Divide.] Set $q \leftarrow \lfloor c/d \rfloor$ and $r \leftarrow c \bmod d$.</Step>
  <Step n={3}
    >[Remainder zero?] If $r = 0$, the algorithm terminates; $\gcd(m, n) = d$ and $am + bn = d$.</Step
  >
  <Step n={4}
    >[Recycle.] Set $c \leftarrow d$, $d \leftarrow r$, $t \leftarrow a'$, $a' \leftarrow a$, $a
    \leftarrow t - qa$, $t \leftarrow b'$, $b' \leftarrow b$, $b \leftarrow t - qb$, and go back to
    step E2.</Step
  >
</Algorithm>

<CodeTabs>
  <!-- Rendered from the module the unit tests import, so the page can't drift
       from the code that is actually verified. -->
  {#snippet faithful()}{extendedSource}{/snippet}
</CodeTabs>
