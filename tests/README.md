# Testes externos

Com API e replica set ativos: `node tests/functional/run.mjs` na raiz do projeto. O script cria dois usuários descartáveis e verifica autenticação, visibilidade nas duas camadas, filtros, avaliações, comentários, galeria e cascata. A fixture é um PNG real de 2 × 2 px.

`CLIENTS=100 SECONDS=30 node tests/rnf/load.mjs` mede p95, taxa de erro e recursos da máquina. Para misturar detalhes e escrita, informe `ITEM_ID` de um item público próprio e `TOKEN`. Para a meta de 100 req/s, defina também `RPS=100`. Não confunda esse ensaio curto com a meta de 1 milhão de itens.

`mongosh '<URI>' tests/rnf/explain.js` salva `executionStats` para revisão do plano. `MINUTES=43200 READY_LOG=ready.jsonl node tests/rnf/monitor-ready.mjs` registra uma medição a cada minuto por 30 dias. Mantenha processo e máquina ativos durante o período; um ensaio curto não comprova a meta mensal.

`node tests/replica/failover.mjs` executa o ensaio local de primário e secundário e imprime JSON. Execute apenas no replica set de desenvolvimento; o script interrompe dois processos, um por vez, e os reinicia. Veja `reports/replica-failover.md`.
