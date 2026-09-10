# Build-time TeX

`$...$` and `$$...$$` in any `.svelte` file are typeset by MathJax during the
build and replaced with inline SVG. Pages ship typeset math and no MathJax
runtime, so there is no flash of raw TeX and nothing to load.

```svelte
<p>Given a positive integer $n$, find $n!$.</p>

<p>$$n! = \prod_{(k = 1)}^{n} k$$</p>
```

## How it fits together

| File            | Role                                                       |
| --------------- | ---------------------------------------------------------- |
| `scan.ts`       | Finds math spans in raw Svelte markup                      |
| `render.ts`     | Converts one expression to SVG, and picks the TeX packages |
| `macros.ts`     | Macros available to every expression on the site           |
| `preprocess.ts` | The Svelte preprocessor, registered in `vite.config.ts`    |

`scan.ts` runs against raw source, before Svelte parses it. That is what lets
`$\frac{n}{2}$` work — Svelte would otherwise read those braces as an
expression tag. The trade is that the scanner steps over tags, attributes,
comments, `{...}` expressions and the bodies of `script`, `style`, `pre` and
`code` itself, rather than getting them from an AST.

## Authoring rules

- A literal dollar sign is `\$`.
- Inline math never crosses a blank line, and neither delimiter may sit against
  a space: `$ 5` and `5 $` stay prose. Both rules exist so a lone `$` in running
  text cannot swallow the paragraph after it.
- `$` inside `script`, `style`, `pre`, `code`, an attribute, a comment or a
  `{...}` expression is left alone, so runes and shell prompts are safe.
- `<` and `>` need to be `\lt`, `\gt`, `&lt;` or `&gt;`, because Svelte reads a
  bare `<` as the start of a tag.

## Adding a TeX package

MathJax 4 dropped the `AllPackages` barrel, so `render.ts` names the packages
the site supports and imports each one's configuration module. Adding one means
an import plus an entry in `packages` — and a test in `render.spec.ts` that
exercises it, so a package cannot silently fall out of the list.

A bad expression throws at build time with its file, line and column rather than
rendering MathJax's red error markup into the page.
