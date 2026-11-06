# Ensaio de failover — 05/11/2026

Ambiente: MongoDB 8.3.9, `mongosh` 2.14.0, três processos locais em `127.0.0.1:27017–27019`, conjunto `rsColeciona`. API Node.js 20.20.2. Teste executado por `node tests/replica/failover.mjs`.

| Medida | Ensaio inicial | Ensaio final |
|---|---:|---:|
| Primário inicial | 27017 | 27019 |
| Novo primário | 27018 | 27017 |
| Eleição após parar o primário | 16.305 ms | 16.287 ms |
| Primeira escrita da API após a parada | 16.542 ms | 16.521 ms |
| Meta RNF09 | ≤ 30.000 ms: atendida | ≤ 30.000 ms: atendida |
| Marcador confirmado com `w: majority` | Preservado | Preservado |
| Item privado consultado por terceiro | HTTP 404 | HTTP 404 |
| Escrita com um secundário parado | HTTP 200 | HTTP 200 |
| Estado final | 1 primário, 2 secundários | 1 primário, 2 secundários |

Ensaio inicial: `2026-11-05T23:51:10.297Z` a `2026-11-05T23:51:46.418Z`. Ensaio final, após reforço das transações e limite de cache WiredTiger: `2026-11-06T00:19:38.278Z` a `2026-11-06T00:20:14.204Z`. Não foram registradas respostas transitórias pela rotina de tentativas da escrita. O teste cobre falha de um processo local; todos os membros estão na mesma máquina, portanto não cobre perda do hospedeiro. O impacto sobre a disponibilidade mensal (RNF08) depende do monitor de 30 dias.

Valores brutos: [replica-evidence.json](replica-evidence.json).
