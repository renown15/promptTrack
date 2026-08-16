import { chainRepository } from "@/repositories/chain.repository.js";
import { chainVersionRepository } from "@/repositories/chain-version.repository.js";
import { promptRepository } from "@/repositories/prompt.repository.js";
import { promptVersionRepository } from "@/repositories/prompt-version.repository.js";
import { substituteVariables } from "@/lib/templateParser.js";
import type {
  ChainNodeRecord,
  ChainEdgeRecord,
} from "@/repositories/chain-version.repository.js";
import type { SerialiserOutput } from "@prompttrack/shared";

export class ChainCycleError extends Error {
  readonly statusCode = 422;
  constructor() {
    super("Chain contains a cycle");
    this.name = "ChainCycleError";
  }
}

export class ChainNotFoundError extends Error {
  readonly statusCode = 404;
  constructor() {
    super("Chain or chain version not found");
    this.name = "ChainNotFoundError";
  }
}

function topoSort(
  nodes: ChainNodeRecord[],
  edges: ChainEdgeRecord[]
): ChainNodeRecord[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map(nodes.map((n) => [n.id, 0]));
  const adj = new Map(nodes.map((n) => [n.id, [] as string[]]));

  for (const edge of edges) {
    adj.get(edge.sourceNodeId)?.push(edge.targetNodeId);
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
  }

  const queue = nodes
    .filter((n) => (inDegree.get(n.id) ?? 0) === 0)
    .map((n) => n.id);
  const result: ChainNodeRecord[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(nodeMap.get(id)!);
    for (const neighbour of adj.get(id) ?? []) {
      const deg = (inDegree.get(neighbour) ?? 0) - 1;
      inDegree.set(neighbour, deg);
      if (deg === 0) queue.push(neighbour);
    }
  }

  if (result.length !== nodes.length) throw new ChainCycleError();
  return result;
}

export const chainSerialiserService = {
  async serialise(
    chainId: string,
    variables: Record<string, string>
  ): Promise<SerialiserOutput> {
    const chain = await chainRepository.findById(chainId);
    if (!chain) throw new ChainNotFoundError();

    const version = await chainVersionRepository.findCurrent(chainId);
    if (!version) throw new ChainNotFoundError();

    const sorted = topoSort(version.nodes, version.edges);

    const messages: Array<{ role: string; content: string }> = [];
    const allUnresolved = new Set<string>();

    for (const node of sorted) {
      let content: string;
      let role: string;

      if (node.refType === "copy") {
        const pv = await promptVersionRepository.findByVersion(
          node.promptId,
          node.promptVersionNumber
        );
        role = pv?.role ?? "user";
        content = node.snapshotContent ?? "";
      } else {
        const prompt = await promptRepository.findById(node.promptId);
        if (!prompt) continue;
        const pv = await promptVersionRepository.findByVersion(
          node.promptId,
          prompt.currentVersion
        );
        if (!pv) continue;
        role = pv.role;
        content = pv.content;
      }

      const { result, unresolved } = substituteVariables(content, variables);
      unresolved.forEach((v) => allUnresolved.add(v));
      messages.push({ role, content: result });
    }

    const contextString = messages
      .map((m) => `[${m.role}]: ${m.content}`)
      .join("\n\n");

    return {
      messages,
      contextString,
      tokenEstimate: Math.ceil(contextString.length / 4),
      unresolvedVariables: [...allUnresolved],
    };
  },
};
