
import { carregarRecurso, urlRegistro } from './api.js';
import { filtrarRegistros, listarClasses } from './busca.js';
import { abrirModal, elemento, prepararModal, valorExibido } from './modal.js';

// Configurações da página
const recurso = document.body.dataset.recurso;
const nave = recurso === 'starships';
const porPagina = 6;

const substantivo = nave ? ['nave', 'naves'] : ['planeta', 'planetas'];

// Elementos da interface
const $ = id => document.getElementById(id);

const lista = $('lista');
const busca = $('busca');
const classe = $('classe');
const ordem = $('ordem');
const status = $('status');
const feedback = $('feedback');
const acao = $('acao');
const atualizar = $('atualizar');
const paginacao = $('paginacao');

// Imagens específicas de planetas e naves
const imagens = new Map([
    ['Tatooine', 'tatooine'],
    ['Alderaan', 'alderaan'],
    ['Naboo', 'naboo'],
    ['Hoth', 'hoth'],
    ['Endor', 'endor'],
    ['Coruscant', 'coruscant'],
    ['Millennium Falcon', 'millennium-falcon'],
    ['X-wing', 'x-wing'],
    ['Star Destroyer', 'star-destroyer'],
    ['Slave 1', 'slave-1']
]);

// Ordem de destaque dos planetas
const destaques = new Map([
    ['Tatooine', 0],
    ['Alderaan', 1],
    ['Naboo', 2],
    ['Hoth', 3],
    ['Endor', 4],
    ['Coruscant', 5]
]);

// Estado da página
let registros = [];
let pagina = 1;
let erro = false;


/**
 * Cria a imagem de um planeta ou nave.
 * Utiliza uma imagem genérica caso não exista uma específica.
 *
 * @param {Object} item - Registro da API.
 * @param {boolean} card - Indica se a imagem será utilizada em um card.
 * @returns {HTMLImageElement} Elemento de imagem.
 */
function criarImagem(item, card = false) {
    const padrao = nave ? 'nave-generica' : 'planeta-generico';
    const nome = imagens.get(item.name);

    const imagem = elemento(
        'img',
        '',
        card ? 'card-image' : 'detail-image'
    );

    const descricaoPadrao = nave
        ? 'Ilustração genérica de uma nave no espaço'
        : 'Ilustração genérica de um planeta visto do espaço';

    imagem.src = new URL(
        '../assets/imagens/' + (nome ?? padrao) + '.webp',
        import.meta.url
    ).href;

    imagem.alt = nome
        ? 'Ilustração de ' + item.name
        : descricaoPadrao;

    if (card) {
        imagem.loading = 'lazy';
    }

    imagem.addEventListener('error', () => {
        if (nome) {
            imagem.src = new URL(
                '../assets/imagens/' + padrao + '.webp',
                import.meta.url
            ).href;

            imagem.alt = descricaoPadrao;
        }
    }, { once: true });

    return imagem;
}


/**
 * Cria um card com as informações resumidas de um registro.
 *
 * @param {Object} item - Planeta ou nave recebido da API.
 * @returns {HTMLElement} Card criado.
 */
function criarCard(item) {
    const card = elemento('article', '', 'catalog-card');
    const imagem = criarImagem(item, true);
    const conteudo = elemento('div', '', 'card-copy');
    const titulo = elemento('h2', item.name);

    const campos = nave
        ? [
            ['Modelo', item.model],
            ['Fabricante', item.manufacturer]
        ]
        : [
            ['Clima', item.climate],
            ['População', item.population]
        ];

    const dados = elemento('dl', '', 'card-data');

    for (const [rotulo, valor] of campos) {
        const linha = elemento('div');

        linha.append(
            elemento('dt', rotulo),
            elemento('dd', valorExibido(valor))
        );

        dados.append(linha);
    }

    // Botão que exibe os detalhes do registro no modal
    const detalhes = elemento('button', 'Ver detalhes →', 'gold-button');

    detalhes.type = 'button';
    detalhes.setAttribute('aria-label', 'Ver detalhes de ' + item.name);

    const registro = urlRegistro(item.url, recurso);

    detalhes.addEventListener('click', () => {
        const modal = prepararModal({
            nave,
            item,
            imagem: criarImagem(item),
            registro
        });

        if (!abrirModal(modal, detalhes)) {
            status.textContent =
                'O componente de detalhes do Bootstrap não pôde ser carregado.';
        }
    });

    conteudo.append(titulo, dados, detalhes);
    card.append(imagem, conteudo);

    return card;
}


/**
 * Exibe uma mensagem de feedback ao usuário.
 *
 * @param {string} mensagem - Texto da mensagem.
 * @param {string} rotulo - Texto do botão de ação.
 */
function mostrarFeedback(mensagem, rotulo) {
    $('mensagem').textContent = mensagem;
    acao.textContent = rotulo;
    feedback.hidden = false;
}


/**
 * Cria os botões de navegação entre páginas de resultados.
 *
 * @param {number} total - Quantidade total de páginas.
 */
