import type { Editor } from "@tiptap/react";
import "@/components/features/prompts/RichTextToolbar.css";

type Props = {
  editor: Editor | null;
};

type ToolbarButton = {
  key: string;
  label: string;
  title: string;
  action: (editor: Editor) => void;
  isActive: (editor: Editor) => boolean;
};

const BUTTONS: ToolbarButton[] = [
  {
    key: "h1",
    label: "H1",
    title: "Heading 1",
    action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (e) => e.isActive("heading", { level: 1 }),
  },
  {
    key: "h2",
    label: "H2",
    title: "Heading 2",
    action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (e) => e.isActive("heading", { level: 2 }),
  },
  {
    key: "h3",
    label: "H3",
    title: "Heading 3",
    action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (e) => e.isActive("heading", { level: 3 }),
  },
  {
    key: "bold",
    label: "B",
    title: "Bold",
    action: (e) => e.chain().focus().toggleBold().run(),
    isActive: (e) => e.isActive("bold"),
  },
  {
    key: "italic",
    label: "I",
    title: "Italic",
    action: (e) => e.chain().focus().toggleItalic().run(),
    isActive: (e) => e.isActive("italic"),
  },
  {
    key: "bullet",
    label: "•—",
    title: "Bullet list",
    action: (e) => e.chain().focus().toggleBulletList().run(),
    isActive: (e) => e.isActive("bulletList"),
  },
  {
    key: "ordered",
    label: "1.",
    title: "Ordered list",
    action: (e) => e.chain().focus().toggleOrderedList().run(),
    isActive: (e) => e.isActive("orderedList"),
  },
  {
    key: "code",
    label: "`",
    title: "Inline code",
    action: (e) => e.chain().focus().toggleCode().run(),
    isActive: (e) => e.isActive("code"),
  },
  {
    key: "codeblock",
    label: "```",
    title: "Code block",
    action: (e) => e.chain().focus().toggleCodeBlock().run(),
    isActive: (e) => e.isActive("codeBlock"),
  },
];

export function RichTextToolbar({ editor }: Props) {
  if (!editor) return null;

  return (
    <div className="wysiwyg-toolbar" role="toolbar" aria-label="Formatting">
      {BUTTONS.map((btn) => (
        <button
          key={btn.key}
          type="button"
          title={btn.title}
          onClick={() => btn.action(editor)}
          className={`wysiwyg-toolbar__btn${btn.isActive(editor) ? " wysiwyg-toolbar__btn--active" : ""}`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
