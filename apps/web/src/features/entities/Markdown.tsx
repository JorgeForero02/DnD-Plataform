import ReactMarkdown from "react-markdown";
import { Panel } from "../../ui/Panel";

// The only place in the project that renders Markdown — keep it that way so there is a
// single spot to audit for the rules in CLAUDE.md (no innerHTML, no dangerouslySetInnerHTML).
// react-markdown never touches innerHTML and never parses raw HTML by default; no plugins are
// added here (no rehype-raw, no remark-gfm) because CommonMark is enough and every plugin is
// new surface.
//
// Task 1.19: this is one of the two consumers the token layer converts as proof it works end
// to end — world content sits on the vellum Panel (parchment surface, serif register, torn
// top edge, 66ch measure), the "manual" half of "la mesa y el manual". The selectors below
// still have no Tailwind typography plugin backing them, but every class now resolves through
// a token — never a literal colour. Links use --accent-text, not --accent: fix round 1,
// Critical 2 found plain --accent-on-vellum at 4.14:1 in the dark theme, below the 4.5:1 this
// spec itself requires for body text; --accent-text clears every dark surface (see tokens.css).
export function Markdown({ text }: { text: string }) {
  return (
    <Panel
      tone="vellum"
      className="space-y-2 [&_h1]:text-world-xl [&_h1]:font-bold [&_h2]:text-world-lg [&_h2]:font-bold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-accent-text [&_a]:underline [&_strong]:font-bold [&_em]:italic [&_code]:rounded-radius-sm [&_code]:bg-surface [&_code]:px-1 [&_code]:font-data [&_code]:text-text"
    >
      <ReactMarkdown>{text}</ReactMarkdown>
    </Panel>
  );
}
