// matter2mqtt-pair/main.go
package main

import (
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"

	qrterminal "github.com/mdp/qrterminal/v3"
	"gopkg.in/yaml.v3"
)

//go:embed web/*
var webFiles embed.FS

type DeviceRegistry struct {
	Devices map[uint64]DeviceConfig `yaml:"devices"`
}

type DeviceConfig struct {
	Topic       string `yaml:"topic"`
	Sensitivity string `yaml:"sensitivity,omitempty"`
	DebounceMs  int    `yaml:"debounce_ms,omitempty"`
}

type PairRequest struct {
	Code   string `json:"code"`
	Name   string `json:"name"`
	NodeID uint64 `json:"node_id"`
}

type UnpairRequest struct {
	NodeID uint64 `json:"node_id"`
}

type DeviceListItem struct {
	NodeID      uint64 `json:"node_id"`
	Topic       string `json:"topic"`
	Sensitivity string `json:"sensitivity,omitempty"`
	DebounceMs  int    `json:"debounce_ms,omitempty"`
}

func getLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "unknown"
	}

	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}
	return "unknown"
}

func main() {
	// CLI flags
	devicesPath := flag.String("devices", "", "Path to devices.yaml")
	port := flag.Int("port", 8081, "HTTP server port")
	storagePath := flag.String("storage", "/var/lib/matter2mqtt", "chip-tool storage directory")
	chipToolPath := flag.String("chip-tool", "chip-tool", "Path to chip-tool binary")
	useTLS := flag.Bool("tls", false, "Enable HTTPS")
	certFile := flag.String("cert", "cert.pem", "TLS certificate file")
	keyFile := flag.String("key", "key.pem", "TLS key file")
	flag.Parse()

	// Environment variable with CLI override
	finalDevicesPath := os.Getenv("DEVICES_YAML")
	if *devicesPath != "" {
		finalDevicesPath = *devicesPath // CLI overrides env
	}
	if finalDevicesPath == "" {
		finalDevicesPath = "/etc/matter2mqtt/devices.yaml" // Default
	}

	fmt.Printf("matter2mqtt pairing tool\n")
	fmt.Printf("Devices file: %s\n", finalDevicesPath)
	fmt.Printf("Storage path: %s\n", *storagePath)
	fmt.Printf("chip-tool: %s\n", *chipToolPath)
	fmt.Printf("\nScan to open:\n")
	
	webFS, err := fs.Sub(webFiles, "web")
	if err != nil {
		panic(err)
	}

	http.Handle("/", http.FileServer(http.FS(webFS)))
	http.HandleFunc("/api/pair", handlePair(finalDevicesPath, *storagePath, *chipToolPath))
	http.HandleFunc("/api/unpair", handleUnpair(finalDevicesPath, *storagePath, *chipToolPath))
	http.HandleFunc("/api/devices", handleListDevices(finalDevicesPath))

	addr := fmt.Sprintf(":%d", *port)
	localIP := getLocalIP()
	addr = fmt.Sprintf("%s:%d", localIP, *port)

	if *useTLS {
		url := fmt.Sprintf("https://%s", addr)
		qrterminal.Generate(url, qrterminal.L, os.Stdout)
		fmt.Printf("\n\nOr point your browser to %s\n", url)
		http.ListenAndServeTLS(addr, *certFile, *keyFile, nil)
	} else {
		url := fmt.Sprintf("http://%s", addr)
		qrterminal.Generate(url, qrterminal.L, os.Stdout)
		fmt.Printf("\n\nOr point your browser to %s\n", url)
		fmt.Println("Note: Camera requires HTTPS on iOS (use --tls)")
		http.ListenAndServe(addr, nil)
	}
}

