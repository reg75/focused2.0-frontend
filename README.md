# FocusEd Frontend (Nginx static + /api proxy)
**EN:** Static HTML/CSS/JS app served by Nginx. Proxies `/api/*` to the backend.  
**BR:** App estático (HTML/CSS/JS) via Nginx. Faz proxy de `/api/*` para o backend.

## Quick Start (Docker)
```bash
# EN: 1) Create the shared Docker network (only once)
# BR: 1) Criar a rede Docker compartilhada (apenas uma vez)
docker network create focused-net || true

# EN: 2) Build the frontend image
# BR: 2) Construir a imagem do frontend
docker build -t focused-frontend:0.1.0 .

# EN: 3) Run Nginx on port 8080
# BR: 3) Executar o Nginx na porta 8080
docker run --name frontend --rm   --network focused-net   -p 8080:80   focused-frontend:0.1.0
```

Open <http://localhost:8080>

## Proxy Configuration (Nginx)
```nginx
# EN: Proxy /api/* to backend (container name "backend" on focused-net)
# BR: Proxy de /api/* para o backend (nome do contêiner "backend" na focused-net)
location /api/ {
  proxy_pass http://backend:8000/;
  proxy_set_header Host $host;
}
```

## Environment
**EN:** This frontend does not consume runtime `.env`. Configuration (like proxy target) is set in `nginx.conf`.  
**BR:** Este frontend não usa `.env` em tempo de execução. Configurações (como o destino do proxy) ficam em `nginx.conf`.

## Architecture
```mermaid
graph TB
  FE[Frontend (Nginx :80)] -->|/api proxy (CRUD: GET/POST/PUT/DELETE)| BE[Backend (FastAPI :8000)]
  BE -->|X-API-KEY auth| M[Mailer (FastAPI :8001)]
  M -->|POST /render| R[Renderer (WeasyPrint :8002)]
  M -->|Send email| SG[(SendGrid API)]
  BE -->|SQLite file (app.db)| DB[(SQLite)]
```

**External API:** none (frontend talks only to the backend).

## Troubleshooting
- **404 /api/**: verify `proxy_pass` and Docker network container name.  
- **Caching:** hard refresh or disable cache during development.

## License
MIT — see `LICENSE`.

## Contributing
See `CONTRIBUTING.md`.