# Ensaio de failover — 05/11/2026

Ambiente: MongoDB 8.3.9, `mongosh` 2.14.0, três processos locais em `127.0.0.1:27017–27019`, conjunto `rsColeciona`. API Node.js 20.20.2. Teste executado por `node tests/replica/failover.mjs`.

| Medida | Resultado |
|---|---:|
| Primário inicial | 27017 |
| Novo primário | 27018 |
| Eleição após parar o primário | 16.305 ms |
| Primeira escrita da API após a parada | 16.542 ms |
| Meta RNF09 | ≤ 30.000 ms — atendida neste ensaio |
| Marcador confirmado com `w: majority` | Preservado |
| Item privado consultado por terceiro | HTTP 404 |
| Escrita com um secundário parado | HTTP 200 |
| Estado final | 1 primário, 2 secundários |

Início `2026-11-05T23:51:10.297Z`; fim `2026-11-05T23:51:46.418Z`. Não foram registradas respostas transitórias pela rotina de tentativas da escrita. O teste cobre falha de um processo local; todos os membros estão na mesma máquina, portanto não cobre perda do hospedeiro. O impacto sobre a disponibilidade mensal (RNF08) depende do monitor de 30 dias.
