<script lang="ts">
  import FormulaTable from "$lib/components/FormulaTable.svelte"

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
