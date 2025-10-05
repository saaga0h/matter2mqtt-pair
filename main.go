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
	"strconv"
	"strings"

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
	port := flag.Int("port", 0, "HTTP server port")
	storagePath := flag.String("storage", "", "chip-tool storage directory")
	chipToolPath := flag.String("chip-tool", "", "Path to chip-tool binary")
	useTLS := flag.Bool("tls", false, "Enable HTTPS")
	certFile := flag.String("cert", "", "TLS certificate file")
	keyFile := flag.String("key", "", "TLS key file")
	flag.Parse()

	// Helper to get string config: CLI flag > env var > default
	getStringConfig := func(flagVal, envKey, defaultVal string) string {
		if flagVal != "" {
			return flagVal
		}
		if envVal := os.Getenv(envKey); envVal != "" {
			return envVal
		}
		return defaultVal
	}

	// Helper to get int config: CLI flag > env var > default
	getIntConfig := func(flagVal int, envKey string, defaultVal int) int {
		if flagVal != 0 {
			return flagVal
		}
		if envVal := os.Getenv(envKey); envVal != "" {
			if val, err := strconv.Atoi(envVal); err == nil {
				return val
			}
		}
		return defaultVal
	}

	// Helper to get bool config: CLI flag or env var
	getBoolConfig := func(flagVal bool, envKey string) bool {
		if flagVal {
			return true
		}
		if envVal := os.Getenv(envKey); envVal != "" {
			return envVal == "true" || envVal == "1" || envVal == "yes"
		}
		return false
	}

	// Apply configuration with priority: CLI > ENV > Default
	finalDevicesPath := getStringConfig(*devicesPath, "DEVICES_YAML", "/etc/matter2mqtt/devices.yaml")
	finalPort := getIntConfig(*port, "PORT", 8081)
	finalStoragePath := getStringConfig(*storagePath, "STORAGE_PATH", "/var/lib/matter2mqtt")
	finalChipToolPath := getStringConfig(*chipToolPath, "CHIP_TOOL_PATH", "chip-tool")
	finalUseTLS := getBoolConfig(*useTLS, "TLS_ENABLED")
	finalCertFile := getStringConfig(*certFile, "TLS_CERT", "cert.pem")
	finalKeyFile := getStringConfig(*keyFile, "TLS_KEY", "key.pem")

	fmt.Printf("matter2mqtt pairing tool\n")
	fmt.Printf("Devices file: %s\n", finalDevicesPath)
	fmt.Printf("Storage path: %s\n", finalStoragePath)
	fmt.Printf("chip-tool: %s\n", finalChipToolPath)
	fmt.Printf("\nScan to open:\n")
	
	webFS, err := fs.Sub(webFiles, "web")
	if err != nil {
		panic(err)
	}

	http.Handle("/", http.FileServer(http.FS(webFS)))
	http.HandleFunc("/api/pair", handlePair(finalDevicesPath, *storagePath, *chipToolPath))
	http.HandleFunc("/api/unpair", handleUnpair(finalDevicesPath, *storagePath, *chipToolPath))
	http.HandleFunc("/api/devices", handleListDevices(finalDevicesPath))

	addr := fmt.Sprintf(":%d", finalPort)
	localIP := getLocalIP()
	addr = fmt.Sprintf("%s:%d", localIP, finalPort)

	if finalUseTLS {
		url := fmt.Sprintf("https://%s", addr)
		qrterminal.Generate(url, qrterminal.L, os.Stdout)
		fmt.Printf("\n\nOr point your browser to %s\n", url)
		http.ListenAndServeTLS(addr, finalCertFile, finalKeyFile, nil)
	} else {
		url := fmt.Sprintf("http://%s", addr)
		qrterminal.Generate(url, qrterminal.L, os.Stdout)
		fmt.Printf("\n\nOr point your browser to %s\n", url)
		fmt.Println("Note: Camera requires HTTPS on iOS (use --tls)")
		http.ListenAndServe(addr, nil)
	}
}

func parseChipToolUnpairError(output string) string {
	outputLower := strings.ToLower(output)
	
	if strings.Contains(outputLower, "not found") || 
	   strings.Contains(outputLower, "no device") {
		return "Device not found. It may already be unpaired."
	}
	if strings.Contains(outputLower, "timeout") {
		return "Connection timeout. Device may be offline or unreachable."
	}
	if strings.Contains(outputLower, "not commissioned") {
		return "Device is not paired to this controller."
	}
	
	return "Unpair failed. Device may be offline or already unpaired."
}

func parseChipToolError(output string) string {
	outputLower := strings.ToLower(output)
	
	// Check for common error patterns
	if strings.Contains(outputLower, "integrity check failed") {
		return "Invalid pairing code format. Please check the QR code or manual pairing code."
	}
	if strings.Contains(outputLower, "device discovery timed out") || 
	   strings.Contains(outputLower, "no devices found") {
		return "Device not found. Make sure the device is powered on and in pairing mode."
	}
	if strings.Contains(outputLower, "failed to establish pase") {
		return "Failed to connect to device. Try resetting the device and pairing again."
	}
	if strings.Contains(outputLower, "timeout") {
		return "Connection timeout. Ensure device is nearby and network is working."
	}
	if strings.Contains(outputLower, "already commissioned") {
		return "Device is already paired. Reset the device before pairing again."
	}
	if strings.Contains(outputLower, "invalid discriminator") {
		return "Invalid pairing code. Please verify the code from your device."
	}
	
	// If no specific error matched, provide generic but helpful message
	return "Pairing failed. Check that the device is in pairing mode and the code is correct."
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
			// Log full error for debugging
			fmt.Printf("ERROR: chip-tool pairing failed\n")
			fmt.Printf("Command: %s\n", cmd.String())
			fmt.Printf("Output:\n%s\n", string(output))
			
			// Return user-friendly error
			errorMsg := parseChipToolError(string(output))
			w.WriteHeader(500)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": errorMsg,
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
			// Log full error for debugging
			fmt.Printf("ERROR: chip-tool unpair failed\n")
			fmt.Printf("Command: %s\n", cmd.String())
			fmt.Printf("Output:\n%s\n", string(output))
			
			// Return user-friendly error
			errorMsg := parseChipToolUnpairError(string(output))
			w.WriteHeader(500)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": errorMsg,
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