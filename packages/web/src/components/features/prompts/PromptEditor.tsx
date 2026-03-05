import { useForm, Controller } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreatePromptSchema } from "@prompttrack/shared";
import type { CreatePromptInput } from "@prompttrack/shared";
import { RichTextEditor } from "@/components/features/prompts/RichTextEditor";
import "@/components/features/prompts/PromptEditor.css";

type Props = {
  onSubmit: (data: CreatePromptInput) => Promise<void>;
  onCancel: () => void;
  defaultValues?: Partial<CreatePromptInput>;
  submitLabel?: string;
};

export function PromptEditor({
  onSubmit,
  onCancel,
  defaultValues,
  submitLabel = "Save",
}: Props) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreatePromptInput>({
    resolver: zodResolver(
      CreatePromptSchema
    ) as unknown as Resolver<CreatePromptInput>,
    defaultValues: {
      tags: [],
      variables: [],
      role: "user",
      modelParameters: { temperature: 0.7, maxTokens: 1000 },
      ...defaultValues,
    },
  });

  const handleFormSubmit = async (data: CreatePromptInput) => {
    try {
      await onSubmit(data);
    } catch {
      setError("root", { message: "Failed to save prompt. Please try again." });
    }
  };

  return (
    <form className="prompt-editor" onSubmit={handleSubmit(handleFormSubmit)}>
      {errors.root && (
        <p className="prompt-editor__global-error">{errors.root.message}</p>
      )}
      <div className="prompt-editor__field">
        <label className="prompt-editor__label" htmlFor="name">
          Name
        </label>
        <input
          {...register("name")}
          id="name"
          className="prompt-editor__input"
          placeholder="My prompt name"
        />
        {errors.name && (
          <span className="prompt-editor__error">{errors.name.message}</span>
        )}
      </div>
      <div className="prompt-editor__field">
        <label className="prompt-editor__label" htmlFor="role">
          Role
        </label>
        <select
          {...register("role")}
          id="role"
          className="prompt-editor__select"
        >
          <option value="user">User</option>
          <option value="system">System</option>
          <option value="assistant">Assistant</option>
        </select>
      </div>
      <div className="prompt-editor__field">
        <label className="prompt-editor__label">Content</label>
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          )}
        />
        {errors.content && (
          <span className="prompt-editor__error">{errors.content.message}</span>
        )}
      </div>
      <div className="prompt-editor__field">
        <label className="prompt-editor__label" htmlFor="description">
          Description
        </label>
        <input
          {...register("description")}
          id="description"
          className="prompt-editor__input"
          placeholder="Optional description"
        />
      </div>
      <div className="prompt-editor__actions">
        <button
          type="button"
          className="prompt-editor__cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="prompt-editor__submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
