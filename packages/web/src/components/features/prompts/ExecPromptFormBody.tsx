import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import type { CreatePromptInput } from "@prompttrack/shared";
import { RichTextEditor } from "@/components/features/prompts/RichTextEditor";
import "@/components/features/prompts/ExecutivePromptModal.css";

type Props = {
  form: UseFormReturn<CreatePromptInput>;
  collectionName?: string | undefined;
  onExpandEditor: () => void;
};

export function ExecPromptFormBody({
  form,
  collectionName,
  onExpandEditor,
}: Props) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <>
      <div className="exec-modal__panel-label">New prompt</div>
      {collectionName && (
        <div className="exec-modal__project-badge">
          <span className="exec-modal__project-badge-label">Collection:</span>
          <span className="exec-modal__project-badge-name">
            &#128193; {collectionName}
          </span>
        </div>
      )}
      {errors.root && (
        <p className="exec-modal__form-error">{errors.root.message}</p>
      )}
      <div className="exec-modal__field">
        <label className="exec-modal__label" htmlFor="ep-name">
          Name
        </label>
        <input
          {...register("name")}
          id="ep-name"
          className="exec-modal__input"
          placeholder="Prompt name"
        />
        {errors.name && (
          <span className="exec-modal__field-error">{errors.name.message}</span>
        )}
      </div>
      <div className="exec-modal__field">
        <label className="exec-modal__label" htmlFor="ep-role">
          Role
        </label>
        <select
          {...register("role")}
          id="ep-role"
          className="exec-modal__select"
        >
          <option value="user">User</option>
          <option value="system">System</option>
          <option value="assistant">Assistant</option>
        </select>
      </div>
      <div className="exec-modal__field exec-modal__field--grow">
        <div className="exec-modal__content-label-row">
          <label className="exec-modal__label">Content</label>
          <button
            type="button"
            className="exec-modal__expand-btn"
            onClick={onExpandEditor}
            title="Expand editor"
          >
            ⛶
          </button>
        </div>
        <div className="exec-modal__editor-wrap">
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
        </div>
        {errors.content && (
          <span className="exec-modal__field-error">
            {errors.content.message}
          </span>
        )}
      </div>
      <div className="exec-modal__field">
        <label className="exec-modal__label" htmlFor="ep-description">
          Description
        </label>
        <input
          {...register("description")}
          id="ep-description"
          className="exec-modal__input"
          placeholder="Optional description"
        />
      </div>
    </>
  );
}
