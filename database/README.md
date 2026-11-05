# MongoDB local

Testado com `mongod 8.3.9` e `mongosh 2.14.0` em Linux. Instale também MongoDB Database Tools para backup. Os arquivos `.conf` contêm o caminho absoluto desta máquina; adapte `dbPath`, log e PID se mover o projeto.

Execute `./start-replica.sh` e `./setup.sh` uma vez; repetir é seguro. URI: `mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona`.

`./stop-node.sh 27017` e `./start-node.sh 27017` operam um membro. Para verificar: `mongosh '<URI>' --eval 'rs.status(); db.hello()'`. Os dados persistem em `data/`.

`./backup.sh [destino]` inclui documentos e imagens, com SHA-256 do arquivo de imagens. `./restore.sh BACKUP URI_SEPARADA STORAGE_SEPARADO` restaura fora do ambiente de produção. Os backups gerados ficam fora do Git.
