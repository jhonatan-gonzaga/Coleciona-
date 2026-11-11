# MongoDB local

O controle de login fica em `usuarios.controle_login`: `falhas_em` guarda as tentativas dos últimos 15 minutos, `bloqueado_ate` indica o prazo de bloqueio e `versao` coordena atualizações concorrentes. `setup.sh` migra documentos antigos para esse formato antes de atualizar o validador, preservando um bloqueio ainda vigente e limpando os campos antigos depois. Execute `setup.sh` antes de iniciar a API após atualizar uma instalação existente.

Testado com `mongod 8.3.9` e `mongosh 2.14.0` em Linux. Instale também MongoDB Database Tools para backup. Os arquivos `.conf` contêm o caminho absoluto desta máquina; adapte `dbPath`, log e PID se mover o projeto. Cada nó limita o cache WiredTiger a 0,5 GB para caberem três processos na máquina de 8 GB usada no ensaio.

Execute `./start-replica.sh` e `./setup.sh` uma vez; repetir é seguro. URI: `mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona`.

`./stop-node.sh 27017` e `./start-node.sh 27017` operam um membro. `./status.sh` mostra o papel de cada porta; para detalhes: `mongosh '<URI>' --eval 'rs.status(); db.hello()'`. Os dados persistem em `data/`.

`./backup.sh [destino]` inclui documentos e imagens, com SHA-256 do arquivo de imagens. `./restore.sh BACKUP URI_SEPARADA STORAGE_SEPARADO` restaura fora do ambiente de produção. Os backups gerados ficam fora do Git.

Para dados demonstrativos, `npm install && npm run seed` nesta pasta cria dois usuários, três coleções, quatro itens, nove fotos WebP de objetos reais, nota e comentário. As imagens e seus créditos estão em `assets/demo/`; as fontes são CC0 ou marcadas como domínio público nos locais indicados em `assets/demo/sources.json`. São fotos ilustrativas dos tipos de objeto do catálogo, não registros de um único exemplar. A seed substitui imagens antigas de 16 × 16 px dos quatro itens demonstrativos, preserva fotos adicionadas pelo usuário e pode ser repetida sem duplicar imagens. Senha padrão: `coleciona-demo-123`; use `SEED_PASSWORD` para alterá-la.

### Seed com o backup completo

Para iniciar um **ambiente novo** com o acervo do backup de 11/11/2026, entregue ao colaborador o arquivo `coleciona-backup-20261111T193439Z.tar.gz` e seu `.sha256` por um canal privado. Eles ficam em `database/backups/` nesta máquina e são ignorados pelo Git. O pacote contém 75 usuários, 17 coleções pessoais, 128 itens, 133 imagens, 2 avaliações e 2 comentários, inclusive contas usadas em testes; não o publique em um repositório aberto.

Com o replica set do colaborador ativo e `mongorestore` instalado, execute **dentro de `database/`**:

```bash
npm run seed:snapshot -- ./backups/coleciona-backup-20261111T193439Z.tar.gz \
  'mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona' \
  "$PWD/../storage"
```

O comando verifica os checksums, restaura as seis coleções do backup e extrai as fotos. Ele exige `storage/uploads` vazio e usa `--drop`: **substitui os dados existentes no banco `coleciona` de destino**. Confira a URI antes de executar. Para ensaio em outro banco, prefixe o comando com `TARGET_DB=nome_do_banco` e use uma pasta de storage vazia; configure `MONGODB_DB` e `STORAGE_DIR` na API para consultar esse ensaio. `npm run seed` continua sendo a alternativa pequena e repetível para demonstração.

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
