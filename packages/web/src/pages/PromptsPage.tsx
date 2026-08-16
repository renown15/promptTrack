import { useNavigate } from "react-router-dom";
import { PromptList } from "@/components/features/prompts/PromptList";
import "@/pages/PromptsPage.css";

export function PromptsPage() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="prompts-page__header">
        <h1 className="prompts-page__title">Prompts</h1>
        <button
          className="prompts-page__new-btn"
          onClick={() => navigate("/prompts/new")}
        >
          New prompt
        </button>
      </div>
      <PromptList />
    </div>
  );
}
