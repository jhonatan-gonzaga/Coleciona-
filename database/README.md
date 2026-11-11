# MongoDB local

O controle de login fica em `usuarios.controle_login`: `falhas_em` guarda as tentativas dos últimos 15 minutos, `bloqueado_ate` indica o prazo de bloqueio e `versao` coordena atualizações concorrentes. `setup.sh` migra documentos antigos para esse formato antes de atualizar o validador, preservando um bloqueio ainda vigente e limpando os campos antigos depois. Execute `setup.sh` antes de iniciar a API após atualizar uma instalação existente.

Testado com `mongod 8.3.9` e `mongosh 2.14.0` em Linux. Instale também MongoDB Database Tools para backup. Os arquivos `.conf` contêm o caminho absoluto desta máquina; adapte `dbPath`, log e PID se mover o projeto. Cada nó limita o cache WiredTiger a 0,5 GB para caberem três processos na máquina de 8 GB usada no ensaio.

Execute `./start-replica.sh` e `./setup.sh` uma vez; repetir é seguro. URI: `mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona`.

`./stop-node.sh 27017` e `./start-node.sh 27017` operam um membro. `./status.sh` mostra o papel de cada porta; para detalhes: `mongosh '<URI>' --eval 'rs.status(); db.hello()'`. Os dados persistem em `data/`.

`./backup.sh [destino]` inclui documentos e imagens, com SHA-256 do arquivo de imagens. `./restore.sh BACKUP URI_SEPARADA STORAGE_SEPARADO` restaura fora do ambiente de produção. Os backups gerados ficam fora do Git.

Para dados demonstrativos, `npm install && npm run seed` nesta pasta cria dois usuários, três coleções, quatro itens, nove arquivos PNG reais, nota e comentário. Senha padrão: `coleciona-demo-123`; use `SEED_PASSWORD` para alterá-la. O script é idempotente por `seed_tag`.

Para substituir **todas** as coleções da base `coleciona` por um acervo com fotos da internet, execute `npm run seed:online` nesta pasta. O script baixa e valida as fotos antes de apagar as coleções, itens, imagens, avaliações e comentários antigos; mantém as outras contas. Cria seis contas, duas coleções públicas por conta, dez itens por coleção e uma foto WebP real por item (12 coleções, 120 itens, 120 fotos). É possível fazer as etapas separadamente com `node seed-online.js prepare` e, após conferir os arquivos em `storage/online-seed/`, `node seed-online.js apply`.

As fotos vêm de resultados do Flickr indexados pelo Openverse, filtrados para CC0 ou Public Domain Mark. A origem e o autor aparecem no detalhe do item e no arquivo local `storage/online-image-credits.json`. As contas usam a senha `coleciona-demo-123` por padrão (`SEED_PASSWORD` para alterá-la):

Os itens de demonstração recebem os atributos Categoria, Licença e Autor da imagem para usar os filtros. Se o acervo já foi carregado antes dessa mudança, execute `node seed-online.js enrich` para preencher apenas itens de demonstração que ainda não têm atributos; o comando pode ser repetido.

| Conta | Coleções |
| --- | --- |
| `ana.filatelia@coleciona.local` | Selos postais; Cartões postais |
| `bruno.numismatica@coleciona.local` | Moedas antigas; Cédulas do mundo |
| `clara.natureza@coleciona.local` | Fósseis; Minerais e cristais |
| `diego.fotografia@coleciona.local` | Câmeras clássicas; Lentes fotográficas |
| `elisa.musica@coleciona.local` | Discos de vinil; Guitarras |
| `fabio.transportes@coleciona.local` | Carros clássicos; Bicicletas |

`node seed-load.js 100000|500000|1000000 [identificador]` cria uma base **separada**, `coleciona_carga`, só para consultas. Use `LOAD_DB=outro_nome` para bases comparáveis isoladas. Seus itens não têm fotos físicas e **não são um ensaio de persistência de imagens**; a API normal continua apontando para `coleciona`. Cada lote pode ser repetido sem duplicar itens até a contagem alvo.
