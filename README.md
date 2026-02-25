# Yak

Personal AI chat. Self-hosted, model-agnostic, private.

Accessible at `chat.funnydomainname.com`. Built with Next.js 16, AI SDK, shadcn/ui.

## Stack

- **Chat models**: Groq (Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B) + CLIProxyAPI (Gemini 3, GPT-5.x)
- **Database**: SQLite via Drizzle ORM
- **File uploads**: Garage S3-compatible object store
- **Memory**: Gradient memory layer — rolling summary + tiered distillation + FTS5 search
- **Jobs**: Supercronic — finalize idle chats every 30min, compress memory at 4am
- **Auth**: Auth.js (credentials)

## Run locally

Copy `.env.example` to `.env.local` and fill in the required values.

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

App runs at [localhost:3000](http://localhost:3000).

## Docker (production)

```bash
docker compose up -d
```

Starts: garage → cliproxy → migrate → app → jobs.

## E2E tests

See [tests/README.md](tests/README.md).
