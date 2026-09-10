/**
 * Trim the blank lines around a block of text and the indentation every line
 * shares.
 *
 * Snippet content arrives indented to match the template it was written in, so
 * both the code samples and the diagram sources need the template's own
 * indentation taken back off before anything parses them.
 */
export function dedent(source: string): string {
  const lines = source.replace(/\t/g, "  ").split("\n")
  while (lines.length && lines[0].trim() === "") lines.shift()
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop()
  if (lines.length === 0) return ""

  const indent = Math.min(
    ...lines.filter((line) => line.trim() !== "").map((line) => line.match(/^ */)![0].length),
  )
  return lines.map((line) => line.slice(indent)).join("\n")
}
