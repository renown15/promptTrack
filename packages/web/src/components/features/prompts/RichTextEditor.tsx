import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { RichTextToolbar } from "@/components/features/prompts/RichTextToolbar";
import "@/components/features/prompts/RichTextEditor.css";

type Props = {
  value: string;
  onChange: (markdown: string) => void;
};

export function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        strike: false,
        horizontalRule: false,
        heading: { levels: [1, 2, 3] },
      }),
      Markdown.configure({ html: false, tightLists: true }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => {
      const md = (
        e.storage as unknown as { markdown: { getMarkdown: () => string } }
      ).markdown;
      onChange(md.getMarkdown());
    },
    editorProps: {
      attributes: { class: "wysiwyg-editor__content" },
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const md = (
      editor.storage as unknown as { markdown: { getMarkdown: () => string } }
    ).markdown;
    if (md.getMarkdown() !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  return (
    <div className="wysiwyg-editor">
      <RichTextToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
