# API Coleciona+

`npm install && npm start`. Copie `.env.example` para `.env` e troque `JWT_SECRET`. A API usa `/api/v1`, JWT Bearer, resposta `{data}` ou `{error}`. Cadastros de item enviam `multipart/form-data`: `dados` com JSON e `imagens` com 1–5 arquivos. Arquivos privados só saem por `/imagens/:id/arquivo` após autorização.

Antes de iniciar, execute `../database/start-replica.sh` e `../database/setup.sh`. `GET /api/v1/health/live` testa o processo; `ready` testa leitura e escrita do primário. Erros de infraestrutura retornam 503.

`GET /api/v1/etiquetas/minhas?q=bra` exige JWT e devolve até oito etiquetas dos itens ativos do próprio usuário que começam pelo texto informado, sem diferenciar maiúsculas e minúsculas.

Atributos do tipo `opcao` aceitam de 1 a 20 valores em `valor`, por exemplo `"valor":["Azul","Verde"]`. Valores antigos enviados como texto único continuam aceitos e são normalizados para uma lista. Cada opção pode ser encontrada pela busca de texto e pelos filtros.

`GET /api/v1/explorar/colecoes?q=nome` filtra coleções públicas pelo nome. `GET /api/v1/colecoes/minhas?q=nome` filtra as coleções da conta. `POST /api/v1/itens/busca` aceita `texto` para buscar por parte do nome do item, nome da coleção, rótulo ou chave de um atributo, ou valor de um atributo. Valores numéricos e datas são convertidos em texto para essa busca; `sim` e `não` também encontram valores booleanos. O campo combina com `filtros` e respeita `escopo` (`global` ou `minhas`). Em `minhas`, `colecao_id` pode restringir os itens a uma coleção. O texto aceita até 100 caracteres.

Para ensaios de consulta em uma base separada, defina `MONGODB_DB=coleciona_carga` antes de iniciar a API. A base principal continua `coleciona`. O total da busca é mantido em cache no processo e invalidado nas mutações desta API; para várias instâncias da API, implemente invalidação distribuída antes de usar essa otimização em produção.
