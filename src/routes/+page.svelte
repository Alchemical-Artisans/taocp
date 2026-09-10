<script lang="ts">
  import Spoiler from "$lib/components/Spoiler.svelte"
</script>

<section class="home">
  <h1>Understanding The Art of Computer Programming</h1>

  <p>
    Underpinning the technical advances of the last fifty years are basic computational concepts. In
    <a href="https://www-cs-faculty.stanford.edu/~knuth/taocp.html"
      >The Art of Computer Programming</a
    >, Knuth documents these ideas, providing a systematic catalog of how they work.
  </p>

  <p>
    Many in the programming community regard this work as canonical, an indispensable tool for
    improving your skills. Still others have concluded that it is too dense to be valuable, taking
    over an hour to complete a single page.
  </p>

  <h2>AI Use</h2>

  <p>
    As genies take over the grunt work of coding, it may seem like the material has become fully
    obsolete. In a lot of ways, though, it has never been more relevant. Much of the last few
    decades has been about build scaffolding around these core concepts, but we've reached a point
    where that is erected instantaneously. Now our time is concentrated on the most mission critical
    portions of the codebase, fully understanding those areas has become vital.
  </p>

  <p>
    The prose and code examples on this site are entirely my own. I will sometimes use coding
    assistants to build the tools, and the site structure is entirely vibe coded. Genies do have a
    tendency to do more than asked, so if you find a bit of text that feels like slop please
    <a href="mailto:cto@alchemicalartisans.com">email me</a> so I can fix it.
  </p>

  <h2>Site Goals</h2>

  <p>
    This site serves as a more approachable treatment of the material, providing further examples
    and explanation to help you assimilate the concepts. It offers interactive tools to experiment
    with the ideas, further explanations and examples when the material is hard to follow, and
    simpler explanations when the math gets too advanced.
  </p>

  <h2>Code Examples</h2>

  <p>
    Knuth invented MMIX for code examples in the book, but not everybody is well versed in assembly.
    While you'll gain that skill with time, I'm providing implementations in a higher level language
    to help ease that transition. Javascript has become fairly universal, these examples will be
    implemented in Typescript so I can make the input constraints a little clearer.
  </p>

  <p>
    For some implementation, I will provide both a faithful implementation of the algorithm in the
    book and one that's more idiomatic to the language. It will still have the same performance
    characteristics, but this should allow you to see how to adapt the ideas from the book in a
    modern codebase.
  </p>

  <h2>Problems and Solutions</h2>

  <p>
    It's not always clear what Knuth is asking for in the questions at the end of each section,
    which can be cleared up by looking at the solution. In those cases, I've provided clarification
    so you can attempt the problem without having glimpsed where you're going.
  </p>

  <p>
    When a solution is difficult to follow, I've also provided further explanation. This will be
    marked as a <Spoiler inline>spoiler</Spoiler>, though, to protect you from seeing it
    accidentally.
  </p>

  <h2>Errors</h2>

  <p>
    As with all of the works surround TAOCP, I'm planning to offer a reward for report of any errors
    detected. In fact, I'm expanding that to include feedback which leads to a clearer explanation.
    I'm currently having difficulty coming up something good, but I'll keep track of anything
    reported and make sure your included once I figure that out. Please
    <a href="mailto:cto@alchemicalartisans.com">email me</a> any feedback.
  </p>
</section>

<style>
  .home {
    max-width: 60ch;
  }
  .home h1 {
    font-family: "Spectral", Georgia, serif;
    font-size: 2rem;
    font-weight: 600;
    margin: 0 0 16px;
    text-wrap: balance;
  }
  .home p {
    color: var(--ink-soft);
    font-size: 1.02rem;
    line-height: 1.6;
  }
</style>
