import { useNavigate } from "react-router-dom";
import type { PromptDTO } from "@prompttrack/shared";
import "@/components/features/prompts/PromptCard.css";

type Props = {
  prompt: PromptDTO;
};

export function PromptCard({ prompt }: Props) {
  const navigate = useNavigate();

  return (
    <div
      className="prompt-card"
      onClick={() => navigate(`/prompts/${prompt.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/prompts/${prompt.id}`)}
    >
      <div className="prompt-card__header">
        <h3 className="prompt-card__name">{prompt.name}</h3>
        <span
          className={`prompt-card__env prompt-card__env--${prompt.environment}`}
        >
          {prompt.environment}
        </span>
      </div>
      {prompt.description && (
        <p className="prompt-card__description">{prompt.description}</p>
      )}
      <div className="prompt-card__footer">
        {prompt.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="prompt-card__tag">
            {tag}
          </span>
        ))}
        <span className="prompt-card__version">v{prompt.currentVersion}</span>
      </div>
    </div>
  );
}
