# bchat

A minimalist local chat app for LLMs. Rust (Axum) backend, SvelteKit frontend.

## Features

- Chat with streaming responses
- **Ollama** by default (`http://localhost:11434`), or **vLLM** via a separate Compose stack
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

## Quick start (Docker + vLLM)

Use the vLLM Compose file for GPU-accelerated inference via vLLM's OpenAI-compatible API (port 8000). The same [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) setup as above is required.

```bash
docker compose -f docker-compose.vllm.yml up --build
```

- Frontend: http://localhost:5173 (preconfigured for the **OpenAI-compatible** provider pointing at vLLM)
- Backend API: http://localhost:8080
- vLLM: http://localhost:8000/v1

On first start, vLLM downloads the model from Hugging Face into a Docker volume (`vllm_cache`). The default model is `Qwen/Qwen2.5-0.5B-Instruct` (small, suitable for quickstart). Override it:

```bash
VLLM_MODEL=meta-llama/Meta-Llama-3-8B-Instruct docker compose -f docker-compose.vllm.yml up --build
```

For gated models, set a Hugging Face token (never commit it):

```bash
export HUGGING_FACE_HUB_TOKEN=hf_...
docker compose -f docker-compose.vllm.yml up --build
```

vLLM needs a CUDA-capable NVIDIA GPU with enough VRAM for the chosen model. The first model load can take several minutes; wait until the `vllm` service is healthy before chatting.

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
