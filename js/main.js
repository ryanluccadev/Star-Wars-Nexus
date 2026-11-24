
/*
    STAR WARS NEXUS
    Arquivo: main.js

    Responsabilidades:
    - Carregar os registros da API ou do cache.
    - Criar e exibir os cards das quatro categorias.
    - Exibir os detalhes dos registros em um modal.
    - Controlar a busca e a ordenação dos resultados.
    - Gerenciar a paginação e as mensagens da interface.
*/

import { carregarRecurso, indexarNomes, urlRegistro } from './api.js';
import { imagemDoRegistro, placeholders } from './imagens.js';
import { carregarFilmes, nomeCategoriaFilme, rotuloEpisodio } from './filmes.js';
import { filtrarRegistros } from './busca.js';
import { abrirModal, elemento, prepararModal, termosEmPortugues, valorExibido } from './modal.js';

// Configurações da página
const recurso = document.body.dataset.recurso;
const porPagina = 6;

// Nomes utilizados nas mensagens da interface.
const categorias = {
    people: ['personagem', 'personagens', 'encontrado', 'encontrados'],
    planets: ['planeta', 'planetas', 'encontrado', 'encontrados'],
    starships: ['nave', 'naves', 'encontrada', 'encontradas'],
    films: ['filme', 'filmes', 'encontrado', 'encontrados']
};

const substantivo = categorias[recurso];

// Elementos da interface
const $ = id => document.getElementById(id);

const lista = $('lista');
const busca = $('busca');
const ordem = $('ordem');
const categoriaFilme = $('categoria-filme');
const limparBusca = $('limpar-busca');
const notaCache = $('nota-cache');
const status = $('status');
const feedback = $('feedback');
const acao = $('acao');
const atualizar = $('atualizar');
const paginacao = $('paginacao');

// Ordem de destaque dos planetas.
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


// Retorna o nome ou título de um registro.
function nomeRegistro(item) {
    return item.name ?? item.titulo_pt ?? item.title ?? 'Sem título';
}


// Cria imagens a partir do ID da SWAPI, ou do número do episódio nos filmes.
function criarImagem(item, card = false) {
    const imagem = elemento('img', '', card ? 'card-image' : 'detail-image');
    const vertical = recurso === 'people' || recurso === 'films';
    const padrao = placeholders[recurso];
    const selecionada = imagemDoRegistro(recurso, item);

    const definir = ({ arquivo, descricao }) => {
        imagem.classList.toggle('is-placeholder', arquivo === padrao.arquivo);
        imagem.alt = descricao;
        imagem.title = descricao;
        imagem.src = new URL('../assets/imagens/' + arquivo, import.meta.url).href;
    };

    imagem.width = vertical ? 480 : 600;
    imagem.height = vertical ? 720 : 300;
    imagem.decoding = 'async';

    if (card) {
        imagem.loading = 'lazy';
    }

    if (selecionada !== padrao) {
        imagem.addEventListener('error', () => definir(padrao), { once: true });
    }

    definir(selecionada);
    return imagem;
}

// Define as informações exibidas em cada tipo de card.
function camposCard(item) {
    switch (recurso) {
        case 'people':
            return [
                ['Altura', /^\d+$/.test(item.height) ? item.height + ' cm' : item.height],
                ['Nascimento', item.birth_year]
            ];

        case 'planets':
            return [
                ['Clima', termosEmPortugues(item.climate)],
                ['Terreno', termosEmPortugues(item.terrain)]
            ];

        case 'starships':
            return [
                ['Modelo', item.model],
                ['Fabricante', item.manufacturer]
            ];

        case 'films':
            return [
                ['Lançamento', typeof item.release_date === 'string' && /^\d{4}-/.test(item.release_date)
                    ? item.release_date.slice(0, 4) : null]
            ];

        default:
            return [];
    }
}