func handlePair(devicesPath, storagePath, chipToolPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req PairRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}

		// Commission with chip-tool
		cmd := exec.Command(chipToolPath, "pairing", "code",
			fmt.Sprintf("%d", req.NodeID),
			req.Code,
			"--storage-directory", storagePath)

		output, err := cmd.CombinedOutput()
		if err != nil {
			w.WriteHeader(500)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": fmt.Sprintf("Commissioning failed: %s", string(output)),
			})
			return
		}

		// Load existing devices.yaml
		registry := &DeviceRegistry{
			Devices: make(map[uint64]DeviceConfig),
		}

		data, err := os.ReadFile(devicesPath)
		if err == nil {
			yaml.Unmarshal(data, registry)
		}

		// Add new device
		registry.Devices[req.NodeID] = DeviceConfig{
			Topic: req.Name,
		}

		// Write back
		newData, err := yaml.Marshal(registry)
		if err != nil {
			w.WriteHeader(500)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": fmt.Sprintf("Failed to marshal YAML: %v", err),
			})
			return
		}

		if err := os.WriteFile(devicesPath, newData, 0644); err != nil {
			w.WriteHeader(500)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": fmt.Sprintf("Failed to write devices.yaml: %v", err),
			})
			return
		}

		json.NewEncoder(w).Encode(map[string]string{
			"status":  "success",
			"message": fmt.Sprintf("Device %d commissioned and added to %s. Restart matter2mqtt to activate.", req.NodeID, devicesPath),
		})
	}
}

func handleUnpair(devicesPath, storagePath, chipToolPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost && r.Method != http.MethodDelete {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req UnpairRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}

		// Unpair with chip-tool
		cmd := exec.Command(chipToolPath, "pairing", "unpair",
			fmt.Sprintf("%d", req.NodeID),
			"--storage-directory", storagePath)

		output, err := cmd.CombinedOutput()
		if err != nil {
			w.WriteHeader(500)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": fmt.Sprintf("Unpairing failed: %s", string(output)),
			})
			return
		}

		// Load existing devices.yaml
		registry := &DeviceRegistry{
			Devices: make(map[uint64]DeviceConfig),
		}

		data, err := os.ReadFile(devicesPath)
		if err != nil {
			w.WriteHeader(500)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": fmt.Sprintf("Failed to read devices.yaml: %v", err),
			})
			return
		}

		if err := yaml.Unmarshal(data, registry); err != nil {
			w.WriteHeader(500)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": fmt.Sprintf("Failed to parse devices.yaml: %v", err),
			})
			return
		}

		// Remove device from registry
		if _, exists := registry.Devices[req.NodeID]; !exists {
			w.WriteHeader(404)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": fmt.Sprintf("Device %d not found in devices.yaml", req.NodeID),
			})
			return
		}

		delete(registry.Devices, req.NodeID)

		// Write back
		newData, err := yaml.Marshal(registry)
		if err != nil {
			w.WriteHeader(500)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": fmt.Sprintf("Failed to marshal YAML: %v", err),
			})
			return
		}

		if err := os.WriteFile(devicesPath, newData, 0644); err != nil {
			w.WriteHeader(500)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": fmt.Sprintf("Failed to write devices.yaml: %v", err),
			})
			return
		}

		json.NewEncoder(w).Encode(map[string]string{
			"status":  "success",
			"message": fmt.Sprintf("Device %d unpaired and removed from %s. Restart matter2mqtt to apply changes.", req.NodeID, devicesPath),
		})
	}
}

func handleListDevices(devicesPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Load devices.yaml
		registry := &DeviceRegistry{
			Devices: make(map[uint64]DeviceConfig),
		}

		data, err := os.ReadFile(devicesPath)
		if err != nil {
			// If file doesn't exist, return empty list
			if os.IsNotExist(err) {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"status":  "success",
					"devices": []DeviceListItem{},
				})
				return
			}

			w.WriteHeader(500)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": fmt.Sprintf("Failed to read devices.yaml: %v", err),
			})
			return
		}

		if err := yaml.Unmarshal(data, registry); err != nil {
			w.WriteHeader(500)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": fmt.Sprintf("Failed to parse devices.yaml: %v", err),
			})
			return
		}

		// Convert to list format
		devices := make([]DeviceListItem, 0, len(registry.Devices))
		for nodeID, config := range registry.Devices {
			devices = append(devices, DeviceListItem{
				NodeID:      nodeID,
				Topic:       config.Topic,
				Sensitivity: config.Sensitivity,
				DebounceMs:  config.DebounceMs,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "success",
			"devices": devices,
		})
	}
}