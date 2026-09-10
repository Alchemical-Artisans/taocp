import { describe, it, expect } from "vitest"
import { scan } from "./scan.ts"

const texOf = (source: string) => scan(source).map((span) => span.tex)

describe("scan", () => {
  it("finds inline math", () => {
    expect(texOf("<p>the integer $n$ is positive</p>")).toEqual(["n"])
  })

  it("finds display math", () => {
    expect(texOf("<p>$$\\sum_{k=1}^{n} k$$</p>")).toEqual(["\\sum_{k=1}^{n} k"])
  })

  it("marks which delimiter was used", () => {
    expect(scan("$a$ and $$b$$").map((span) => span.display)).toEqual([false, true])
  })

  it("reports offsets covering the delimiters", () => {
    const [span] = scan("ab $n$ cd")
    expect(["ab $n$ cd".slice(span.start, span.end)]).toEqual(["$n$"])
  })

  it("keeps braces that Svelte would otherwise read as an expression", () => {
    expect(texOf("<p>$\\frac{n}{2}$</p>")).toEqual(["\\frac{n}{2}"])
  })

  it("ignores an escaped dollar", () => {
    expect(texOf("<p>costs \\$5 and \\$6</p>")).toEqual([])
  })

  it("ignores a dollar that opens onto whitespace", () => {
    expect(texOf("<p>$ 5 to $ 6</p>")).toEqual([])
  })

  it("does not let inline math cross a blank line", () => {
    expect(texOf("<p>costs $5</p>\n\n<p>or $6</p>")).toEqual([])
  })

  it("lets display math cross a blank line", () => {
    expect(texOf("$$a\n\nb$$")).toEqual(["a\n\nb"])
  })

  it("skips script bodies", () => {
    expect(texOf("<script>let $x = 1; const y = $z</script><p>$n$</p>")).toEqual(["n"])
  })

  it("skips style bodies", () => {
    expect(texOf("<style>.a::after { content: '$'; }</style><p>$n$</p>")).toEqual(["n"])
  })

  it("skips code and pre bodies", () => {
    expect(texOf("<pre>$ ls</pre><code>$HOME</code><p>$n$</p>")).toEqual(["n"])
  })

  it("skips svelte expression tags", () => {
    expect(texOf("<p>{$count} and {a ? '$' : '$'} then $n$</p>")).toEqual(["n"])
  })

  it("skips attributes", () => {
    expect(texOf('<a href="/a$b$c" title="x">$n$</a>')).toEqual(["n"])
  })

  it("tolerates an attribute containing a closing angle bracket", () => {
    expect(texOf(`<a title="a > b">$n$</a>`)).toEqual(["n"])
  })

  it("skips comments", () => {
    expect(texOf("<!-- $ignored$ --><p>$n$</p>")).toEqual(["n"])
  })

  it("decodes entities inside math", () => {
    expect(texOf("<p>$a &lt; b$</p>")).toEqual(["a < b"])
  })

  it("ignores empty delimiters", () => {
    expect(texOf("<p>$$$$</p>")).toEqual([])
  })

  it("finds every span on a line", () => {
    expect(texOf("<p>$m$ and $n$ and $r$</p>")).toEqual(["m", "n", "r"])
  })

  it("handles a self-closing opaque element", () => {
    expect(texOf("<code />$n$")).toEqual(["n"])
  })
})
