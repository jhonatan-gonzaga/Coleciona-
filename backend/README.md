# API Coleciona+

`npm install && npm start`. Copie `.env.example` para `.env` e troque `JWT_SECRET`. A API usa `/api/v1`, JWT Bearer, resposta `{data}` ou `{error}`. Cadastros de item enviam `multipart/form-data`: `dados` com JSON e `imagens` com 1–5 arquivos. Arquivos privados só saem por `/imagens/:id/arquivo` após autorização.

Antes de iniciar, execute `../database/start-replica.sh` e `../database/setup.sh`. `GET /api/v1/health/live` testa o processo; `ready` testa leitura e escrita do primário. Erros de infraestrutura retornam 503.
