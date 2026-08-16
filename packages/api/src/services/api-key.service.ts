import { decryptKey, encryptKey } from "@/lib/encryption.js";
import { apiKeyRepository } from "@/repositories/api-key.repository.js";
import { createHash, randomBytes } from "crypto";

function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export const apiKeyService = {
  async generate(collectionId: string, name: string) {
    const raw = randomBytes(32).toString("hex");
    const plaintext = `pt_${raw}`;
    const keyHash = hashKey(plaintext);
    const keyPrefix = plaintext.slice(0, 10); // "pt_" + 7 chars
    const encryptedKey = encryptKey(plaintext);

    const record = await apiKeyRepository.create({
      name,
      keyHash,
      keyPrefix,
      key: encryptedKey,
      collectionId,
    });

    return { record, plaintext };
  },

  async list(collectionId: string) {
    return apiKeyRepository.findByCollection(collectionId);
  },

  async getFullKey(id: string, collectionId: string): Promise<string | null> {
    const record = await apiKeyRepository.findById(id);
    if (!record || record.collectionId !== collectionId || !record.key)
      return null;
    return decryptKey(record.key);
  },

  async revoke(id: string, collectionId: string): Promise<void> {
    await apiKeyRepository.revoke(id, collectionId);
  },

  async validate(
    plaintext: string
  ): Promise<{ collectionId: string; directory: string | null } | null> {
    const keyHash = hashKey(plaintext);
    const record = await apiKeyRepository.findByHash(keyHash);
    if (!record || record.revokedAt !== null) return null;
    return {
      collectionId: record.collectionId,
      directory: record.collection.directory,
    };
  },
};
