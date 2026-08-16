import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import "@/components/features/collections/MarkdownViewer.css";

type Props = {
  content: string;
};

export function MarkdownViewer({ content }: Props) {
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
    content,
    editable: false,
    editorProps: {
      attributes: { class: "md-viewer__content" },
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setContent(content);
  }, [editor, content]);

  return (
    <div className="md-viewer">
      <EditorContent editor={editor} />
    </div>
  );
}
