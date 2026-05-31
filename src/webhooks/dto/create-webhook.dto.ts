import { IsString, IsNotEmpty, IsObject, isNotEmpty } from "class-validator";

export class CreateWebhookDto {
  @IsString()
  @IsNotEmpty()
  source!: string;

  @IsString()
  @IsNotEmpty()
  sourceEvent!: string;

  @IsObject()
  payload!: Record<string, any>;
}
