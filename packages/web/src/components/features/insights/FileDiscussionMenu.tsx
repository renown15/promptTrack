import { useEffect, useRef, useState } from "react";
import type { ConversationMessage } from "@/api/endpoints/file-inspector";
import { useFileDiscussion } from "@/hooks/useFileInspector";
import "@/components/features/insights/FileDiscussionMenu.css";

type Props = {
  collectionId: string;
  relativePath: string;
  triggerRect: DOMRect;
  onClose: () => void;
};

export function FileDiscussionMenu({
  collectionId,
  relativePath,
  triggerRect,
  onClose,
}: Props) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const discussion = useFileDiscussion(collectionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        // Only close if not clicking on other trigger buttons
        const triggerButtons = document.querySelectorAll(".file-discuss-btn");
        for (const btn of triggerButtons) {
          if (btn.contains(e.target as Node)) return;
        }
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleSend = async () => {
    if (!input.trim() || discussion.isPending) return;

    const userMessage: ConversationMessage = {
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const { response } = await discussion.mutateAsync({
        relativePath,
        message: userMessage.content,
        history: messages,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
    } catch (err) {
      console.error("Discussion error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Error: Unable to get response. Please check Ollama configuration.",
        },
      ]);
    }
  };

  // Calculate menu position relative to trigger button
  const X = triggerRect.right + 8;
  const Y = triggerRect.top;

  return (
    <div
      ref={menuRef}
      className="file-discuss-menu"
      style={{
        position: "fixed",
        left: `${X}px`,
        top: `${Y}px`,
        zIndex: 9999,
      }}
    >
      <div className="file-discuss-menu__header">
        <span className="file-discuss-menu__title">
          Discuss: {relativePath.split("/").pop()}
        </span>
        <button
          className="file-discuss-menu__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="file-discuss-menu__messages">
        {messages.length === 0 && (
          <div className="file-discuss-menu__empty">
            Ask me anything about this file...
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`file-discuss-menu__message file-discuss-menu__message--${msg.role}`}
          >
            <div className="file-discuss-menu__message-content">
              {msg.content}
            </div>
          </div>
        ))}
        {discussion.isPending && (
          <div className="file-discuss-menu__message file-discuss-menu__message--assistant">
            <div className="file-discuss-menu__loading">
              <span className="file-discuss-menu__spinner" />
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="file-discuss-menu__input-area">
        <input
          type="text"
          className="file-discuss-menu__input"
          placeholder="Ask about this file..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={discussion.isPending}
          autoFocus
        />
        <button
          className="file-discuss-menu__send"
          onClick={handleSend}
          disabled={!input.trim() || discussion.isPending}
          aria-label="Send"
        >
          →
        </button>
      </div>

      {discussion.isError && (
        <div className="file-discuss-menu__error">
          {(discussion.error as Error)?.message || "An error occurred"}
        </div>
      )}
    </div>
  );
}
