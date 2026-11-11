# API Coleciona+

`npm test` executa testes de regras e de recuperação; os testes de login, imagens e cascata usam uma base MongoDB temporária e exigem o replica set local ativo. Essas bases são removidas ao fim dos testes. Após atualizar uma instalação existente, execute `../database/setup.sh` antes de iniciar a API para migrar o controle de login.

`npm install && npm start`. Copie `.env.example` para `.env` e troque `JWT_SECRET`. A API usa `/api/v1`, JWT Bearer, resposta `{data}` ou `{error}`. Cadastros de item enviam `multipart/form-data`: `dados` com JSON e `imagens` com 1–5 arquivos. Arquivos privados só saem por `/imagens/:id/arquivo` após autorização.

Antes de iniciar, execute `../database/start-replica.sh` e `../database/setup.sh`. `GET /api/v1/health/live` testa o processo; `ready` testa leitura e escrita do primário. Erros de infraestrutura retornam 503.

`GET /api/v1/etiquetas/minhas?q=bra` exige JWT e devolve até oito etiquetas dos itens ativos do próprio usuário que começam pelo texto informado, sem diferenciar maiúsculas e minúsculas.

Atributos do tipo `opcao` aceitam de 1 a 20 valores em `valor`, por exemplo `"valor":["Azul","Verde"]`. Valores antigos enviados como texto único continuam aceitos e são normalizados para uma lista. Cada opção pode ser encontrada pela busca de texto e pelos filtros.

`GET /api/v1/itens/:id/avaliacoes/resumo` devolve a média e a quantidade de avaliações visíveis na página do item. `GET /api/v1/itens/:id/avaliacao/minha` exige JWT e devolve a avaliação do usuário autenticado ou `null` se ele ainda não avaliou o item.

As respostas de coleções e itens incluem `dono_nome`, o nome de exibição da conta proprietária, para identificar a autoria sem expor e-mail ou dados de autenticação.

`GET /api/v1/explorar/colecoes?q=termo&filtros=JSON_URL_ENCODED` lista coleções públicas com capa e encontra a coleção pelo nome ou por nome e atributos de seus itens públicos. `filtros` é uma lista JSON codificada na URL, com o mesmo formato de filtros da busca de itens; retorna coleções que contêm itens públicos correspondentes. `GET /api/v1/colecoes/minhas?q=nome` filtra as coleções da conta. `POST /api/v1/itens/busca` aceita `texto` para buscar por parte do nome do item, nome da coleção, rótulo ou chave de um atributo, ou valor de um atributo. Valores numéricos e datas são convertidos em texto para essa busca; `sim` e `não` também encontram valores booleanos. O campo combina com `filtros` e respeita `escopo` (`global` ou `minhas`). `colecao_id` restringe a busca a uma coleção sem abrir dados privados no escopo global. O texto aceita até 100 caracteres.

Para ensaios de consulta em uma base separada, defina `MONGODB_DB=coleciona_carga` antes de iniciar a API. A base principal continua `coleciona`. O total da busca é mantido em cache no processo e invalidado nas mutações desta API; para várias instâncias da API, implemente invalidação distribuída antes de usar essa otimização em produção.
