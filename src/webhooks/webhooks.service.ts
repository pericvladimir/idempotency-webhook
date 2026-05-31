import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWebhookDto } from "./dto/create-webhook.dto";

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWebhookDto) {
    const event = await this.prisma.webhookEvent.create({
      data: {
        source: dto.source,
        sourceEvent: dto.sourceEvent,
        payload: dto.payload,
      },
    });
    return {
      id: event.id,
      status: event.processingStatus,
    };
  }
}