function montarPaginacao(total) {
    paginacao.replaceChildren();
    paginacao.hidden = total <= 1;

    if (total <= 1) {
        return;
    }

    const incluir = (texto, destino, rotulo, indisponivel = false) => {
        const distante = Math.abs(destino - pagina) > 1;
        const intermediaria = destino > 1 && destino < total;
        const numerico = /^\d+$/.test(texto);

        if (total > 8 && intermediaria && distante && numerico) {
            if (destino === 2 || destino === total - 1) {
                paginacao.append(
                    elemento('span', '…', 'catalog-ellipsis')
                );
            }

            return;
        }

        const botao = elemento('button', texto, 'outline-button');

        botao.type = 'button';
        botao.disabled = indisponivel;
        botao.setAttribute('aria-label', rotulo);

        if (destino === pagina && !indisponivel) {
            botao.setAttribute('aria-current', 'page');
        }

        botao.addEventListener('click', () => {
            pagina = destino;
            renderizar();

            paginacao.querySelector('[aria-current="page"]')?.focus();
        });

        paginacao.append(botao);
    };

    incluir('‹', pagina - 1, 'Página anterior', pagina === 1);

    for (let numero = 1; numero <= total; numero += 1) {
        incluir(String(numero), numero, 'Página ' + numero);
    }

    incluir('›', pagina + 1, 'Próxima página', pagina === total);
}


/**
 * Atualiza os cards, o total de resultados e a paginação.
 */
function renderizar() {
    const filtrados = filtrarRegistros(
        registros,
        busca.value,
        classe?.value,
        ordem?.value
    );

    const total = filtrados.length;
    const paginas = Math.ceil(total / porPagina);
    const inicio = (pagina - 1) * porPagina;

    const rotulo = total === 1
        ? substantivo[0]
        : substantivo[1];

    const encontrados = nave
        ? (total === 1 ? 'encontrada' : 'encontradas')
        : (total === 1 ? 'encontrado' : 'encontrados');

    status.textContent =
        total + ' ' + rotulo + ' ' + encontrados +
        (paginas > 1 ? ' · Página ' + pagina + ' de ' + paginas : '');

    const itens = filtrados.slice(inicio, inicio + porPagina);

    lista.replaceChildren(...itens.map(criarCard));

    montarPaginacao(paginas);

    feedback.hidden = true;

    if (!total) {
        mostrarFeedback(
            'Nenhum resultado corresponde à busca ou aos filtros.',
            'Limpar busca e filtros'
        );
    }
}


/**
 * Habilita ou desabilita os controles durante o carregamento.
 *
 * @param {boolean} habilitado - Estado dos controles.
 */
function habilitarControles(habilitado) {
    for (const campo of [busca, classe, ordem]) {
        if (campo) {
            campo.disabled = !habilitado;
        }
    }

    atualizar.hidden = !habilitado;
}


/**
 * Carrega os registros da API ou do cache e atualiza a interface.
 *
 * @param {boolean} forcar - Indica se deve atualizar os dados da API.
 */
async function carregar(forcar = false) {
    erro = false;

    habilitarControles(false);

    lista.setAttribute('aria-busy', 'true');
    lista.replaceChildren();

    paginacao.hidden = true;
    feedback.hidden = true;

    status.textContent = 'Carregando ' + substantivo[1] + '…';

    try {
        registros = await carregarRecurso(recurso, {
            atualizar: forcar
        });

        // Mantém os planetas destacados no início da listagem
        if (recurso === 'planets') {
            registros = [...registros].sort((a, b) =>
                (destaques.get(a.name) ?? Infinity) -
                (destaques.get(b.name) ?? Infinity)
            );
        }

        // Preenche as opções do filtro de classes
        if (classe) {
            const anterior = classe.value;

            const opcoes = listarClasses(registros).map(
                nome => new Option(nome, nome)
            );

            classe.replaceChildren(
                new Option('Todas as classes', ''),
                ...opcoes
            );

            if (opcoes.some(opcao => opcao.value === anterior)) {
                classe.value = anterior;
            }
        }

        pagina = 1;

        habilitarControles(true);
        renderizar();

    } catch {
        erro = true;

        status.textContent =
            'Não foi possível carregar ' + substantivo[1] + '.';

        mostrarFeedback(
            'Verifique sua conexão ou tente novamente em instantes.',
            'Tentar novamente'
        );

    } finally {
        lista.setAttribute('aria-busy', 'false');
    }
}


/**
 * Retorna à primeira página e atualiza os resultados.
 */
function redefinirPagina() {
    pagina = 1;
    renderizar();
}


// Eventos da interface
busca.addEventListener('input', redefinirPagina);

classe?.addEventListener('change', redefinirPagina);
ordem?.addEventListener('change', redefinirPagina);

atualizar.addEventListener('click', () => carregar(true));

acao.addEventListener('click', () => {
    if (erro) {
        carregar(true);
        return;
    }

    busca.value = '';

    if (classe) {
        classe.value = '';
    }

    if (ordem) {
        ordem.value = 'asc';
    }

    redefinirPagina();
    busca.focus();
});


// Carregamento inicial da página
carregar();
