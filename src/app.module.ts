import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { IdempotencyModule } from "./idempotency/idempotency.module";

@Module({
  imports: [PrismaModule, WebhooksModule, IdempotencyModule],
  controllers: [AppController],
})
export class AppModule {}
