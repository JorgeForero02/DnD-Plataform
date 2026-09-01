import ReactMarkdown from "react-markdown";

// The only place in the project that renders Markdown — keep it that way so there is a
// single spot to audit for the rules in CLAUDE.md (no innerHTML, no dangerouslySetInnerHTML).
// react-markdown never touches innerHTML and never parses raw HTML by default; no plugins are
// added here (no rehype-raw, no remark-gfm) because CommonMark is enough and every plugin is
// new surface. The minimal classes below only keep headings and lists from rendering flat —
// the project has no Tailwind typography plugin, and a real design system is task 1.19.
export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline [&_strong]:font-bold [&_em]:italic [&_code]:rounded [&_code]:bg-slate-700 [&_code]:px-1">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}
