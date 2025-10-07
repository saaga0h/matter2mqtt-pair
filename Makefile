GOBIN := $(shell go env GOPATH)/bin
BINARY_NAME := matter2mqtt
DIST_DIR := ./dist

.PHONY: dev build clean test run install fmt lint vet security security-install

dev:
	$(GOBIN)/reflex -sr '\.(go|html|js|css)$$' -d fancy -- \
		go run main.go --no-qr \
		--chip-tool=../matter2mqtt/bin/chip-tool \
		--devices=../matter2mqtt/devices.yaml \
		--tls --cert cert.pem --key key.pem \
		--storage ./tmp/ --port 8081

build: clean
	@mkdir -p $(DIST_DIR)
	go build -o $(DIST_DIR)/$(BINARY_NAME) .
	@chmod +x $(DIST_DIR)/$(BINARY_NAME)
	@echo "Built $(BINARY_NAME) in $(DIST_DIR)/"

clean:
	@rm -rf $(DIST_DIR)
	@echo "Cleaned $(DIST_DIR)/"

test:
	go test -v ./...

run: build
	$(DIST_DIR)/$(BINARY_NAME)

install: build
	cp $(DIST_DIR)/$(BINARY_NAME) $(GOBIN)/$(BINARY_NAME)
	@echo "Installed $(BINARY_NAME) to $(GOBIN)/"

fmt:
	go fmt ./...

lint:
	golangci-lint run

vet:
	go vet ./...

check: fmt vet test security-quick
	@echo "All checks passed!"

build-all:
	@mkdir -p $(DIST_DIR)

	GOOS=linux   GOARCH=amd64 go build -o $(DIST_DIR)/$(BINARY_NAME)-linux-amd64
	GOOS=linux   GOARCH=arm64 go build -o $(DIST_DIR)/$(BINARY_NAME)-linux-arm64
	GOOS=darwin  GOARCH=amd64 go build -o $(DIST_DIR)/$(BINARY_NAME)-darwin-amd64
	GOOS=darwin  GOARCH=arm64 go build -o $(DIST_DIR)/$(BINARY_NAME)-darwin-arm64
	GOOS=windows GOARCH=amd64 go build -o $(DIST_DIR)/$(BINARY_NAME)-windows-amd64.exe
	GOOS=windows GOARCH=arm64 go build -o $(DIST_DIR)/$(BINARY_NAME)-windows-arm64.exe

# Security scanning with Trivy
security-install:
	@echo "🔧 Installing Trivy..."
	@if ! command -v trivy >/dev/null 2>&1; then \
		if [[ "$$OSTYPE" == "darwin"* ]]; then \
			brew install trivy; \
		elif command -v apt-get >/dev/null 2>&1; then \
			sudo apt-get update && sudo apt-get install -y wget apt-transport-https gnupg lsb-release && \
			wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add - && \
			echo "deb https://aquasecurity.github.io/trivy-repo/deb $$(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list && \
			sudo apt-get update && sudo apt-get install -y trivy; \
		elif command -v yum >/dev/null 2>&1; then \
			sudo yum install -y wget && \
			wget https://github.com/aquasecurity/trivy/releases/download/v0.46.0/trivy_0.46.0_Linux-64bit.rpm && \
			sudo rpm -ivh trivy_0.46.0_Linux-64bit.rpm; \
		else \
			echo "Install Trivy manually: https://aquasecurity.github.io/trivy/latest/getting-started/installation/"; \
			exit 1; \
		fi; \
	else \
		echo "Trivy already installed"; \
	fi

security: security-install
	@echo "Running security scans..."
	@echo ""
	@echo "Scanning filesystem for vulnerabilities..."
	@trivy fs . --severity CRITICAL,HIGH,MEDIUM --format table --quiet
	@echo ""
	@echo "Scanning for misconfigurations..."
	@trivy config . --severity CRITICAL,HIGH,MEDIUM --format table --quiet
	@echo ""
	@echo "Scanning for secrets..."
	@trivy fs . --scanners secret --format table --quiet
	@echo ""
	@echo "Summary scan (CRITICAL & HIGH only)..."
	@trivy fs . --severity CRITICAL,HIGH --format table --quiet
	@echo ""
	@echo "Security scan complete!"

security-quick:
	@echo "🚀 Quick security scan (CRITICAL & HIGH only)..."
	@trivy fs . --severity CRITICAL,HIGH --format table --quiet
	@echo "Quick scan complete!"

security-go:
	@echo "Scanning Go dependencies..."
	@trivy fs . --scanners vuln --format table --quiet | grep -E "(go\.mod|Total|OS|Library)" || echo "No Go vulnerabilities found"

security-web:
	@echo "Scanning web dependencies..."
	@if [ -f "web/package.json" ]; then \
		trivy fs ./web --scanners vuln --format table --quiet | grep -E "(package|Total|OS|Library)" || echo "No web vulnerabilities found"; \
	else \
		echo "No web/package.json found"; \
	fi
