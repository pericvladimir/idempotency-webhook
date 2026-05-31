import { Body, Controller, Post, UseInterceptors } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { CreateWebhookDto } from "./dto/create-webhook.dto";
import { IdempotencyInterceptor } from "../idempotency/idempotency.interceptor";

@Controller("webhooks")
@UseInterceptors(IdempotencyInterceptor)
export class WebhooksController {
  constructor(private service: WebhooksService) {}

  @Post()
  async create(@Body() dto: CreateWebhookDto) {
    return this.service.create(dto);
  }
}
