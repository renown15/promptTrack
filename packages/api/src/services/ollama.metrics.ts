export interface MetricDefinition {
  name: string;
  label: string;
  description: string;
  trackSensitiveRefs?: boolean;
}

export const DEFAULT_METRICS: MetricDefinition[] = [
  {
    name: "architecture",
    label: "Arch",
    description:
      "Does this file respect layering and separation of concerns? Are there any boundary violations?",
  },
  {
    name: "complexity",
    label: "Cmplx",
    description:
      "Is this file overly complex, deeply nested, or hard to follow at a glance?",
  },
  {
    name: "naming",
    label: "Names",
    description:
      "Are identifiers (variables, functions, types) named clearly and consistently with the codebase conventions?",
  },
  {
    name: "security",
    label: "Sec",
    description:
      "Does this file contain security vulnerabilities or risky patterns? Look for injection risks, hardcoded secrets, insecure defaults, improper input validation, unsafe deserialization, or exposure of sensitive data. Also identify any file paths or filename patterns referenced, loaded, or written by this code that contain sensitive data (e.g. .env files, credential files, private keys, secrets config) and list them in sensitiveRefs.",
    trackSensitiveRefs: true,
  },
  {
    name: "eng_quality",
    label: "EngQ",
    description:
      "Does this file adhere to industry-standard engineering practices that support DevSecOps? Consider: error handling, observability (logging/tracing), testability, immutability, principle of least privilege, secrets management, and absence of technical debt that would impede secure delivery.",
  },
  {
    name: "dry",
    label: "DRY",
    description:
      "Does this file repeat patterns that should be abstracted? Look for: copy-pasted blocks of near-identical code, boilerplate that could be a helper or factory, multiple functions with the same shape differing only in a parameter, and any logic duplicated from nearby files. Green = minimal repetition. Amber = some duplication worth noting. Red = significant repetition that should be refactored.",
  },
];
