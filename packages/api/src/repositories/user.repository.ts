import { prisma } from "@/config/prisma.js";
import type { Role } from "@prisma/client";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CreateUserData = {
  email: string;
  passwordHash: string;
  name: string;
  role?: Role;
};

export const userRepository = {
  async findByEmail(email: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async findById(id: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async create(data: CreateUserData): Promise<UserRecord> {
    return prisma.user.create({ data });
  },

  async count(): Promise<number> {
    return prisma.user.count();
  },
};
