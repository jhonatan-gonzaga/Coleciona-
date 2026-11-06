# Coleciona+

Implementação da atividade AVIII, conforme o contrato em `../AVII/divisao_tarefas_implementacao_5_pessoas.md`.

## Execução local

Requisitos: Node.js 20+, npm, MongoDB 8 com `mongod` e `mongosh`, `mongodump` e `mongorestore` para backup.

1. `./database/start-replica.sh` e `./database/setup.sh`.
2. `cd database && npm install && npm run seed` para inserir dados de demonstração e fotos reais.
3. `cp backend/.env.example backend/.env`; preencher `JWT_SECRET` com valor longo e aleatório.
4. `cd backend && npm install && npm start`.
5. Em outro terminal: `cd frontend && npm install && npm run dev`.

O frontend usa proxy Vite para `/api/v1`, em `localhost:3000`. A API escuta em `localhost:4000`. O banco local usa três processos e preserva os dados entre reinícios.

Consulte os README de `database/`, `backend/`, `frontend/` e `tests/` para detalhes e limitações dos ensaios.

O histórico Git contém branches e commits semânticos com gitmoji para as cinco áreas do plano. Os resultados medidos e o que ainda depende de ensaios longos ou ferramentas externas estão em `reports/`.
