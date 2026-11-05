# MongoDB local

Testado com `mongod 8.3.9` e `mongosh 2.14.0` em Linux. Instale também MongoDB Database Tools para backup. Os arquivos `.conf` contêm o caminho absoluto desta máquina; adapte `dbPath`, log e PID se mover o projeto.

Execute `./start-replica.sh` e `./setup.sh` uma vez; repetir é seguro. URI: `mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona`.

`./stop-node.sh 27017` e `./start-node.sh 27017` operam um membro. Para verificar: `mongosh '<URI>' --eval 'rs.status(); db.hello()'`. Os dados persistem em `data/`.

`./backup.sh [destino]` inclui documentos e imagens, com SHA-256 do arquivo de imagens. `./restore.sh BACKUP URI_SEPARADA STORAGE_SEPARADO` restaura fora do ambiente de produção. Os backups gerados ficam fora do Git.

Para dados demonstrativos, `npm install && npm run seed` nesta pasta cria dois usuários, três coleções, quatro itens, nove arquivos PNG reais, nota e comentário. Senha padrão: `coleciona-demo-123`; use `SEED_PASSWORD` para alterá-la. O script é idempotente por `seed_tag`.

`node seed-load.js 100000|500000|1000000 [identificador]` cria uma base **separada**, `coleciona_carga`, só para consultas. Seus itens não têm fotos físicas e **não são um ensaio de persistência de imagens**; a API normal continua apontando para `coleciona`. Cada lote pode ser repetido sem duplicar itens até a contagem alvo.
