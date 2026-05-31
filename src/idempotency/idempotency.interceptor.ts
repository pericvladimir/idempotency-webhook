import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { mergeMap, Observable, of, tap } from "rxjs";
import { IdempotencyService } from "./idempotency.service";
import { hashBody } from "../utils/hash.util";

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private idempotencyService: IdempotencyService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const responseObj = context.switchToHttp().getResponse();

    const key = request.headers["idempotency-key"];

    if (!key) {
      return next.handle();
    }

    const body = request.body;

    const idempotentRequest = await this.idempotencyService.findByKey(key);
    const hashedBody = hashBody(body);

    if (!idempotentRequest) {
      await this.idempotencyService.create(key, hashedBody);

      return next.handle().pipe(
        mergeMap(async (response) => {
          const statusCode = responseObj.statusCode;
          await this.idempotencyService.markCompleted(
            key,
            statusCode,
            response,
          );
          return response;
        }),
      );
    } else {
      const isHashSame = hashedBody === idempotentRequest.requestBodyHash;
      if (!isHashSame) {
        throw new HttpException(
          "Idempotency key reused with different body",
          422,
        );
      }
      if (idempotentRequest.responseCode) {
        responseObj.status(idempotentRequest.responseCode);
      }
      return of(idempotentRequest.responseBody);
    }
  }
}
