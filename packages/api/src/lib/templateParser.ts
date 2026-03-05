const VARIABLE_RE = /\{\{([a-z_][a-z0-9_]*)\}\}/g;

/**
 * Extract all unique {{variable_name}} tokens from a string.
 */
export function extractVariables(content: string): string[] {
  const names = [...content.matchAll(VARIABLE_RE)].map((m) => m[1] as string);
  return [...new Set(names)];
}

/**
 * Replace {{variable_name}} tokens with values from the map.
 * Unresolved tokens are left in place and their names collected.
 */
export function substituteVariables(
  content: string,
  variables: Record<string, string>
): { result: string; unresolved: string[] } {
  const unresolved: string[] = [];

  const result = content.replace(VARIABLE_RE, (_, name: string) => {
    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      return variables[name] as string;
    }
    if (!unresolved.includes(name)) unresolved.push(name);
    return `{{${name}}}`;
  });

  return { result, unresolved };
}
