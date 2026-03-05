const VARIABLE_RE = /\{\{([a-z_][a-z0-9_]*)\}\}/g;

export function extractVariables(content: string): string[] {
  const names = [...content.matchAll(VARIABLE_RE)].map((m) => m[1] as string);
  return [...new Set(names)];
}
