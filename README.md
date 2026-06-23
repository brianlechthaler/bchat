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

The Compose stack includes **Ollama with NVIDIA GPU access by default** (`gpus: all`). Install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) and configure Docker before starting:

```bash
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi   # verify GPU access
```

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- Ollama: http://localhost:11434 (GPU-accelerated when NVIDIA drivers are available)

On a machine without a GPU, use the CPU override:

```bash
docker compose -f docker-compose.yml -f docker-compose.cpu.yml up --build
```

Pull a model after the stack is up, for example: `docker compose exec ollama ollama pull llama3.2`

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
