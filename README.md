# Coleciona+

Implementação da atividade AVIII, conforme o contrato em `../AVII/divisao_tarefas_implementacao_5_pessoas.md`.

## Execução local

Requisitos: Node.js 20+, npm, MongoDB 8 com `mongod` e `mongosh`, `mongodump` e `mongorestore` para backup.

1. `./database/start-replica.sh` e `./database/setup.sh`.
2. `cp backend/.env.example backend/.env`; preencher `JWT_SECRET` com valor longo e aleatório.
3. `cd backend && npm install && npm start`.
4. Em outro terminal: `cd frontend && npm install && npm run dev`.

O frontend usa proxy Vite para `/api/v1`, em `localhost:3000`. A API escuta em `localhost:4000`. O banco local usa três processos e preserva os dados entre reinícios.

Consulte os README de `database/`, `backend/`, `frontend/` e `tests/` para detalhes e limitações dos ensaios.
