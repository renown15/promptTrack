import { chainRepository } from "@/repositories/chain.repository.js";
import { chainVersionRepository } from "@/repositories/chain-version.repository.js";
import { promptRepository } from "@/repositories/prompt.repository.js";
import { promptVersionRepository } from "@/repositories/prompt-version.repository.js";
import { extractVariables } from "@/lib/templateParser.js";
import { ChainError } from "@/services/chain.service.js";

export const chainVariablesService = {
  async getVariables(chainId: string): Promise<string[]> {
    const chain = await chainRepository.findById(chainId);
    if (!chain) throw new ChainError("Chain not found", 404);

    const version = await chainVersionRepository.findCurrent(chainId);
    if (!version) return [];

    const allNames = new Set<string>();

    for (const node of version.nodes) {
      let content: string;

      if (node.refType === "copy") {
        content = node.snapshotContent ?? "";
      } else {
        const prompt = await promptRepository.findById(node.promptId);
        if (!prompt) continue;
        const pv = await promptVersionRepository.findByVersion(
          node.promptId,
          prompt.currentVersion
        );
        content = pv?.content ?? "";
      }

      extractVariables(content).forEach((v) => allNames.add(v));
    }

    return [...allNames];
  },
};
