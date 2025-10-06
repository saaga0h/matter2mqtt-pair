# matter2mqtt-pair

This is paring helper and simple management UI tool to be used with matter2mqtt router. Tool offers pairing via camera or manually adding metter device code, this information is them updated to devices.yaml, same what matter2mqtt uses. And devices should appear on UI when paired.

> **Status: Work in Progress**
>
> This project is under active development and is not yet production-ready. Breaking changes and incomplete features are expected. Contributions and feedback are welcome!

# Quick Start

Start the pairing tool (HTTP, no TLS):
```sh
matter2mqtt-pair --devices=/path/to/devices.yaml
```

Open browser to http://localhost:8081

**Note**: Camera-based QR scanning requires HTTPS on iOS devices. Use --tls flag with certificates for mobile pairing.

## Self-signed certificate

Create one for matter2mqtt-pair

```sh
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout key.pem -out cert.pem -days 365 \
  -subj "/CN=192.168.1.100" \
  -addext "subjectAltName=IP:192.168.1.100"

```

To run server with TLS enabled newly created certs, your broser may complein about certificates as they are self signed and you may need to accept them before able to access pairing tool.

```sh
matter2mqtt-pair --tls --cert cert.pem --key key.pem
```

## Configuration

Devices path can be set via environment variable:
```sh
DEVICES_YAML=/etc/matter2mqtt/devices.yaml
PORT=8081
STORAGE_PATH=/var/lib/matter2mqtt
CHIP_TOOL_PATH=/usr/local/bin/chip-tool
TLS_ENABLED=true
TLS_CERT=cert.pem
TLS_KEY=key.pem
```

## Command line flags

Command line flags override environment variables.

```sh
matter2mqtt-pair
  --tls
  -tls
    	Enable HTTPS

  --cert
  -cert string
    	TLS certificate file (default "cert.pem")

  --key string
  -key string
    	TLS key file (default "key.pem")

  --chip-tool string
  -chip-tool string
    	Path to chip-tool binary (default "chip-tool")

  --devices string
  -devices string
    	Path to devices.yaml

  --port int
  -port int
    	HTTP server port (default 8081)

  --storage string
  -storage string
    	chip-tool storage directory (default "/var/lib/matter2mqtt")
```

## Docker build

### Architecture Note

⚠️ **Important:** chip-tool must match your deployment architecture.

Chip-tool used within docker container must match the architecture on server where docker is ran, to cross compile chip-tool check their documentation how to do it, or compile chip-tool on target architecture (better/easier option).

```Dockerfile
# Dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o matter2mqtt-pair

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libavahi-client3 \
    && rm -rf /var/lib/apt/lists/*

# Copy chip-tool from matter2mqtt build location
# Adjust path to where matter2mqtt built chip-tool
COPY /path/to/matter2mqtt/chip-tool /usr/local/bin/chip-tool
RUN chmod +x /usr/local/bin/chip-tool

COPY --from=builder /app/matter2mqtt-pair /usr/local/bin/
WORKDIR /app
ENTRYPOINT ["/usr/local/bin/matter2mqtt-pair"]
```

There's three ways to run matter2mqtt-pair via docker-compose, for local builds use option 3, then you can 

```sh
docker-compose build  # Builds the image
docker-compose up     # Runs it
```

```yaml
# docker-compose.yml
services:
  matter2mqtt-pair:
    # 1. Build from local Dockerfile
    build:
      context: .
      dockerfile: Dockerfile
    # 2. Use pre-built image from registry
    image: ghcr.io/you/matter2mqtt-pair:latest

    # 3. Build locally AND tag it (both together)
    build:
      context: .
      dockerfile: Dockerfile
    image: matter2mqtt-pair:latest

    ports:
      - "8081:8081"
    environment:
      - DEVICES_YAML=/data/devices.yaml
      - STORAGE_PATH=/data/chip-tool
      - CHIP_TOOL_PATH=/usr/local/bin/chip-tool
      - PORT=8081
    volumes:
      - ./devices.yaml:/data/devices.yaml
      - ./chip-tool-storage:/data/chip-tool
```
