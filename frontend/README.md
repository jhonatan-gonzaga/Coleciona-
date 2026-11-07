# Interface Coleciona+

`npm install && npm run dev`; abra `http://127.0.0.1:3000`. O Vite encaminha `/api/v1` para `127.0.0.1:4000`. Para outra API, configure `VITE_API_URL` em `.env`. A interface envia JWT Bearer, inclusive para obter imagens privadas via `fetch` e URL temporária.

No editor de itens, digite uma etiqueta para ver sugestões das etiquetas que você já usou. Selecione com clique ou setas e Enter; vírgula ou Enter também adicionam uma etiqueta nova.

Em **Atributos personalizados**, cada característica tem nome, tipo e valor. O tipo **Opções** permite cadastrar vários valores para a mesma característica no item; os demais tipos mantêm um valor.

Em Explorar e Minhas coleções, o campo de busca encontra coleções e itens pelo nome, além de atributos pelo nome ou valor. A busca em Explorar mostra apenas conteúdo público; a busca em Minhas coleções inclui o acervo privado da conta. O termo pode ser combinado com os filtros por atributos.

Ao adicionar um filtro, digite no campo **Atributo** para ver sugestões dos atributos existentes. Escolha uma sugestão com clique ou com as setas e Enter.

Na página de um item, a média das avaliações aparece em estrelas ao lado do título, inclusive para visitantes. Usuários autenticados podem selecionar de uma a cinco estrelas, enviar sua nota e alterá-la depois; a seleção existente é carregada ao abrir o item novamente.

O nome de exibição do dono aparece junto ao nome da coleção nas listas e nos detalhes dos itens. Em **Minhas coleções**, ele aparece abaixo do título de cada coleção.
