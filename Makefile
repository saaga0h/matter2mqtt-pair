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