import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import type { MarkdownStorage } from "tiptap-markdown";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2
} from "lucide-react";
import { cn } from "@three-acts/utils";
import { BareIconButton } from "./bare-icon-button";
import { inputVariants } from "./styles";

// tiptap-markdown doesn't ship this augmentation itself (its types predate
// Tiptap v3's `Storage` interface), so `editor.storage.markdown` is
// otherwise untyped.
declare module "@tiptap/core" {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

// Content-area styling: Tailwind's preflight zeroes out heading/list/quote
// styling globally, so ProseMirror's plain output needs it restored here to
// read as formatted rich text rather than plain paragraphs.
const contentClass = cn(
  "min-w-0 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-ui-lg [&_h1]:font-semibold [&_h1]:text-cms-text [&_h1:first-child]:mt-0",
  "[&_h2]:mb-1.5 [&_h2]:mt-3 [&_h2]:text-field [&_h2]:font-semibold [&_h2]:text-cms-text [&_h2:first-child]:mt-0",
  "[&_h3]:mb-1 [&_h3]:mt-2.5 [&_h3]:text-ui [&_h3]:font-semibold [&_h3]:text-cms-text [&_h3:first-child]:mt-0",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-0.5",
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-cms-line-strong [&_blockquote]:pl-3 [&_blockquote]:text-cms-muted",
  "[&_a]:text-cms-accent [&_a]:underline",
  "[&_strong]:font-semibold [&_em]:italic [&_s]:line-through [&_u]:underline"
);

function ToolbarToggle({
  active,
  disabled,
  icon,
  label,
  onClick
}: {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <BareIconButton
      aria-label={label}
      aria-pressed={active}
      className={cn(active && "bg-cms-raised text-cms-text")}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
    </BareIconButton>
  );
}

function ToolbarSeparator() {
  return <span aria-hidden="true" className="mx-0.5 h-4 w-px shrink-0 bg-cms-line-strong" />;
}

type RichTextEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  readOnly?: boolean;
};

/**
 * TipTap (ProseMirror) editor configured for GitHub-flavoured markdown in/out
 * via `tiptap-markdown`. This is the heavy implementation module — it's only
 * ever reached through `rich-text-field.tsx`'s `React.lazy` wrapper, so the
 * editor bundle loads only when a `richtext` field is actually on screen.
 */
export default function RichTextEditor({ value, onChange, readOnly }: RichTextEditorProps) {
  const [showSource, setShowSource] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true }
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true
      })
    ],
    content: value,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.storage.markdown.getMarkdown());
    },
    editorProps: {
      attributes: {
        class: cn(contentClass, "min-h-22 px-2 py-1.5 text-field text-cms-text focus:outline-none")
      }
    }
  });

  // Keep the editor synced with a `value` that changed for reasons other than
  // the user's own typing here (record switch, discard, reload, or the
  // source-textarea edits below) — but only when it actually differs from
  // what this editor last produced, so a normal keystroke never gets its
  // content force-reset mid-edit (which would also clobber the cursor).
  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = editor.storage.markdown.getMarkdown();

    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  if (!editor) {
    return <div className={cn(inputVariants({ tone: "display" }), "min-h-22")}>Loading editor…</div>;
  }

  function toggleLink() {
    if (!editor) {
      return;
    }

    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const url = window.prompt("Link URL");

    if (!url) {
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  if (readOnly) {
    return (
      <div className={cn(inputVariants({ tone: "display" }), "min-h-22 items-start whitespace-normal py-1.5")}>
        <EditorContent className={contentClass} editor={editor} />
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-0.5 rounded-cms border border-cms-line-strong bg-cms-surface p-1">
        <ToolbarToggle
          active={editor.isActive("heading", { level: 1 })}
          icon={<Heading1 size={14} />}
          label="Heading 1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolbarToggle
          active={editor.isActive("heading", { level: 2 })}
          icon={<Heading2 size={14} />}
          label="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarToggle
          active={editor.isActive("heading", { level: 3 })}
          icon={<Heading3 size={14} />}
          label="Heading 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <ToolbarToggle
          active={editor.isActive("paragraph")}
          icon={<Pilcrow size={14} />}
          label="Paragraph"
          onClick={() => editor.chain().focus().setParagraph().run()}
        />
        <ToolbarSeparator />
        <ToolbarToggle
          active={editor.isActive("bold")}
          icon={<Bold size={14} />}
          label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarToggle
          active={editor.isActive("italic")}
          icon={<Italic size={14} />}
          label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarToggle
          active={editor.isActive("underline")}
          icon={<UnderlineIcon size={14} />}
          label="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarToggle
          active={editor.isActive("strike")}
          icon={<Strikethrough size={14} />}
          label="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolbarSeparator />
        <ToolbarToggle
          active={editor.isActive("bulletList")}
          icon={<List size={14} />}
          label="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarToggle
          active={editor.isActive("orderedList")}
          icon={<ListOrdered size={14} />}
          label="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarToggle
          active={editor.isActive("blockquote")}
          icon={<Quote size={14} />}
          label="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarToggle active={editor.isActive("link")} icon={<Link2 size={14} />} label="Link" onClick={toggleLink} />
        <ToolbarSeparator />
        <ToolbarToggle
          icon={<Undo2 size={14} />}
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarToggle
          icon={<Redo2 size={14} />}
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
        />
        <span className="ml-auto" />
        <ToolbarToggle
          active={showSource}
          icon={<Code2 size={14} />}
          label="Toggle markdown source"
          onClick={() => setShowSource((current) => !current)}
        />
      </div>
      {showSource ? (
        <textarea
          className={cn(inputVariants(), "min-h-22 resize-y font-mono leading-6")}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      ) : (
        // Clicking anywhere in the padded surface (not just the text itself)
        // focuses the underlying contenteditable, which already has full
        // keyboard support of its own.
        <div
          className={cn(inputVariants(), "min-h-22 cursor-text items-start p-0")}
          onClick={() => editor.chain().focus().run()}
        >
          <EditorContent className="w-full" editor={editor} />
        </div>
      )}
    </div>
  );
}
