# VulnBank API

Deliberately insecure banking API for security testing demos. **Do not deploy in production.**

## Quick Start

```bash
npm install
cp .env.example .env
npm start
```

The API runs on http://localhost:7777. OpenAPI docs at http://localhost:7777/api/docs.

## Docker

```bash
docker build -t vulnbank .
docker run -p 7777:7777 --env-file .env vulnbank
```

## Authentication

The API uses three auth schemes:

| Scheme | Header | Example |
|--------|--------|---------|
| API Key | `X-API-Key` | `vb-key-admin-00001` |
| JWT Bearer | `Authorization` | `Bearer <token from /api/auth/login>` |
| Basic Auth | `Authorization` | `Basic <base64 user:pass>` |

### Get a JWT token

```bash
curl -X POST http://localhost:7777/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<your-password>"}'
```

Credentials are configured via environment variables. See `.env.example`.

## Endpoints

25 endpoints across public, API Key, JWT, and Basic Auth protected routes. See the full OpenAPI spec at `/api/docs`.
