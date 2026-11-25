# Relatório de finalização definitiva

Cópia de trabalho em `/workspace/work/integracao-nexus/Star-Wars-Nexus`, baseada na versão com o emblema ampliado no celular.

## Alterações

- A Home reúne hero, apresentação, quatro indicadores, quatro cards de navegação, nove destaques, galeria com onze pôsteres, cronologia e informações sobre o projeto e a SWAPI.
- O cabeçalho das cinco páginas usa o emblema Star Wars Nexus, os ícones do menu e o contorno dourado com recortes da referência. Em telas estreitas, o emblema ocupa de 152 a 176 px e o botão Menu abre os links usando o Bootstrap.
- Os catálogos compartilham navegação e espaçamento. Personagens ganhou um traço luminoso, Planetas uma órbita decorativa e Naves um painel em grade. Filmes ganhou controles mais compactos em telas móveis. O rodapé informa o segundo semestre e mantém a identificação acadêmica nas cinco páginas.
- O rodapé e o ícone da aba usam o mesmo emblema do cabeçalho. No rodapé móvel, ele ocupa 160 px. O X dos quatro modais é um símbolo visível com o rótulo acessível “Fechar” e mantém o fechamento do Bootstrap.
- Cada página usa um fundo próprio do ZIP recebido. Os cinco PNGs foram convertidos para WebP nas dimensões de origem. O menu ocupa o topo e sai da área visível com a rolagem.
- As onze fichas de filmes incluem duração e sinopse, com fontes documentadas. Os seis registros principais continuam vindo da SWAPI e os cinco complementos são identificados na interface. O opening crawl usa o texto da SWAPI. Para um filme sem texto disponível, a ficha indica “Não informado”.
- A paginação valida endereços e recusa repetição ou falta de avanço. A pesquisa evita normalizar todos os títulos quando o campo está vazio. O cache pode aproveitar dados anteriores em falha de rede. A atualização e a nova tentativa restauram o foco quando o botão acionador deixa de estar disponível.
- A Home pede apenas a contagem de personagens, planetas e naves quando a informação ainda não está no cache. A página preserva o campo estelar, com desenho menos frequente no celular e pausa em abas ocultas.

## Imagens e limitações

Os 52 arquivos recebidos foram incorporados ao projeto. Os 36 arquivos de naves e os 11 pôsteres mantêm os bytes originais. Os cinco fundos foram convertidos de PNG para WebP nas dimensões originais. As imagens anteriores, inclusive o emblema e os placeholders, mantêm seus arquivos e caminhos.

Os dois arquivos de cruzadores da República têm o mesmo SHA-256 e a mesma arte do Venator. A associação visual foi aplicada ao Republic attack cruiser (SWAPI 63). O Republic Cruiser classe Consular (SWAPI 31) apresenta o placeholder. O arquivo duplicado foi arquivado no diretório de naves e está identificado nos créditos. A versão usada como base já tinha removido a função de favoritar.

As durações usam as edições do Disney+ Brasil. Elas podem variar conforme a edição. As notas de fonte das fichas registram as diferenças conhecidas. A documentação do catálogo distingue a expansão para onze filmes dos requisitos do professor.

## Testes e revisão visual

- Playwright com Chromium aprovou 60 verificações, com zero falhas. A matriz cobriu as cinco páginas em 320, 375, 390, 768, 1024, 1440 e 1920 px, somando 35 combinações. A revisão visual comparou os cinco fundos, os onze pôsteres e os 36 arquivos de naves.
- A coleta ao vivo percorreu 20 respostas da SWAPI e retornou 82 personagens, 60 planetas, 36 naves e seis filmes. Os testes de funcionamento usaram esses registros e os cinco filmes locais. Os testes de falha simularam HTTP 503, ausência de rede, armazenamento bloqueado, cache expirado, dados inválidos e paginação cíclica.
- Foram exercitados o menu móvel, as navegações, a busca e sua limpeza, a combinação de busca com os filtros e as três ordenações de filmes, a abertura dos detalhes, o opening crawl, o cache, a atualização manual e os contadores da Home. A navegação por teclado, o retorno do foco, a preferência por movimento reduzido e o console também foram verificados.
- A auditoria verificou 78 arquivos de imagem, os caminhos e textos alternativos dos 189 cards, a concordância entre card e modal nas 36 naves e nos 11 filmes, e o fallback em todos os catálogos. A Home passou pelas verificações dos nove destaques, onze pôsteres, cronologia e controle da galeria.
- A revisão de acessibilidade incluiu verificações de teclado e contraste amostrado. A execução ocorreu em Chromium, sem certificação WCAG, testes com leitores de tela ou validação em outros navegadores.
- A verificação do emblema cobriu as cinco páginas a 320, 375, 390, 767, 768 e 1440 px. Conferiu o carregamento com o projeto servido em um subdiretório, o tamanho do emblema no cabeçalho e no rodapé, o ícone da aba, o menu móvel por teclado e a ausência de rolagem horizontal.
- A matriz de responsividade também conferiu a saída do cabeçalho da área visível ao rolar, o fundo específico de cada página, o logo do rodapé e o fechamento dos detalhes por clique ou teclado.

## Requisitos acadêmicos verificados

| Requisito | Evidência |
|---|---|
| RF01 | Cabeçalho, menu e rodapé nas cinco páginas |
| RF02 | Quatro páginas HTML independentes com rotas próprias |
| RF03 | Todas as páginas da SWAPI percorridas pelo campo `next` |
| RF04 | Cards exibem nome ou título e campos resumidos |
| RF05 | Modal Bootstrap muda de registro, mantém rolagem interna e devolve o foco |
| RF06 | Pesquisa por nomes ou títulos, com caixa, acentos e espaços tratados |
| RF07 | Mensagem para pesquisa sem resultados e botão funcional de limpeza |
| RN01 | Cache JSON por categoria no localStorage |
| RN02 | Cache válido consultado antes da rede, comprovado em recarga |
| RNF01 | Bootstrap local e responsividade verificada em sete larguras |
| RNF02 | Semântica, labels, foco, teclado, estado ativo, movimento reduzido e contraste amostrado |
| RNF03 | API, cache, busca, filmes, imagens, modal e efeitos em módulos compartilhados |
| RNF04 | HTML5, CSS3, JavaScript, Bootstrap e Fetch API |

## Arquivos

- Home e catálogos: `index.html` e `pages/*.html`.
- Estilos: `css/home.css`, `css/global.css`, `css/recursos.css`, `css/experiencia.css` e `css/modal-cinema.css`.
- Módulos: `js/home.js`, `js/api.js`, `js/cache.js`, `js/busca.js`, `js/main.js`, `js/experiencia.js`, `js/filmes.js` e `js/modal.js`.
- Dados, testes e documentos: `data/filmes-complementares.json`, o novo `data/filmes-metadados-swapi.json`, `scripts/testar-site.py`, `README.md`, `DOCUMENTACAO.md` e este relatório.

As evidências no ZIP registram os testes e a lista de arquivos alterados em relação ao ZIP recebido.
