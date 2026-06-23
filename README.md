# bchat

A minimalist local chat app for LLMs. Rust (Axum) backend, SvelteKit frontend.

## Features

- Chat with streaming responses
- **Ollama** by default (`http://localhost:11434`)
- Multiple **OpenAI-compatible** endpoints and API keys
- Settings: model, temperature, max tokens, top-p, system prompt
- Dark mode
- Chat history stored in browser `localStorage`

## Quick start (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080

Ensure [Ollama](https://ollama.com) is running locally. From Docker, the default Ollama URL in settings should be `http://host.docker.internal:11434`.

## Development

```bash
# Backend tests
docker compose run --rm test-backend

# Frontend tests + coverage
docker compose run --rm test-frontend

# Lint
docker compose run --rm lint-frontend
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET/POST | `/api/models` | List models (POST for OpenAI credentials) |
| POST | `/api/chat` | Stream chat completion (SSE) |

## License

MIT
