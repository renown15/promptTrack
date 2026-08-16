import "@/components/features/chains/ChainVariableForm.css";

type Props = {
  variables: string[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
};

export function ChainVariableForm({ variables, values, onChange }: Props) {
  if (variables.length === 0) return null;

  const handleChange = (name: string, value: string) => {
    onChange({ ...values, [name]: value });
  };

  return (
    <div className="chain-variable-form">
      <h3 className="chain-variable-form__title">Variables</h3>
      <div className="chain-variable-form__fields">
        {variables.map((name) => (
          <label key={name} className="chain-variable-form__field">
            <span className="chain-variable-form__label">{`{{${name}}}`}</span>
            <input
              className="chain-variable-form__input"
              type="text"
              value={values[name] ?? ""}
              onChange={(e) => handleChange(name, e.target.value)}
              placeholder={`Value for ${name}`}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
