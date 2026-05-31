# Idempotency Webhook

A NestJS service that receives webhook events and guarantees idempotent processing via an `Idempotency-Key` HTTP header. Duplicate requests with the same key replay the cached response; duplicate keys with a different body are rejected.

## Stack

- [NestJS 11](https://nestjs.com/) (Express platform)
- [Prisma 7](https://www.prisma.io/) with PostgreSQL 17
- TypeScript
- `class-validator` / `class-transformer` for DTO validation
- Docker Compose for local Postgres

## How idempotency works

The `IdempotencyInterceptor` ([src/idempotency/idempotency.interceptor.ts](src/idempotency/idempotency.interceptor.ts)) runs before the controller handler:

1. If the request has no `Idempotency-Key` header, it passes through untouched.
2. On first sight of a key, it stores `(key, sha256(body))` in the `idempotency_keys` table and lets the handler run. Once the handler resolves, it writes the response status code and body back onto the row.
3. On a repeat request with the same key:
   - If the body hash matches, the cached response code and body are returned directly — the handler is **not** executed again.
   - If the body hash differs, the request fails with `422 Unprocessable Entity` (`"Idempotency key reused with different body"`).

Body hashing is SHA-256 over the JSON-stringified body ([src/utils/hash.util.ts](src/utils/hash.util.ts)).

## Data model

See [prisma/schema.prisma](prisma/schema.prisma).

- `IdempotencyKey` — `key` (unique), `requestBodyHash`, `recoveryPoint` (`started` / `finished`), cached `responseCode` and `responseBody`, optional `lockedAt`.
- `WebhookEvent` — `source`, `sourceEvent`, `payload`, `processingStatus` (`RECEIVED | PROCESSING | COMPLETED | FAILED | SKIPPED`), retry metadata, optional 1:1 link to an `IdempotencyKey`.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts Postgres 17 on `localhost:5433` with user `dev` / password `dev` / database `idempotency`.

### 3. Configure environment

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://dev:dev@localhost:5433/idempotency"
```

### 4. Apply migrations and generate the Prisma client

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Run the app

```bash
npx ts-node src/main.ts
```

The server listens on [http://localhost:3001](http://localhost:3001).

## API

### `POST /webhooks`

Creates a webhook event. Wrapped by `IdempotencyInterceptor`.

**Headers**

| Header            | Required | Description                                                              |
| ----------------- | -------- | ------------------------------------------------------------------------ |
| `Content-Type`    | yes      | `application/json`                                                       |
| `Idempotency-Key` | no       | If present, enables idempotent replay for this `(key, body-hash)` pair.  |

**Body** ([CreateWebhookDto](src/webhooks/dto/create-webhook.dto.ts))

```json
{
  "source": "stripe",
  "sourceEvent": "payment_intent.succeeded",
  "payload": { "id": "pi_123", "amount": 4200 }
}
```

**Response** — `201 Created`

```json
{ "id": 1, "status": "RECEIVED" }
```

### Example

```bash
curl -X POST http://localhost:3001/webhooks \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 6f1b...abc" \
  -d '{"source":"stripe","sourceEvent":"payment_intent.succeeded","payload":{"id":"pi_123"}}'
```

Send the exact same request again with the same key — you'll get the same `{ "id": 1, "status": "RECEIVED" }` payload back, and no new `WebhookEvent` row will be created.

Change the body but keep the key — you'll get `422 Unprocessable Entity`.

## Project layout

```
src/
├── main.ts                            # Nest bootstrap, global ValidationPipe
├── app.module.ts
├── app.controller.ts
├── idempotency/
│   ├── idempotency.module.ts
│   ├── idempotency.service.ts         # CRUD on idempotency_keys
│   └── idempotency.interceptor.ts      # The interceptor described above
├── webhooks/
│   ├── webhooks.module.ts
│   ├── webhooks.controller.ts         # POST /webhooks
│   ├── webhooks.service.ts
│   └── dto/create-webhook.dto.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── utils/
│   └── hash.util.ts                   # sha256(JSON.stringify(body))
└── generated/prisma/                  # Prisma client output (gitignored in practice)
prisma/
├── schema.prisma
└── migrations/
docker-compose.yml                     # Postgres 17 on :5433
```

## Notes & limitations

- This is a learning/reference implementation. The schema includes fields for richer semantics (`recoveryPoint`, `lockedAt`, `WebhookEvent.processingStatus`, `retryCount`) that the current interceptor does not yet fully exercise — there is no row-level locking for concurrent in-flight requests sharing the same key, and no background processor for webhook events.
- Idempotency records are kept indefinitely; in production you would want a TTL/cleanup job (the `createdAt` index is already there for that).
- The interceptor only persists the response on success; failed handler executions leave a `started` row that will currently block retries with the same body returning the cached (empty) response only if `responseCode` is set. Treat error paths with care if you build on this.
