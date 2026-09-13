import ReactMarkdown from "react-markdown";

export function MessageContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="whitespace-pre-wrap leading-6 [&:not(:first-child)]:mt-2">{children}</p>,
        ul: ({ children }) => <ul className="mt-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-5">{children}</ol>,
        code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>,
        pre: ({ children }) => <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs">{children}</pre>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
