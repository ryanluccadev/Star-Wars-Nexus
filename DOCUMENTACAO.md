# Documentação técnica

## Estrutura

| Caminho | Responsabilidade |
|---|---|
| `index.html`, `js/home.js`, `css/home.css` | Hero, apresentação, indicadores e quatro links de exploração |
| `pages/*.html`, `js/main.js`, `css/recursos.css` | Catálogos independentes, filtros, buscas e paginação |
| `js/api.js`, `js/cache.js`, `js/busca.js` | SWAPI, persistência e pesquisa |
| `js/filmes.js`, `data/filmes-complementares.json`, `data/filmes-metadados-swapi.json` | Integração da SWAPI, cinco filmes adicionais e dados oficiais de apoio |
| `js/modal.js`, `css/modal-cinema.css` | Detalhes, foco, rolagem interna e opening crawl |
| `js/experiencia.js`, `css/experiencia.css` | Efeitos compartilhados, progresso de rolagem e retorno ao topo |
| `js/imagens.js`, `data/imagens-locais.js`, `assets/` | Mapeamento, imagens, placeholders, fonte e licenças preservados |
| `scripts/` | Verificação do site, auditoria e ferramenta opcional de imagens |

Sirva a pasta por HTTP estático. Os módulos e o JSON local precisam ser lidos pela origem do site.

## SWAPI, paginação e busca

Os catálogos consultam `people`, `planets`, `starships` e `films` da [SWAPI](https://swapi.dev/). O código usa Fetch com timeout, valida as respostas e segue `next`. Repetições de página, endereços fora do recurso e respostas sem avanço interrompem a consulta com tratamento de erro. Os registros são deduplicados pelo endereço canônico. A paginação da interface usa os dados já recebidos.

A pesquisa compara todos os registros carregados e ignora caixa, acentos e espaços excedentes. Nos filmes, aceita o título original ou em português e combina busca, grupo e ordenação. As ordens disponíveis são narrativa, lançamento e alfabética.

## Cache e indicadores

O localStorage guarda JSON por categoria sob `swe:cache:v1:<categoria>` durante 24 horas. Cache válido vem antes da rede. O botão de atualização solicita novamente os dados. Se a rede falhar, o último catálogo válido pode ser exibido, com aviso. Respostas inválidas e armazenamento bloqueado são tratados. O estado vazio sem cache oferece nova tentativa.

A Home obtém personagens, planetas e naves do total já guardado ou da primeira resposta de cada endpoint. O indicador de filmes reflete a coleção dos seis registros da SWAPI e dos cinco complementares. A Home dispensa a leitura dos metadados de apoio usados somente nas fichas. A chave `swn:contagem:v1:<categoria>` guarda contagens válidas por 24 horas. Sem rede, o indicador pode aproveitar uma contagem anterior.

## Filmes e modais

Os episódios I a VI continuam dinâmicos. O JSON complementar contém VII, VIII, IX, *Rogue One* e *Han Solo*, identificados na interface como conteúdo adicional. A cronologia é I, II, III, *Han Solo*, *Rogue One*, IV, V, VI, VII, VIII e IX.

As onze fichas incluem sinopse breve e duração de referência da edição no Disney+ Brasil. As notas e os links da ficha esclarecem a proveniência dos dados de apoio. Quando aplicável, a produção usa o crédito verificado no AFI. Os dados da SWAPI continuam sendo a base para os episódios I a VI.

Os modais usam Bootstrap e são preenchidos a cada abertura com os dados do item selecionado. Ao fechar, o foco retorna ao controle. O texto de abertura vem da SWAPI e começa em leitura estática. Para os registros com texto há controles de início, pausa, reinício e leitura. O movimento reduzido preserva a leitura estática.

## Imagens e efeitos

Os arquivos de imagens, placeholders, diretórios e mapeamentos foram preservados. A cobertura será ampliada manualmente em outra etapa. O [inventário](CREDITOS-IMAGENS.md) mantém as atribuições e as condições de uso. Elementos decorativos do CSS ficam atrás do conteúdo. A animação contínua é pausada quando a aba fica oculta, e a versão móvel usa menos partículas e atualizações. Conteúdo estático e navegação permanecem disponíveis sem as animações.

## Verificar

Em um ambiente opcional com Python e Chromium, execute:

```sh
python -m pip install Pillow playwright
python -m playwright install chromium
python scripts/testar-site.py
python scripts/auditar-imagens.py
```

A opção `NEXUS_CHROMIUM_EXECUTABLE` permite usar um Chromium já instalado. O [relatório](RELATORIO.md) descreve os testes, os requisitos acadêmicos verificados e as limitações.
