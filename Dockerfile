FROM rust:1.88-bookworm AS builder
WORKDIR /workspace
COPY backend/Cargo.toml backend/Cargo.lock* ./
COPY backend/src ./src
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /workspace/target/release/bchat-backend /usr/local/bin/bchat-backend
EXPOSE 8080
CMD ["bchat-backend"]
