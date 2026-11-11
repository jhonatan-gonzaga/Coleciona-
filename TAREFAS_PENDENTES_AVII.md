# Cinco tarefas para alinhar o AVIII ao AVII

Este plano compara a implementação atual com `../AVII/coleciona_proposta_projeto.md`, `../AVII/alteracoes_necessarias_projeto_final.md` e `../AVII/divisao_tarefas_implementacao_5_pessoas.md`. As cinco tarefas abaixo correspondem às pendências identificadas na revisão. O código principal, as rotas, os índices, a interface e o ensaio de failover já existem; não é necessário recriá-los.

**Estado após a execução:** tarefas 1, 2 e 3 implementadas localmente em 11/11/2026. As descrições de “situação atual” dessas tarefas registram o estado anterior à correção. Tarefas 4 e 5 continuam pendentes.

**Ordem sugerida:** 1 → 2 → 3 → 4 → 5. A tarefa 4 pode começar em paralelo às tarefas 1–3. Antes de atualizar o relatório final, repetir os testes afetados pelas correções.

## Tarefa 1 — Corrigir a janela móvel e a concorrência do bloqueio de login

**Referências:** RF04 e RNF12 da proposta; seção 4 do plano de implementação; correções do projeto final relativas a `usuarios`.

**Situação atual:** `backend/src/components/AuthService.js` armazena contador, horário da última falha e prazo de bloqueio. O contador é mantido enquanto a *última* falha tiver menos de 15 minutos. Assim, cinco falhas espaçadas por menos de 15 minutos entre si podem bloquear a conta mesmo que a primeira tenha ocorrido há mais de 15 minutos. A leitura e a atualização separadas também permitem perder incrementos em requisições concorrentes. O documento de correções do AVII propõe `controle_login.falhas_em[]` e `controle_login.bloqueado_ate`, enquanto a divisão de tarefas menciona `tentativas_login`; resolver essa divergência antes de mudar o esquema.

**Como fazer:**

1. Adotar um contrato único para `usuarios`: preferencialmente `controle_login: {falhas_em: Date[], bloqueado_ate: Date|null}`, conforme a correção mais recente do AVII. Registrar a escolha no README do banco e ajustar os exemplos da documentação final. Se preservar os campos atuais por compatibilidade, documentar a equivalência e garantir a mesma semântica de janela móvel.
2. Atualizar `database/create-collections.js`, `database/seed.js`, `database/seed-online.js` e qualquer outra inserção de usuário, inclusive a do teste de failover, para criar documentos válidos no novo formato. Preparar migração idempotente dos usuários já existentes **antes** de aplicar um validador que exija o formato novo; conferir que login e seed continuam funcionando após repetir `database/setup.sh`.
3. Alterar `backend/src/components/Repositories/AuthRepository.js` para registrar a tentativa de forma atômica por usuário. Descartar horários anteriores a `agora - 15 minutos`, acrescentar a falha atual e definir `bloqueado_ate = agora + 15 minutos` quando houver cinco falhas na janela. Usar operação atômica do MongoDB ou transação com controle de concorrência; uma sequência `findOne` + `updateOne` sem proteção não satisfaz esse requisito.
4. Em `backend/src/components/AuthService.js`, consultar o bloqueio antes de emitir o JWT. Após autenticação válida, limpar as falhas vencidas/ativas conforme o contrato. O objeto devolvido por cadastro, login e `/auth/me` deve continuar sem hash ou campos de controle de login.
5. Acrescentar testes de integração para cinco falhas em menos de 15 minutos, falhas com a primeira já fora da janela, desbloqueio após o prazo, login correto antes do bloqueio e cinco tentativas simultâneas. Controlar o relógio no teste ou usar datas preparadas no banco; não esperar 15 minutos reais.

**Arquivos principais:** `backend/src/components/AuthService.js`, `backend/src/components/Repositories/AuthRepository.js`, `database/create-collections.js`, seeds, `tests/functional/run.mjs`, `tests/replica/failover.mjs` e `database/README.md`.

**Aceite:** a quinta falha **dentro** de 15 minutos bloqueia por 15 minutos; falhas fora da janela não contam; tentativas concorrentes não perdem falhas; o desbloqueio e o login correto funcionam; nenhum campo interno sai na API. `cd backend && npm test` e o teste funcional passam após a migração.

## Tarefa 2 — Testar imagens e exclusão em cascata sob falha

**Referências:** seção 4 da divisão de tarefas, RF12–RF13, RN03 e RNF18–RNF20.

**Situação atual:** existem testes de unidade para validação, busca e acesso, além da suíte funcional. Faltam testes isolados das transições da galeria e da retomada de exclusões quando disco ou MongoDB falham.

**Como fazer:**

