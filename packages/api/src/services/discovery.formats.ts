// Jest/Vitest: { "total": { "lines": { total, covered } } }
// Python coverage.py: { "totals": { num_statements, covered_lines } }
export function parseCoverageAggregate(
  raw: unknown
): { total: number; covered: number } | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const jest = (
    obj["total"] as { lines?: { total?: number; covered?: number } } | undefined
  )?.lines;
  if (jest?.total !== undefined && jest.covered !== undefined)
    return { total: jest.total, covered: jest.covered };
  const py = obj["totals"] as
    | { num_statements?: number; covered_lines?: number }
    | undefined;
  if (py?.num_statements !== undefined && py.covered_lines !== undefined)
    return { total: py.num_statements, covered: py.covered_lines };
  return null;
}

// ESLint: [{ filePath, errorCount, warningCount }]
// Ruff: [{ filename, code, message }] — one entry per violation
export function parseLintAggregate(arr: unknown[]): {
  errors: number;
  warnings: number;
} {
  if (arr.length === 0) return { errors: 0, warnings: 0 };
  const first = arr[0];
  if (typeof first !== "object" || first === null)
    return { errors: 0, warnings: 0 };
  if ("errorCount" in first) {
    type EslintFile = { errorCount: number; warningCount: number };
    return (arr as EslintFile[]).reduce(
      (acc, r) => ({
        errors: acc.errors + r.errorCount,
        warnings: acc.warnings + r.warningCount,
      }),
      { errors: 0, warnings: 0 }
    );
  }
  if ("filename" in first) return { errors: arr.length, warnings: 0 };
  return { errors: 0, warnings: 0 };
}