// Cria um card com informações resumidas e um botão de detalhes.
function criarCard(item) {
    const card = elemento('article', '', 'catalog-card');
    const imagem = criarImagem(item, true);
    const visual = elemento('div', '', 'card-media');
    visual.append(imagem);
    if (recurso === 'films') {
        const numero = rotuloEpisodio(item.episode_id).replace('Episódio ', '') || '◇';
        const arte = elemento('span', numero, 'film-poster-fallback');
        arte.setAttribute('aria-hidden', 'true');
        visual.append(arte);
    }
    const conteudo = elemento('div', '', 'card-copy');

    const tituloTexto = nomeRegistro(item);
    const titulo = elemento('h2', tituloTexto);

    if (recurso === 'films') {
        const episodio = rotuloEpisodio(item.episode_id);
        const grupo = nomeCategoriaFilme(item.categoria);
        const fonte = item.origem === 'swapi' ? 'SWAPI' : 'Complementar';
        const etiqueta = [episodio, grupo, fonte].filter(Boolean).join(' · ');
        conteudo.append(elemento('p', etiqueta, 'card-episode'));
    }

    conteudo.append(titulo);

    if (recurso === 'films') {
        const original = elemento('p', item.title, 'card-original');
        original.lang = 'en';
        conteudo.append(original);
    }

    const dados = elemento('dl', '', 'card-data');

    // Adiciona as informações específicas da categoria.
    for (const [rotulo, valor] of camposCard(item)) {
        const linha = elemento('div');

        linha.append(
            elemento('dt', rotulo),
            elemento('dd', recurso === 'films' && valor ? valor : valorExibido(valor))
        );

        dados.append(linha);
    }

    // Botão responsável por abrir o modal de detalhes.
    const detalhes = elemento('button', 'Ver detalhes →', 'gold-button');

    detalhes.type = 'button';
    detalhes.setAttribute(
        'aria-label',
        'Ver detalhes de ' + tituloTexto
    );

    const registro = urlRegistro(item.url, recurso);

    detalhes.addEventListener('click', () => {
        const modal = prepararModal({
            recurso,
            item,
            imagem: criarImagem(item),
            registro,
            nomes: indexarNomes(recurso, registros)
        });

        if (!abrirModal(modal, detalhes)) {
            status.textContent =
                'O componente de detalhes do Bootstrap não pôde ser carregado.';
        }
    });

    conteudo.append(dados, detalhes);
    card.append(visual, conteudo);

    return card;
}


// Exibe uma mensagem de feedback e um botão de ação.
function mostrarFeedback(mensagem, rotulo) {
    $('mensagem').textContent = mensagem;
    acao.textContent = rotulo;
    feedback.hidden = false;
}


