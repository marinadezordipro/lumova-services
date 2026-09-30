# lumova-services

Site institucional da LUMOVA em https://lumova.com.br

## Estrutura

```
lumova-services/
├── src/                       conteúdo servido pelo Nginx
│   ├── index.html             página principal (atualmente a página de serviços)
│   ├── services-content.js
│   └── assets/                logos e favicons
├── nginx.conf                 configuração do Nginx (gzip, cache, security headers)
├── Dockerfile                 imagem baseada em nginx:1.27-alpine
├── stack.yml                  Docker Swarm stack (Traefik + HTTPS Let's Encrypt)
└── .github/workflows/         CI que builda e publica em ghcr.io
```

## Desenvolvimento local

**Servir com Python (rápido para iterar):**

```powershell
cd src
python -m http.server 8000
# Abre http://localhost:8000
```

**Rodar a mesma imagem que vai para produção:**

```powershell
docker build -t lumova-services-dev .
docker run --rm -p 8000:80 lumova-services-dev
# Abre http://localhost:8000
```

## Publicação (quando estiver pronto)

### 1. DNS no GoDaddy

- Remover o Forwarding/Parking existente em `lumova.com.br`
- Criar registro **A**: `@` (raiz) → `178.156.171.216`
- Criar registro **CNAME**: `www` → `lumova.com.br`
- Não mexer nos MX (email)

### 2. Confirmar propagação

```bash
dig +short lumova.com.br
dig +short www.lumova.com.br
```

### 3. Deploy na VPS

```bash
mkdir -p /opt/stacks/lumova-services
cd /opt/stacks/lumova-services
# copiar o stack.yml (via scp ou heredoc)
docker stack deploy -c stack.yml lumova-services --with-registry-auth
```

Traefik emite o certificado Let's Encrypt automaticamente em ~30-60s.

### 4. Verificar

```bash
curl -sSL -o /dev/null -w "%{http_code} %{url_effective}\n" https://lumova.com.br
curl -sSL -o /dev/null -w "%{http_code} %{url_effective}\n" https://www.lumova.com.br
```

Esperado:
- `200 https://lumova.com.br/`
- `200 https://lumova.com.br/` (com o www redirecionando para o canônico)

## Atualizar o site

1. Editar `src/index.html`, `src/services-content.js` ou assets
2. Commit e push na `main`
3. GitHub Actions builda e publica nova imagem no GHCR
4. Na VPS, forçar pull da nova imagem:

```bash
docker service update --image ghcr.io/marinadezordipro/lumova-services:latest --with-registry-auth lumova-services_site
```
