/**
 * Client-side DAG cycle detection using DFS.
 * Returns true if adding an edge from sourceId → targetId would create a cycle.
 */
export function wouldCreateCycle(
  existingEdges: Array<{ source: string; target: string }>,
  sourceId: string,
  targetId: string
): boolean {
  // Build adjacency list including the proposed new edge
  const adj = new Map<string, string[]>();

  for (const edge of existingEdges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  }

  if (!adj.has(sourceId)) adj.set(sourceId, []);
  adj.get(sourceId)!.push(targetId);

  // DFS from targetId — if we reach sourceId again, there is a cycle
  const visited = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (nodeId === sourceId) return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    for (const neighbour of adj.get(nodeId) ?? []) {
      if (dfs(neighbour)) return true;
    }
    return false;
  }

  return dfs(targetId);
}

/**
 * Validate that a complete edge list forms a valid DAG.
 * Returns an array of error messages (empty = valid).
 */
export function validateDag(
  edges: Array<{ source: string; target: string }>
): string[] {
  const errors: string[] = [];

  edges.forEach((edge, i) => {
    const prior = edges.slice(0, i);
    if (wouldCreateCycle(prior, edge.source, edge.target)) {
      errors.push(`Edge ${edge.source} → ${edge.target} creates a cycle`);
    }
  });

  return errors;
}
