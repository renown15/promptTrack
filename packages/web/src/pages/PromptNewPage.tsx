import { useNavigate } from "react-router-dom";
import { PromptEditor } from "@/components/features/prompts/PromptEditor";
import { useCreatePrompt } from "@/hooks/usePrompts";
import type { CreatePromptInput } from "@prompttrack/shared";

export function PromptNewPage() {
  const navigate = useNavigate();
  const createPrompt = useCreatePrompt();

  const handleSubmit = async (data: CreatePromptInput) => {
    const prompt = await createPrompt.mutateAsync(data);
    navigate(`/prompts/${prompt.id}`);
  };

  return (
    <div>
      <h1>New Prompt</h1>
      <PromptEditor
        onSubmit={handleSubmit}
        onCancel={() => navigate("/prompts")}
        submitLabel="Create prompt"
      />
    </div>
  );
}
