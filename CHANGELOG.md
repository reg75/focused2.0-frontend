# Contributing — FocusEd Frontend
**EN:** Thanks for helping improve the FocusEd frontend.  
**BR:** Obrigado por colaborar com o frontend do FocusEd.

## How to work locally
```bash
docker network create focused-net || true
docker build -t focused-frontend:0.1.0 .
docker run --name frontend --rm   --network focused-net   -p 8080:80   focused-frontend:0.1.0
```
Open http://localhost:8080

## Branch & commit style
- Branches: `feat/<topic>`, `fix/<bug>`, `docs/<area>`
- Commits: Conventional Commits

## Code style
- Keep JS simple (vanilla) and accessible
- Short EN/PT-BR comments where helpful
- Update README if proxy target/ports change

## Definition of done
- Builds & runs via Docker
- Frontend loads and can reach `/api` via proxy
- README/CHANGELOG updated