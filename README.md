# matter2mqtt-pair

# Self-signed certificate

```sh
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout key.pem -out cert.pem -days 365 \
  -subj "/CN=192.168.1.100" \
  -addext "subjectAltName=IP:192.168.1.100"

```

```sh
go run main.go --tls --cert cert.pem --key key.pem
```