<script lang="ts">
 import CodeTabs from "$lib/components/CodeTabs.svelte"
 import { trace } from "$lib/algorithms/euclid/trace"
 import faithfulSource from "$lib/algorithms/euclid/faithful.ts?raw"
 import idiomaticSource from "$lib/algorithms/euclid/idiomatic.ts?raw"
 import Mermaid from "$lib/components/Mermaid.svelte"
 import Algorithm from "$lib/components/Algorithm.svelte"
 import Step from "$lib/components/Step.svelte"
 import { SvelteSet } from "svelte/reactivity"
 import { onMount } from "svelte"
 import { page } from "$app/state"
 import {
   parseRulesCsv,
   rulesFromSearchParams,
   rulesToCsv,
   rulesToShareUrl,
   type Rule,
 } from "$lib/algorithms/a-star/csv"

 let m: number | null = $state(119)
 let n: number | null = $state(544)

 const steps = $derived(isPositiveInteger(m) && isPositiveInteger(n) ? trace(m, n) : null)
 const r = $derived((m ?? 0) % (n ?? 0))

 function isPositiveInteger(value: number | null): value is number {
   return value !== null && Number.isInteger(value) && value > 0
 }

 let a_star_rules: Rule[] = $state([
   { theta: "ab", phi: "bac", b: 0, a: 1 },
   { theta: "ba", phi: "a", b: 2, a: 3 },
   { theta: "ac", phi: "ca", b: 2, a: 0 },
   { theta: "a", phi: "", b: 3, a: 4 },
 ])

 /* A rule's index is its stage number, so the b and a columns point at rows by
    position. Adding or removing a row therefore renumbers every rule after it,
    and the references are left as the reader typed them rather than being
    rewritten underneath them. */
 function addRule() {
   const j = a_star_rules.length
   a_star_rules.push({ theta: "", phi: "", b: j, a: j + 1 })
 }

 function removeRule(j: number) {
   a_star_rules.splice(j, 1)
 }

 /* Rules travel as CSV: exported, imported and shared by link entirely in the
    browser, since the site is prerendered and has no server to upload to. */
 let rules_message: { kind: "error" | "status"; text: string } | null = $state(null)
 let share_link: string | null = $state(null)
 let csv_file_input: HTMLInputElement | null = $state(null)

 function describe(error: unknown): string {
   return error instanceof Error ? error.message : String(error)
 }

 /* A share link is read once the page is live, so the prerendered HTML stays
    the same for every reader and hydration has the real query string. */
 onMount(() => {
   try {
     const shared = rulesFromSearchParams(page.url.searchParams)
     if (shared) a_star_rules = shared
   } catch (error) {
     rules_message = {
       kind: "error",
       text: `The rules in this link could not be read. ${describe(error)}`,
     }
   }
 })

 function exportRules() {
   const url = URL.createObjectURL(new Blob([rulesToCsv(a_star_rules)], { type: "text/csv" }))
   const link = document.createElement("a")
   link.href = url
   link.download = "a-star-rules.csv"
   link.click()
   /* Revoked a tick later: some browsers have not started the download yet. */
   setTimeout(() => URL.revokeObjectURL(url))
 }

 async function importRules(event: Event) {
   const input = event.currentTarget as HTMLInputElement
   const file = input.files?.[0]
   /* Cleared so picking the same file twice still fires a change event. */
   input.value = ""
   if (!file) return

   try {
     a_star_rules = parseRulesCsv(await file.text())
     share_link = null
     const count = a_star_rules.length
     rules_message = {
       kind: "status",
       text: `Loaded ${count} rule${count === 1 ? "" : "s"} from ${file.name}.`,
     }
   } catch (error) {
     rules_message = { kind: "error", text: `${file.name} could not be read. ${describe(error)}` }
   }
 }

 async function copyShareLink() {
   share_link = rulesToShareUrl(page.url, a_star_rules)
   try {
     await navigator.clipboard.writeText(share_link)
     rules_message = { kind: "status", text: "Share link copied." }
   } catch {
     /* Clipboard access is refused outside a secure context, so the link is
        shown below either way and can be copied by hand. */
     rules_message = { kind: "status", text: "Copy the link below to share these rules." }
   }
 }

 let N_candidates = $derived(
   [...new Set(a_star_rules.flatMap(({ a, b }) => [a, b]))].filter((j) => !a_star_rules[j]),
 )

 let test_input = $state("aaabbbbb")

 /* How many steps to run before giving up, so a reader exploring rules that
    never terminate decides how long to wait rather than the page deciding. */
 let max_steps: number | null = $state(1000)
 let step_limit = $derived(isPositiveInteger(max_steps) ? max_steps : 0)

 let collapse_trace = $state(false)

 /** Splits a string into runs of a repeated character, e.g. "aaabbbbb" -> [{char: "a", count: 3}, {char: "b", count: 5}]. */
 function collapseRuns(value: string): { char: string; count: number }[] {
   const runs: { char: string; count: number }[] = []
   let i = 0
   while (i < value.length) {
     let j = i
     while (j < value.length && value[j] === value[i]) j++
     runs.push({ char: value[i], count: j - i })
     i = j
   }
   return runs
 }

 let a_star_trace = $derived.by(() => {
   const states: { string: string; stage: number | null }[] = []
   let current = test_input
   let stage = 0
   states.push({ string: current, stage: a_star_rules[stage] ? stage : null })

   let guard = 0
   while (a_star_rules[stage] && guard < step_limit) {
     const rule = a_star_rules[stage]
     const index = rule.theta.length > 0 ? current.indexOf(rule.theta) : -1
     if (index === -1) {
       stage = rule.a
     } else {
       current = current.slice(0, index) + rule.phi + current.slice(index + rule.theta.length)
       stage = rule.b
     }
     states.push({ string: current, stage: a_star_rules[stage] ? stage : null })
     guard += 1
   }

   return { states, terminated: !a_star_rules[stage] }
 })

 type AStarState = { string: string; stage: number | null }

 /** Collapses consecutive states that share the same stage into a single group. */
 let a_star_groups = $derived.by(() => {
   const groups: { stage: number | null; states: AStarState[]; startIndex: number }[] = []
   let index = 0
   for (const state of a_star_trace.states) {
     const last = groups[groups.length - 1]
     if (last && last.stage === state.stage) {
       last.states.push(state)
     } else {
       groups.push({ stage: state.stage, states: [state], startIndex: index })
     }
     index += 1
   }
   return groups
 })

 /* The whole application collapsed to the string that went in and the one
    that came out, for when only the result matters. */
 let a_star_ends = $derived.by(() => {
   const states = a_star_trace.states
   const lastIndex = states.length - 1
   const hidden = Math.max(lastIndex - 1, 0)
   return {
     first: states[0],
     final: states[lastIndex],
     lastIndex,
     hidden,
     hiddenLabel: hidden === 1 ? "1" : "1\u2026" + (lastIndex - 1),
   }
 })

 let expanded_groups = new SvelteSet<number>()

 function toggleGroup(index: number) {
   if (expanded_groups.has(index)) {
     expanded_groups.delete(index)
   } else {
     expanded_groups.add(index)
   }
 }