// Cria os botões para navegar entre as páginas de resultados.
function montarPaginacao(total) {
    paginacao.replaceChildren();
    paginacao.hidden = total <= 1;

    if (total <= 1) {
        return;
    }

    // Adiciona um botão à paginação.
    const incluir = (texto, destino, rotulo, indisponivel = false) => {
        const distante = Math.abs(destino - pagina) > 1;
        const intermediaria = destino > 1 && destino < total;
        const numerico = /^\d+$/.test(texto);

        // Oculta páginas distantes quando existem muitas páginas.
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

        if (numerico && destino === pagina && !indisponivel) {
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


// Atualiza os cards, a quantidade de resultados e a paginação.
function renderizar() {
    const categoria = categoriaFilme?.value;
    const disponiveis = categoria
        ? registros.filter(item => item.categoria === categoria)
        : registros;
    limparBusca.hidden = busca.value.length === 0;
    const filtrados = filtrarRegistros(
        disponiveis,
        busca.value,
        ordem?.value
    );

    const total = filtrados.length;
    const paginas = Math.ceil(total / porPagina);

    // Garante que a página atual esteja dentro do limite.
    pagina = Math.max(1, Math.min(pagina, paginas || 1));

    const inicio = (pagina - 1) * porPagina;

    const rotulo = total === 1
        ? substantivo[0]
        : substantivo[1];

    const encontrados = total === 1
        ? substantivo[2]
        : substantivo[3];

    status.textContent =
        total + ' ' + rotulo + ' ' + encontrados +
        (paginas > 1 ? ' · Página ' + pagina + ' de ' + paginas : '');

    // Seleciona apenas os registros da página atual.
    const itens = filtrados.slice(inicio, inicio + porPagina);

    lista.replaceChildren(...itens.map(criarCard));

    montarPaginacao(paginas);

    feedback.hidden = true;

    if (!total) {
        mostrarFeedback('Nenhum resultado corresponde à busca.', 'Limpar filtros');
    }
}


// Habilita ou desabilita os controles durante o carregamento.
function habilitarControles(habilitado) {
    for (const campo of [busca, ordem, categoriaFilme, limparBusca]) {
        if (campo) {
            campo.disabled = !habilitado;
        }
    }

    atualizar.hidden = !habilitado;
}


// Carrega os registros da API ou do cache.
async function carregar(forcar = false, origem) {
    erro = false;

    habilitarControles(false);

    lista.setAttribute('aria-busy', 'true');
    notaCache.hidden = true;
    lista.replaceChildren(...Array.from({ length: porPagina }, () => {
        const card = elemento('article', '', 'catalog-card catalog-skeleton');
        card.setAttribute('aria-hidden', 'true');
        const corpo = elemento('div', '', 'card-copy');
        corpo.append(
            elemento('span', '', 'skeleton-line'),
            elemento('span', '', 'skeleton-line'),
            elemento('span', '', 'skeleton-button')
        );
        card.append(elemento('div', '', 'skeleton-image'), corpo);
        return card;
    }));

    paginacao.hidden = true;
    feedback.hidden = true;

    status.textContent = 'Carregando ' + substantivo[1] + '…';

    try {
        const opcoes = {
            atualizar: forcar,
            aoUsarDadosLocais: () => { notaCache.hidden = false; }
        };
        registros = recurso === 'films'
            ? await carregarFilmes(opcoes)
            : await carregarRecurso(recurso, opcoes);

        // A opção Imagens em destaque mantém os registros ilustrados no início.
        if (recurso === 'people' || recurso === 'planets') {
            const semImagem = item => Number(imagemDoRegistro(recurso, item) === placeholders[recurso]);
            registros = [...registros].sort((a, b) =>
                semImagem(a) - semImagem(b) ||
                (destaques.get(a.name) ?? Infinity) - (destaques.get(b.name) ?? Infinity)
            );
        }

        pagina = 1;

        habilitarControles(true);
        renderizar();

    } catch {
        erro = true;
        lista.replaceChildren();

        status.textContent =
            'Não foi possível carregar ' + substantivo[1] + '.';

        mostrarFeedback(
            'Verifique sua conexão ou tente novamente em instantes.',
            'Tentar novamente'
        );

    } finally {
        lista.setAttribute('aria-busy', 'false');
        // Os controles de atualização ficam ocultos durante a consulta.
        if (origem && document.activeElement === document.body) {
            (erro ? acao : atualizar).focus();
        }
    }
}


// Retorna à primeira página quando a busca ou a ordenação muda.
function redefinirPagina() {
    pagina = 1;
    renderizar();
}


// Eventos da interface
busca.value = new URLSearchParams(location.search).get('busca') ?? '';
busca.addEventListener('input', redefinirPagina);
categoriaFilme?.addEventListener('change', redefinirPagina);
limparBusca.addEventListener('click', () => {
    busca.value = '';
    redefinirPagina();
    busca.focus();
});
ordem?.addEventListener('change', redefinirPagina);

atualizar.addEventListener('click', () => carregar(true, atualizar));

acao.addEventListener('click', () => {
    if (erro) {
        carregar(true, acao);
        return;
    }

    busca.value = '';
    if (categoriaFilme) categoriaFilme.value = '';

    if (ordem) {
        ordem.selectedIndex = 0;
    }

    redefinirPagina();
    busca.focus();
});


// Carregamento inicial da página
carregar();
