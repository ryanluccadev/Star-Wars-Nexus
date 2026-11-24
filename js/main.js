
/*
    STAR WARS EXPLORER
    Arquivo: main.js

    Responsabilidades:
    - Carregar os registros da API ou do cache.
    - Criar e exibir os cards das quatro categorias.
    - Exibir os detalhes dos registros em um modal.
    - Controlar a busca e a ordenação dos resultados.
    - Gerenciar a paginação e as mensagens da interface.
*/

import { carregarRecurso, urlRegistro } from './api.js';
import { filtrarRegistros } from './busca.js';
import { abrirModal, elemento, prepararModal, valorExibido } from './modal.js';

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
const status = $('status');
const feedback = $('feedback');
const acao = $('acao');
const atualizar = $('atualizar');
const paginacao = $('paginacao');

// Imagens específicas de planetas e naves.
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

// Ordem de destaque dos planetas.
const destaques = new Map([
    ['Tatooine', 0],
    ['Alderaan', 1],
    ['Naboo', 2],
    ['Hoth', 3],
    ['Endor', 4],
    ['Coruscant', 5]
]);

// Ilustrações genéricas de personagens e filmes.
const ilustracoes = {
    people: `
        <svg xmlns="http://www.w3.org/2000/svg"
             viewBox="0 0 400 250">
            <rect width="400" height="250" fill="#09141e"/>
            <circle cx="200" cy="88" r="38"
                    fill="none" stroke="#ffd000" stroke-width="5"/>
            <path d="M115 205v-12a85 85 0 0 1 170 0v12"
                  fill="none" stroke="#ffd000"
                  stroke-width="5" stroke-linecap="round"/>
        </svg>
    `,
    films: `
        <svg xmlns="http://www.w3.org/2000/svg"
             viewBox="0 0 400 250">
            <rect width="400" height="250" fill="#09141e"/>
            <rect x="105" y="65" width="190" height="120" rx="8"
                  fill="none" stroke="#ffd000" stroke-width="5"/>
            <path d="M145 65v120M255 65v120"
                  stroke="#ffd000" stroke-width="4"/>
            <path d="M105 95h40M105 155h40M255 95h40M255 155h40"
                  stroke="#ffd000" stroke-width="4"/>
            <path d="m180 103 48 22-48 22z" fill="#ffd000"/>
        </svg>
    `
};

// Estado da página
let registros = [];
let pagina = 1;
let erro = false;


// Retorna o nome ou título de um registro.
function nomeRegistro(item) {
    return item.name ?? item.title ?? 'Sem título';
}


// Formata a data de lançamento dos filmes.
function formatarData(data) {
    if (!data || data === 'unknown') {
        return 'Não informado';
    }

    const partes = data.split('-');

    if (partes.length !== 3) {
        return data;
    }

    return partes[2] + '/' + partes[1] + '/' + partes[0];
}


// Cria uma imagem para o registro.
function criarImagem(item, card = false) {
    const imagem = elemento(
        'img',
        '',
        card ? 'card-image' : 'detail-image'
    );

    const nome = imagens.get(item.name);
    const titulo = nomeRegistro(item);

    // Personagens e filmes utilizam ilustrações genéricas.
    if (recurso === 'people' || recurso === 'films') {
        const svg = ilustracoes[recurso];

        imagem.src = 'data:image/svg+xml;charset=UTF-8,' +
            encodeURIComponent(svg);

        imagem.alt = recurso === 'people'
            ? 'Ilustração genérica de personagem'
            : 'Ilustração genérica de filme';

    } else {
        // Planetas e naves continuam utilizando as imagens existentes.
        const nave = recurso === 'starships';
        const padrao = nave ? 'nave-generica' : 'planeta-generico';

        const descricaoPadrao = nave
            ? 'Ilustração genérica de uma nave no espaço'
            : 'Ilustração genérica de um planeta visto do espaço';

        imagem.src = new URL(
            '../assets/imagens/' + (nome ?? padrao) + '.webp',
            import.meta.url
        ).href;

        imagem.alt = nome
            ? 'Ilustração de ' + titulo
            : descricaoPadrao;

        imagem.addEventListener('error', () => {
            if (nome) {
                imagem.src = new URL(
                    '../assets/imagens/' + padrao + '.webp',
                    import.meta.url
                ).href;

                imagem.alt = descricaoPadrao;
            }
        }, { once: true });
    }

    if (card) {
        imagem.loading = 'lazy';
    }

    return imagem;
}


// Define as informações exibidas em cada tipo de card.
function camposCard(item) {
    switch (recurso) {
        case 'people':
            return [
                ['Gênero', item.gender],
                ['Nascimento', item.birth_year]
            ];

        case 'planets':
            return [
                ['Clima', item.climate],
                ['População', item.population]
            ];

        case 'starships':
            return [
                ['Modelo', item.model],
                ['Fabricante', item.manufacturer]
            ];

        case 'films':
            return [
                ['Diretor', item.director],
                ['Lançamento', formatarData(item.release_date)]
            ];

        default:
            return [];
    }
}


// Cria um card com informações resumidas e um botão de detalhes.
function criarCard(item) {
    const card = elemento('article', '', 'catalog-card');
    const imagem = criarImagem(item, true);
    const conteudo = elemento('div', '', 'card-copy');

    const tituloTexto = nomeRegistro(item);
    const titulo = elemento('h2', tituloTexto);

    const dados = elemento('dl', '', 'card-data');

    // Adiciona as informações específicas da categoria.
    for (const [rotulo, valor] of camposCard(item)) {
        const linha = elemento('div');

        linha.append(
            elemento('dt', rotulo),
            elemento('dd', valorExibido(valor))
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
            nave: recurso === 'starships',
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


// Atualiza os cards, a quantidade de resultados e a paginação.
function renderizar() {
    const filtrados = filtrarRegistros(
        registros,
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
        mostrarFeedback(
            'Nenhum resultado corresponde à busca.',
            'Limpar busca'
        );
    }
}


// Habilita ou desabilita os controles durante o carregamento.
function habilitarControles(habilitado) {
    for (const campo of [busca, ordem]) {
        if (campo) {
            campo.disabled = !habilitado;
        }
    }

    atualizar.hidden = !habilitado;
}


// Carrega os registros da API ou do cache.
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

        // Exibe os planetas destacados no início da listagem.
        if (recurso === 'planets') {
            registros = [...registros].sort((a, b) =>
                (destaques.get(a.name) ?? Infinity) -
                (destaques.get(b.name) ?? Infinity)
            );
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


// Retorna à primeira página quando a busca ou a ordenação muda.
function redefinirPagina() {
    pagina = 1;
    renderizar();
}


// Eventos da interface
busca.addEventListener('input', redefinirPagina);
ordem?.addEventListener('change', redefinirPagina);

atualizar.addEventListener('click', () => carregar(true));

acao.addEventListener('click', () => {
    if (erro) {
        carregar(true);
        return;
    }

    busca.value = '';

    if (ordem) {
        ordem.value = 'asc';
    }

    redefinirPagina();
    busca.focus();
});


// Carregamento inicial da página
carregar();