</script>

<div class="video-embed">
  <iframe
    src="https://www.youtube-nocookie.com/embed/5agv4lW9fhY"
    title="TAOCP Section 1.1 video"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
  ></iframe>
</div>

<style>
  .video-embed {
    aspect-ratio: 16 / 9;
    width: 100%;
  }

  .video-embed iframe {
    width: 100%;
    height: 100%;
    border: 0;
  }
</style>

<h2 id="euclids-algorithm">Euclid's Algorithm</h2>

<p>
  Once you've stepped through Euclid's algorithm by hand, you may want to see a few more examples
  without the tedious calculations. Feel free to enter whatever values you want into the first row
  to see it in action:
</p>

<table>
  <thead>
    <tr>
      <th scope="col">$m$</th>
      <th scope="col">$n$</th>
      <th scope="col">$r$</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td><input name="m" type="number" aria-label="m" bind:value={m} /></td>
      <td class:result={r == 0}
        ><input name="n" type="number" aria-label="n" bind:value={n} /></td
      >
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

<h2 id="implementation">Implementation</h2>

<CodeTabs>
  <!-- Rendered from the modules the unit tests import, so the page can't drift
       from the code that is actually verified. -->
  {#snippet faithful()}{faithfulSource}{/snippet}
  {#snippet idiomatic()}{idiomaticSource}{/snippet}
</CodeTabs>

<h2 id="algorithm-structure">Algorithm Structure</h2>

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
        accTitle: Flowchart of Algorithm F, Factorial
        accDescr: Start leads to F1, Initialize f. F1 leads to F2, is it 1. If no, F2 leads to F3, Reduce, which loops back to F2. If yes, F2 leads to Result.
        F1[F1. Initialize $$f$$.]
        F2[Is it 1?]
        F3[Reduce.]
        Start --> F1 --> F2 -- No --> F3 --> F2
        F2 -- Yes --> Result
        `}
/>

<h2 id="notation-reference">Notation Reference</h2>

<dl>
  <dt>Algorithm F</dt>
  <dd>Reference to an algorithm within the current section.</dd>

  <dt>Algorithm 1.1E</dt>
  <dd>Reference to an algorithm in a different section. For algorithms written on this site (like Algorithm F above) they will be referenced as W1.1F.</dd>

  <dt>$x \leftarrow 2^{10}$</dt>
  <dd>The $\leftarrow$ assigns the result of an expression to a variable. In this case $1024$ is assigned to the variable $x$.</dd>

  <dt>$x = y$</dt>
  <dd>Check if $x$ is equal to $y$.</dd>

  <dt>$x \leftrightarrow y$</dt>
  <dd>Swap the values of $x$ and $y$.</dd>

  <dt>$x \leftarrow y \leftarrow 3^4$</dt>
  <dd>Assign variables $x$ and $y$ to the result of the expression, in this case $81$.</dd>

  <dt>If condition, do something</dt>
  <dd>Perform "something" only if "condition" is true.</dd>

  <dt>$\tombstone$</dt>
  <dd>Indicates the end of the algorithm.</dd>

  <dt>$a[i]$</dt>
  <dd>The $i$th element of array $a$.</dd>

  <dt>$m[i,j]$</dt>
  <dd>The $j$th element of the $i$th array in the multi-dimensional array $m$.</dd>
</dl>

<h2 id="algorithm-feature-reference">Algorithm Feature Reference</h2>

<dl>
  <dt>Finiteness</dt>
  <dd>An algorithm eventually terminates.</dd>

  <dt>Definiteness</dt>
  <dd>Each step of an algorithm contains no ambiguity.</dd>

  <dt>Input</dt>
  <dd>An algorithm takes zero or more inputs and defines its constraints.</dd>

  <dt>Output</dt>
  <dd>An algorithm has at least one resulting value which relates to the input.</dd>

  <dt>Effectiveness</dt>
  <dd>Operations of an algorithm are simple enough that they can be worked out by hand.</dd>
</dl>

<h2 id="algorithm-e-correctness-proof-explanation">Algorithm E Correctness Proof Explanation</h2>

<p>
  Since E3 changes the values of $m$ and $n$, Knuth's goal is to demonstrate that the divisors
  of $m$ and $n$ are the same as the divisors for $n$ and $r$. If this is accomplished, then of
  course the greatest value in that set will remain the same.
</p>

<p>
  The typical strategy when proving equivalence of sets, say $A$ and $B$ is to demonstrate that
  $A$ is a subset of $B$ ($A \subseteq B$) and $B \subseteq A$. Demonstrating that one set is a
  subset of another involves taking a value in the smaller set ($x \in A$) and showing $x \in B$.
  For convenience, we'll define $A$ and $B$ as follows:
</p>

<dl>
  <dt>$A$</dt>
  <dd>The set of divisors of $m$ and $n$.</dd>

  <dt>$B$</dt>
  <dd>The set of divisors of $n$ and $r$.</dd>
</dl>

<p>
  When Knuth points out that $m - qn = r$ demonstrates that if a number divides both $m$ and
  $n$ it must therefore divide $r$, he is implicitly stating that $A \subseteq B$. Similarly,
  $qn + r = m$ implies that $B \subseteq A$.
</p>

<p>
  So because $A = B$, the set of divisors for $m$ and $n$ is the same as the set of divisors for
  $n$ and $r$. Therefore, the largest divisor remains the same after step E3 is applied.
  $\tombstone$
</p>

<h2 id="worked-example-of-t3">Worked Example of $T_3$</h2>

<p>
  Here are the operations involved in calculating the individual values for $m$:
</p>

<dl>
  <dt>$m = 1$</dt>
  <dd><ol>
    <li>$r \leftarrow 1$</li>
    <li>$r \leftarrow 0$</li>
  </ol></dd>

  <dt>$m = 2$</dt>
  <dd><ol>
    <li>$r \leftarrow 2$</li>
    <li>$r \leftarrow 1$</li>
    <li>$r \leftarrow 0$</li>
  </ol></dd>

  <dt>$m = 3$</dt>
  <dd><ol>
    <li>$r \leftarrow 0$</li>
  </ol></dd>
</dl>

$$T_3 = \frac{2 + 3 + 1}{3} = 2$$

<h2 id="explanation-of-set-theory-grounding">Explanation of Set Theory Grounding</h2>

<p>
  To understand the set theory grounding, consider step E3. The information delivered to the step,
  along with the step number itself, form a packet of information describing the state of the
  machine executing the algorithm at that point:
</p>

<table class="trace">
  <colgroup>
    <col class="data-col" />
    <col class="data-col" />
    <col class="data-col" />
    <col class="data-col" />
  </colgroup>
  <thead>
    <tr>
      <th scope="col">$m$</th>
      <th scope="col">$n$</th>
      <th scope="col">$r$</th>
      <th scope="col">Step</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>$544$</td>
      <td>$119$</td>
      <td>$68$</td>
      <td>$3$</td>
    </tr>
  </tbody>
</table>

<p>
  This state is one element of $Q$. When $f$ is applied to this state, a new state (also in $Q$)
  is produced:
</p>

<table class="trace">
  <colgroup>
    <col class="data-col" />
    <col class="data-col" />
    <col class="data-col" />
    <col class="data-col" />
  </colgroup>
  <thead>
    <tr>
      <th scope="col">$m$</th>
      <th scope="col">$n$</th>
      <th scope="col">$r$</th>
      <th scope="col">Step</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>$119$</td>
      <td>$68$</td>
      <td>$68$</td>
      <td>$1$</td>
    </tr>
  </tbody>
</table>

<p>
  Every combination of values for each of these steps forms additional elements of the set $Q$.
  Also included in $Q$ are the members of $I$, which are bare pairs of $m$ and $n$:
</p>

<table class="trace">
  <colgroup>
    <col />
    <col class="data-col" />
    <col class="data-col" />
    <col class="data-col" />
    <col class="data-col" />
  </colgroup>
  <thead>
    <tr>
      <th scope="col">&nbsp;</th>
      <th scope="col">$m$</th>
      <th scope="col">$n$</th>
      <th scope="col">$r$</th>
      <th scope="col">Step</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">$i$</th>
      <td>$119$</td>
      <td>$544$</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
    <tr>
      <th scope="row">$f(i)$</th>
      <td>$119$</td>
      <td>$544$</td>
      <td>$0$</td>
      <td>$1$</td>
    </tr>
  </tbody>
</table>

<p>
  Because E2 can branch depending on the value of $r$, the output from that step has two separate forms:
</p>

<table class="trace">
  <colgroup>
    <col />
    <col class="data-col" />
    <col class="data-col" />
    <col class="data-col" />
    <col class="data-col" />
  </colgroup>
  <thead>
    <tr>
      <th scope="col">&nbsp;</th>
      <th scope="col">$m$</th>
      <th scope="col">$n$</th>
      <th scope="col">$r$</th>
      <th scope="col">Step</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">$s_1$</th>
      <td>$544$</td>
      <td>$119$</td>
      <td>$68$</td>
      <td>$2$</td>
    </tr>
    <tr>
      <th scope="row">$f(s_1)$</th>
      <td>$544$</td>
      <td>$119$</td>
      <td>$68$</td>
      <td>$3$</td>
    </tr>
    <tr>
      <th scope="row">$s_2$</th>
      <td>$51$</td>
      <td>$17$</td>
      <td>$0$</td>
      <td>$2$</td>
    </tr>
    <tr>
      <th scope="row">$f(s_2)$</th>
      <td>&nbsp;</td>
      <td>$17$</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  </tbody>
</table>

<p>
  Notice how information is stripped from $f(s_2)$, this is because it's the result and therefore a member of
  $\Omega$. Because the algorithm is complete, $f(f(s_2)) = f(s_2)$.
</p>

<p>
  Let us look again at the example worked in the book of $(119,544)$, applying $f$ repeatedly eventually leads
  to the output $(17)$. Alongside each step, I've included the applicable portion of the equation Knuth provides.
</p>

{#snippet E1()}
  $f((m,n,r,1)) = (m,n,\text{remainder of } m \text{ divided by } n,2)$
{/snippet}

{#snippet E2()}
  $f((m,n,r,2)) = (n) \text{ if } r=0 \text{, } (m,n,r,3) \text{ otherwise}$
{/snippet}

{#snippet E3()}
  $f((m,n,p,3)) = (n,p,p,1)$
{/snippet}

<table class="trace">
  <colgroup>
    <col />
    <col class="data-col" />
    <col class="data-col" />
    <col class="data-col" />
    <col class="data-col" />
    <col />
  </colgroup>
  <thead>
    <tr>
      <th scope="col">&nbsp;</th>
      <th scope="col">$m$</th>
      <th scope="col">$n$</th>
      <th scope="col">$r$</th>
      <th scope="col">Step</th>
      <th scope="col">Equation</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">$x_0$</th>
      <td>$119$</td>
      <td>$544$</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>$f((m,n)) = (m,n,0,1)$</td>
    </tr>
    <tr>
      <th scope="row">$x_1 = f(x_0)$</th>
      <td>$119$</td>
      <td>$544$</td>
      <td>$0$</td>
      <td>$1$</td>
      <td>{@render E1()}</td>
    </tr>
    <tr>
      <th scope="row">$x_2 = f(x_1)$</th>
      <td>$119$</td>
      <td>$544$</td>
      <td>$119$</td>
      <td>$2$</td>
      <td>{@render E2()}</td>
    </tr>
    <tr>
      <th scope="row">$x_3 = f(x_2)$</th>
      <td>$119$</td>
      <td>$544$</td>
      <td>$119$</td>
      <td>$3$</td>
      <td>{@render E3()}</td>
    </tr>
    <tr>
      <th scope="row">$x_4 = f(x_3)$</th>
      <td>$544$</td>
      <td>$119$</td>
      <td>$119$</td>
      <td>$1$</td>
      <td>{@render E1()}</td>
    </tr>
    <tr>
      <th scope="row">$x_5 = f(x_4)$</th>
      <td>$544$</td>
      <td>$119$</td>
      <td>$68$</td>
      <td>$2$</td>
      <td>{@render E2()}</td>
    </tr>
    <tr>
      <th scope="row">$x_6 = f(x_5)$</th>
      <td>$544$</td>
      <td>$119$</td>
      <td>$68$</td>
      <td>$3$</td>
      <td>{@render E3()}</td>
    </tr>
    <tr>
      <th scope="row">$x_7 = f(x_6)$</th>
      <td>$119$</td>
      <td>$68$</td>
      <td>$68$</td>
      <td>$1$</td>
      <td>{@render E1()}</td>
    </tr>
    <tr>
      <th scope="row">$x_8 = f(x_7)$</th>
      <td>$119$</td>
      <td>$68$</td>
      <td>$51$</td>
      <td>$2$</td>
      <td>{@render E2()}</td>
    </tr>
    <tr>
      <th scope="row">$x_9 = f(x_8)$</th>
      <td>$119$</td>
      <td>$68$</td>
      <td>$51$</td>
      <td>$3$</td>
      <td>{@render E3()}</td>
    </tr>
    <tr>
      <th scope="row">$x_{10} = f(x_9)$</th>
      <td>$68$</td>
      <td>$51$</td>
      <td>$51$</td>
      <td>$1$</td>
      <td>{@render E1()}</td>
    </tr>
    <tr>
      <th scope="row">$x_{11} = f(x_{10})$</th>
      <td>$68$</td>
      <td>$51$</td>
      <td>$17$</td>
      <td>$2$</td>
      <td>{@render E2()}</td>
    </tr>
    <tr>
      <th scope="row">$x_{12} = f(x_{11})$</th>
      <td>$68$</td>
      <td>$51$</td>
      <td>$17$</td>
      <td>$3$</td>
      <td>{@render E3()}</td>
    </tr>
    <tr>
      <th scope="row">$x_{13} = f(x_{12})$</th>
      <td>$51$</td>
      <td>$17$</td>
      <td>$17$</td>
      <td>$1$</td>
      <td>{@render E1()}</td>
    </tr>
    <tr>
      <th scope="row">$x_{14} = f(x_{13})$</th>
      <td>$51$</td>
      <td>$17$</td>
      <td>$0$</td>
      <td>$2$</td>
      <td>{@render E2()}</td>
    </tr>
    <tr>
      <th scope="row">$x_{15} = f(x_{14})$</th>
      <td>&nbsp;</td>
      <td>$17$</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  </tbody>
</table>

<p>
  This sequence $x_0, x_1, \ldots, x_{15}$ is collectively referred to as a <i>computational sequence</i>,
  with this particular example defined by $(119, 544)$. This one <i>terminates in $15$ steps</i>
  because step $15$ is the first step where a member of $\Omega$ is encountered.
</p>

<p>
  For this mathematical model to be an algorithm, it must meet the five criteria
  outlined earlier in the section. As mathematical equations, they are by their
  nature definite, and the sets $I$ and $\Omega$ ensure that there is iput and
  output. Finiteness is an additional constraint: all possible inputs must define
  computational sequences which terminate in a finite number of steps.
</p>

<p>
  Effectiveness must also be achieved via additional constraints, but this can be
  accomplished by a number of different approaches. The discussion around $A^*$ is one
  example of this, constraining the expression of algorithms to mutating sequences
  of letters, which of course can be written down and therefore worked by hand.
</p>

<h2 id="using-a-star">Using $A^*$</h2>

<p>
  Let's look at how to implement addition with the framework Knuth set forth to
  understand how it works. If we want to represent $3 + 5$, the input could be
  $aaabbbbb$ or $a^3 b^5$. Here is the process we want to create:
</p>

$$
a^3 b^5 \\
a^4 b^4 \\
a^5 b^3 \\
a^6 b^2 \\
a^7 b^1 \\
a^8
$$

<p>
  Transformations only occur when $\theta_j$ matches a part of the string, so in
  each step we want a $b$ to transform into an $a$. To accomplish this, we can
  define $\theta_0 = b$ and $\phi_0 = a$. This should be applied repeatedly until
  there are no more $b$s, so $b_0 = 0$ will repeat the rule until $\theta_0$ no
  longer matches. Once all of those have been replaced, we need to move on to a
  new rule so $a_0 = 1$, but we have the desired result so $N = 1$.
</p>

<p>
  Now consider multiplication, which is a little more complicated to model. To
  begin, we want to take a $b$ and add a new value $c$ into the mix for each $a$:
</p>

$$
a^3 b^5 \\
a^2 b ac b^4 \\
ab (ac)^2 b^4 \\
b (ac)^3 b^4
$$

<p>
  This can be done with $\theta_0 = ab$, $\phi_0 = bac$, $b_0 = 0$ and $a_0 = 1$.
  The $c$ value is where we'll accumulate the result, so now that we're done with
  the leading $b$ it can be discarded with $\theta_1 = ba$, $\phi_1 = a$,
  $b_1 = 2$. We'll defer definition of $a_1$ for the moment, as once there are no
  more $ba$ values it's time to move to a new stage in the algorithm. Here is what
  we have at this point:
</p>

$$(ac)^3 b^4$$

<p>
  For $j = 0$ to apply successfuly to the next $b$, though, the $a$ values must
  all be adjacent to the leftmost $b$. So $\theta_2 = ac$, $\phi_2 = ca$ and
  $b_2 = 2$. With that it's possible to evaluate $j = 0$ again, so $a_2 = 0$.
</p>

$$
c^3 a^3 b^4 \\
c^3 b (ac)^3 b^3 \\
c^3 (ac)^3 b^3 \\
c^6 a^3 b^3
$$

<p>
  Applying this process repeatedly will eventually reach $c^{15} a^3$, which means
  that $\theta_1$ does not apply and so $a_1 = 3$. This step eliminates all values
  of $a$ with $\theta_3 = a$, $\phi_3 = \text{empty}$, $b_3 = 3$ and $a_3 = 4$.
  We'll consider strings exclusively containing $c$ as the output, so $N = 4$.
</p>

<p>
  Here is a tool to explore this more fully:
</p>


<table class="rules">
  <colgroup>
    <col />
    <col />
    <col />
    <col />
    <col />
    <col class="action-col" />
  </colgroup>
  <thead>
    <tr>
      <th scope="col">$j$</th>
      <th scope="col">$\theta_j$</th>
      <th scope="col">$\phi_j$</th>
      <th scope="col">$b_j$</th>
      <th scope="col">$a_j$</th>
      <th scope="col"><span class="sr-only">Remove</span></th>
    </tr>
  </thead>
  <tbody>
    {#each a_star_rules as rule, j (j)}
      <tr>
        <td>{j}</td>
        <td><input type="text" aria-label="theta sub {j}" bind:value={rule.theta} /></td>
        <td><input type="text" aria-label="phi sub {j}" bind:value={rule.phi} /></td>
        <td><input type="number" aria-label="b sub {j}" bind:value={rule.b} /></td>
        <td><input type="number" aria-label="a sub {j}" bind:value={rule.a} /></td>
        <td
          ><button type="button" aria-label="Remove rule {j}" onclick={() => removeRule(j)}
            >&times;</button
          ></td
        >
      </tr>
    {/each}
  </tbody>
</table>

<p class="rule-actions">
  <button type="button" class="tool-button" onclick={addRule}>Add rule</button>
  <button type="button" class="tool-button" onclick={exportRules}>Export CSV</button>
  <button type="button" class="tool-button" onclick={() => csv_file_input?.click()}
    >Import CSV</button
  >
  <button type="button" class="tool-button" onclick={copyShareLink}>Copy share link</button>
  <input
    class="file-input"
    type="file"
    accept=".csv,text/csv"
    aria-hidden="true"
    tabindex="-1"
    bind:this={csv_file_input}
    onchange={importRules}
  />
</p>

<p class="rule-message" aria-live="polite">
  {#if rules_message}<span class:validation-error={rules_message.kind === "error"}
      >{rules_message.text}</span
    >{/if}
</p>

{#if share_link}
  <p>
    <input
      class="share-link"
      type="text"
      readonly
      aria-label="Share link"
      value={share_link}
      onfocus={(event) => event.currentTarget.select()}
    />
  </p>
{/if}


{#if N_candidates.length != 1}
  <p>
    There are multiple values of $j$ refereced by $a_j$ and $b_j$ which are
    undefined, so the value of $N$ cannot be determined.
  </p>
{:else}
  <p>$N =$ {N_candidates[0]}</p>
{/if}

<p>
  Enter a string below to watch the algorithm above apply to it, one stage at a time:
</p>

<p>
  <input type="text" aria-label="Test string" bind:value={test_input} />
</p>

<p class="trace-controls">
  <label>
    Maximum steps
    <input type="number" min="1" bind:value={max_steps} />
  </label>
  <label>
    <input type="checkbox" bind:checked={collapse_trace} />
    Collapse to start and end
  </label>
</p>

{#if step_limit === 0}
  <p class="validation-error">The maximum number of steps must be a positive integer.</p>
{/if}

{#snippet aStarString(value)}{#if value === ""} {:else}{#each collapseRuns(value) as run}{run.char}{#if run.count > 1}<sup>{run.count}</sup>{/if}{/each}{/if}{/snippet}

<table class="trace a-star-trace">
  <colgroup>
    <col />
    <col />
    <col class="data-col" />
  </colgroup>
  <thead>
    <tr>
      <th scope="col">&nbsp;</th>
      <th scope="col">String</th>
      <th scope="col">$j$</th>
    </tr>
  </thead>
  <tbody>
    {#if collapse_trace}
      <tr>
        <td>0</td>
        <td>{@render aStarString(a_star_ends.first.string)}</td>
        <td>{a_star_ends.first.stage ?? " "}</td>
      </tr>
      {#if a_star_ends.hidden > 0}
        <tr>
          <td>{a_star_ends.hiddenLabel}</td>
          <td class="elided">&vellip;</td>
          <td>&nbsp;</td>
        </tr>
      {/if}
      {#if a_star_ends.lastIndex > 0}
        <tr>
          <td>{a_star_ends.lastIndex}</td>
          <td>{@render aStarString(a_star_ends.final.string)}</td>
          <td>{a_star_ends.final.stage ?? " "}</td>
        </tr>
      {/if}
    {:else}
      {#each a_star_groups as group, gi (gi)}
      {#if group.states.length === 1}
        <tr>
          <td>{group.startIndex}</td>
          <td>{@render aStarString(group.states[0].string)}</td>
          <td>{group.states[0].stage ?? " "}</td>
        </tr>
      {:else if !expanded_groups.has(gi)}
        <tr>
          <td
            ><button type="button" onclick={() => toggleGroup(gi)}
              >▸ {group.startIndex}…{group.startIndex + group.states.length - 1}</button
            ></td
          >
          <td>{@render aStarString(group.states[0].string)}</td>
          <td>{group.stage ?? " "}</td>
        </tr>
      {:else}
        {#each group.states as state, si}
          <tr>
            <td
              >{#if si === 0}<button type="button" onclick={() => toggleGroup(gi)}
                  >▾ {group.startIndex}</button
                >{:else}{group.startIndex + si}{/if}</td
            >
            <td>{@render aStarString(state.string)}</td>
            <td>{state.stage ?? " "}</td>
          </tr>
        {/each}
      {/if}
      {/each}
    {/if}
  </tbody>
</table>

{#if !a_star_trace.terminated}
  <p class="validation-error">
    The algorithm didn't reach a terminal stage within {step_limit} steps for this input.
  </p>
{/if}

<h2 id="exercise-and-answer-clarifications">Exercise and Answer Clarifications</h2>

<p>
  3. It's unclear from the problem statement that assignment isn't entirely
  disallowed. So even though $m \leftarrow n$ is disallowed, expressions like
  "Divide $m$ by $n$ and let $m$ be the remainder" still appears in the solution.
</p>

<p>
  6. This is asking you to replicate the calculation for each possible value of
  $m$, not apply the equation provided for the nature of $T_n$.
</p>

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

 /* Six columns, so the rules table needs more room than the two- and
    three-column tables above it. */
 table.rules {
   max-width: 32rem;
 }

 table.rules .action-col {
   width: 2.5rem;
 }

 table.rules td button {
   background: none;
   border: none;
   color: var(--ink-faint);
   font: inherit;
   font-size: 1.1rem;
   line-height: 1;
   cursor: pointer;
   padding: 2px 4px;
 }

 table.rules td button:hover {
   color: var(--danger);
 }

 table.rules td button:focus-visible,
 .tool-button:focus-visible {
   outline: 2px solid var(--accent);
   outline-offset: 1px;
 }

 .rule-actions {
   display: flex;
   flex-wrap: wrap;
   gap: 0.5rem;
 }

 /* Reserved so a message about an import or a share link does not shift the
    table and trace below it. */
 .rule-message {
   min-height: 1.2em;
 }

 /* Hidden because the Import CSV button opens it; a button keeps the row of
    controls consistent and keyboard reachable. */
 .file-input {
   display: none;
 }

 .trace-controls {
   display: flex;
   flex-wrap: wrap;
   align-items: center;
   gap: 0.4rem 1.5rem;
 }

 .trace-controls label {
   display: flex;
   align-items: center;
   gap: 0.4rem;
 }

 /* The full-width input rule above suits the text boxes, not these two. */
 .trace-controls input[type="number"] {
   width: 6rem;
 }

 .trace-controls input[type="checkbox"] {
   width: auto;
 }

 table.trace td.elided {
   text-align: center;
   color: var(--ink-faint);
 }

 .share-link {
   max-width: 32rem;
   font-size: 0.85rem;
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

 .validation-error {
   color: var(--danger);
   font-style: italic;
 }

 table.trace {
   width: auto;
   max-width: 100%;
   table-layout: auto;
   margin-inline: auto;
 }

 table.trace th:first-child,
 table.trace td:first-child {
   white-space: nowrap;
 }

 table.trace .data-col {
   width: 3.5rem;
 }

 table.trace td button {
   background: none;
   border: none;
   color: inherit;
   font: inherit;
   cursor: pointer;
   padding: 0;
 }

 table.trace td button:hover {
   color: var(--accent);
 }
</style>
