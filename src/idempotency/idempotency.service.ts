import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "../generated/prisma/client";

@Injectable()
export class IdempotencyService {
  constructor(private prisma: PrismaService) {}

  async create(key: string, bodyHash: string) {
    return await this.prisma.idempotencyKey.create({
      data: {
        key,
        requestBodyHash: bodyHash,
      },
    });
  }

  async findByKey(key: string) {
    return await this.prisma.idempotencyKey.findUnique({
      where: { key },
    });
  }
  async markCompleted(
    key: string,
    responseCode: number,
    responseBody: Prisma.InputJsonValue,
  ) {
    return await this.prisma.idempotencyKey.update({
      where: { key },
      data: { recoveryPoint: "finished", responseCode, responseBody },
    });
  }
}