1. Criar testes de `ImageService` com diretório temporário e repositório controlado. Cobrir criação com arquivo inválido, sexta imagem, bloqueio da remoção da última, ordenação com IDs repetidos/ausentes e substituição que falha antes e depois da atualização dos metadados.
2. Injetar falhas de `fs.rm`, de gravação de arquivo e de persistência em etapas distintas. Após cada falha, verificar **o estado observável**: a imagem antiga continua acessível quando a substituição não foi confirmada; caminhos pendentes permanecem registrados quando a limpeza falha; uma nova execução de `resume()` completa a limpeza sem alterar outras imagens.
3. Testar `CatalogService` e `CatalogRepository` com dados descartáveis no replica set ou com repositórios substituíveis. Simular falha após marcar item/coleção `em_exclusao` e antes de apagar arquivos/documentos; executar `resumeDeletions()` e conferir que item, avaliações, comentários, metadados e arquivos dependentes desaparecem. Durante a pendência, tentar criar item, foto e comentário e confirmar que são negados.
4. Acrescentar um caso de concorrência para dois uploads quando o item já possui quatro imagens. Verificar que o resultado final nunca ultrapassa cinco imagens, inclusive após reiniciar a API. Se o bloqueio em memória de `ImageService` for insuficiente em mais de um processo, registrar a limitação e reforçar o controle no banco antes de alegar suporte a várias instâncias.
5. Integrar esses casos ao comando `cd backend && npm test`; manter o teste de ponta a ponta em `tests/functional/run.mjs` para confirmar o comportamento pela API.

**Arquivos principais:** `backend/src/components/ImageService.js`, `backend/src/components/CatalogService.js`, `backend/src/components/Repositories/ImageRepository.js`, `backend/src/components/Repositories/CatalogRepository.js`, novos `*.test.js` e `tests/functional/run.mjs`.

**Aceite:** os testes reproduzem falhas reais de arquivo/banco, verificam retomada e ausência de órfãos ativos, preservam a imagem anterior quando necessário e demonstram o limite de 1–5 imagens por item. Todos passam de forma repetível, sem usar o acervo principal como fixture.

## Tarefa 3 — Criar um modal de confirmação reutilizável no frontend

**Referência:** entregáveis da Pessoa 1 na seção 3 da divisão de tarefas.

**Situação atual:** `CollectionDashboard.jsx`, `ItemDetails.jsx` e `MyInteractionsScreen.jsx` usam `window.confirm()`/`confirm()` para exclusões. O plano pede um componente de confirmação reutilizável.

**Como fazer:**

1. Criar `frontend/src/components/ConfirmDialog.jsx` com título, descrição, rótulos de cancelar/confirmar, estado de processamento e variante destrutiva. Usar `<dialog>` ou um painel com `role="alertdialog"`, nome acessível e foco inicial no botão Cancelar.
2. Permitir fechar por Cancelar e Escape quando não houver operação em andamento; devolver o foco ao botão que abriu o diálogo. Impedir dupla confirmação enquanto a requisição estiver pendente e manter o diálogo aberto com erro legível se a API falhar.
3. Trocar as confirmações de exclusão de coleção e item em `CollectionDashboard.jsx`, de comentário em `ItemDetails.jsx` e de interação em `MyInteractionsScreen.jsx`. Mostrar o nome do recurso quando ele estiver disponível e explicar a cascata ao excluir coleção/item.
4. Conferir clique, teclado e leitor de tela em viewport de 360 px e desktop. Confirmar que Cancelar não chama a API e que uma confirmação bem-sucedida atualiza a lista ou o detalhe exibido.
5. Executar `cd frontend && npm run build` e percorrer os quatro fluxos com a API local; registrar o resultado no roteiro visual da tarefa 4.

**Arquivos principais:** novo `frontend/src/components/ConfirmDialog.jsx`, `frontend/src/style.css` e as três telas citadas.

**Aceite:** nenhum dos fluxos de exclusão citados usa `confirm()` nativo; o mesmo componente atende às quatro ações, funciona por teclado e mantém o estado correto em sucesso, cancelamento e erro.

## Tarefa 4 — Completar os ensaios RNF ainda classificados como “não medido”

**Referências:** seção 7 da divisão de tarefas e `reports/rnf-results.md`.

**Situação atual:** o relatório já separa resultados medidos de lacunas. Isso cumpre o formato mínimo de aceite do plano, que permite `não medido` com justificativa; os ensaios abaixo são necessários para **comprovar as metas** correspondentes.

**Como fazer:**

