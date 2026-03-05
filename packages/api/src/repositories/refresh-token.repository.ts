import { prisma } from "@/config/prisma.js";

type CreateTokenData = {
  token: string;
  userId: string;
  expiresAt: Date;
};

export const refreshTokenRepository = {
  async create(data: CreateTokenData): Promise<void> {
    await prisma.refreshToken.create({ data });
  },

  async findByToken(token: string) {
    return prisma.refreshToken.findUnique({ where: { token } });
  },

  async deleteByToken(token: string): Promise<void> {
    await prisma.refreshToken.delete({ where: { token } }).catch(() => {
      // Ignore if token not found
    });
  },

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  },

  async deleteExpired(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  },
};
