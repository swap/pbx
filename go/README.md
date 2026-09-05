# PBX Go SDK

## Install

```bash
cd go
go mod tidy
```

## Configure

Create a `.env` file:

```env
PBX_KEY=your-base64-key-here
PBX_KEY_ID=primary
PBX_PROTECTED=true
```

Generate `PBX_KEY` with `openssl rand -base64 32`.

## net/http

```go
cfg, _ := pbx.LoadConfigFromEnv()
core := middleware.NewCore(cfg)

mux := http.NewServeMux()
mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]bool{"ok": true})
})
mux.HandleFunc("/v2/users", func(w http.ResponseWriter, r *http.Request) {
    var body map[string]string
    json.NewDecoder(r.Body).Decode(&body)
    json.NewEncoder(w).Encode(map[string]any{"created": true, "name": body["name"]})
})

http.ListenAndServe(":8080", middleware.NetHTTP(core)(mux))
```

## Gin

```go
r := gin.New()
r.Use(middleware.Gin(core))

r.GET("/health", func(c *gin.Context) {
    c.JSON(200, gin.H{"ok": true})
})
r.POST("/v2/users", func(c *gin.Context) {
    var body map[string]string
    c.ShouldBindJSON(&body)
    c.JSON(200, gin.H{"created": true, "name": body["name"]})
})

r.Run(":8080")
```

## Protect routes

```go
cfg.Routes = pbx.RouteConfig{
    Protected: []string{"/v2/*"},
    Public:    []string{"/health", "/hi"},
}
```

## Client

```go
c := client.New("https://api.example.com", core)
raw, err := c.Post("/v2/users", map[string]string{"name": "alice"})
```

## Tests

```bash
go test ./...
```
