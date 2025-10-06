GOBIN := $(shell go env GOPATH)/bin
BINARY_NAME := matter2mqtt
DIST_DIR := ./dist

.PHONY: dev build clean test run install fmt lint vet

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

check: fmt vet test
	@echo "All checks passed!"

build-all:
	@mkdir -p $(DIST_DIR)

	GOOS=linux   GOARCH=amd64 go build -o $(DIST_DIR)/$(BINARY_NAME)-linux-amd64
	GOOS=linux   GOARCH=arm64 go build -o $(DIST_DIR)/$(BINARY_NAME)-linux-arm64
	GOOS=darwin  GOARCH=amd64 go build -o $(DIST_DIR)/$(BINARY_NAME)-darwin-amd64
	GOOS=darwin  GOARCH=arm64 go build -o $(DIST_DIR)/$(BINARY_NAME)-darwin-arm64
	GOOS=windows GOARCH=amd64 go build -o $(DIST_DIR)/$(BINARY_NAME)-windows-amd64.exe
	GOOS=windows GOARCH=arm64 go build -o $(DIST_DIR)/$(BINARY_NAME)-windows-arm64.exe