1. **RNF02–RNF04:** gerar itens com muitas avaliações e comentários em base de ensaio. Medir pela API p95 de detalhe, resumo e primeira página de comentários; medir edição sem upload, cadastro com uma imagem de 5 MiB e operação com cinco imagens. Repetir cenários representativos nas bases de 100 mil, 500 mil e 1 milhão e registrar tamanho da base, clientes, req/s, duração, erros, CPU, RAM e disco. Para imagens, usar arquivos reais e armazenamento com espaço suficiente; a base `coleciona_carga` atual não contém fotos físicas.
2. **RNF06:** registrar separadamente o tempo de obtenção dos IDs de coleções públicas, tamanho da lista, tempo do filtro `$in`, contagem e revalidação. Variar o número de coleções públicas; executar `explain("executionStats")` para C1–C5 e descrever o efeito do cache local. Não classificar sharding como medido sem cluster fragmentado.
3. **RNF08:** executar `tests/rnf/monitor-ready.mjs` por 30 dias completos com máquina, API e banco ativos. Guardar o log bruto, início/fim de falhas e manutenção avisada; calcular disponibilidade sobre o período definido. Até completar o período, manter o estado `não medido` ou `parcial` com duração explícita.
4. **RNF11 e RNF13:** instalar MongoDB Database Tools, fazer backup de banco **e fotos**, restaurar em banco e pasta separados e conferir IDs, checksums, imagens e tempo total para RPO/RTO. Em ambiente de ensaio com proxy HTTPS, verificar TLS 1.2+ e redirecionamento/bloqueio de HTTP; registrar configuração e resultado do handshake.
5. **RNF20 e RNF22:** reiniciar API e MongoDB e confirmar que as imagens continuam acessíveis. Forçar falha de remoção em ambiente descartável, verificar pendências e tempo até a limpeza. Percorrer cadastro, filtros, galeria, comentários e exclusões em 360 px e nas versões atuais de Chrome, Firefox, Edge e Safari; guardar versão, plataforma e capturas ou checklist por navegador.
6. Atualizar `reports/rnf-results.md` somente com medições reproduzíveis. Para cada RNF, informar meta, situação (`atendido`, `não atendido` ou `não medido`), data, ambiente, parâmetros, resultado e caminho da evidência bruta. Se a meta falhar, registrar `não atendido` e a ação corretiva, sem substituir o valor observado por estimativa.

**Arquivos principais:** `tests/rnf/`, `database/backup.sh`, `database/restore.sh`, `tests/README.md`, `reports/rnf-results.md` e novos arquivos de evidência em `reports/`.

**Aceite:** cada conclusão nova aponta para comando reproduzível e evidência; os ensaios não usam a base principal para falhas destrutivas; RNF08 só é aprovado após 30 dias e sharding só é apresentado como executado se houver cluster e medições reais.

## Tarefa 5 — Consolidar e revisar o documento final da entrega

**Referências:** `../AVII/Modelo de Projeto Final.pdf`, `../AVII/Coleciona_AV2.pdf` e o capítulo `5. IMPLEMENTAÇÃO E PROVA DE CONCEITO (PoC)/IMPLEMENTACAO_POC.md`.

**Situação atual:** o AVII contém as seções 1–4 em PDF e o AVIII contém a seção 5 em Markdown, tutorial e relatórios. Ainda não há um PDF único com todas as seções e os resultados da implementação. Os links `../../AVII/...` do capítulo 5 dependem de uma pasta irmã local e não funcionam em uma cópia isolada do repositório.

**Como fazer:**

1. Obter o arquivo editável que gerou `Coleciona_AV2.pdf` ou reconstruir as seções 1–4 em uma fonte versionável. Aplicar `alteracoes_necessarias_projeto_final.md`, inclusive modelo final de login, índice I12 e referências internas. Resolver a divergência do texto antigo de arquitetura que fala em imagem opcional: a regra vigente é **1–5 imagens obrigatórias por item ativo**.
2. Integrar a seção 5 do AVIII após a seção 4, preservando C1–C5, listagens dos scripts, replicação efetivamente executada e sharding como proposta futura. Atualizar afirmações quantitativas se a tarefa 4 produzir novas medições.
3. Copiar para o repositório as fontes necessárias da especificação e dos diagramas, ou substituir as referências por anexos/links que funcionem fora da estrutura local `AVII/` + `AVIII/`. Conferir todos os links e imagens a partir de uma cópia isolada do AVIII.
4. Gerar um PDF final com capa, cinco membros da equipe, sumário, seções 1–5, figuras legíveis, tabelas, referências e indicação das evidências. Incluir link do repositório e roteiro curto da defesa prática usando `TUTORIAL_POC.md`.
5. Fazer revisão cruzada: requisitos RF/RN/RNF versus código e resultados, nomes de campos/índices, números de tabelas/figuras, legenda de “medido” versus “proposto” e instruções de reprodução. Conferir visualmente o PDF exportado antes de entregá-lo.

**Arquivos principais:** fontes do documento AVII, `5. IMPLEMENTAÇÃO E PROVA DE CONCEITO (PoC)/IMPLEMENTACAO_POC.md`, `5. IMPLEMENTAÇÃO E PROVA DE CONCEITO (PoC)/TUTORIAL_POC.md`, `reports/` e o novo PDF final.

**Aceite:** um leitor que recebeu somente o repositório e o PDF consegue localizar seções 1–5, executar a PoC, identificar o que foi medido e abrir todas as referências internas sem depender do caminho absoluto desta máquina.
