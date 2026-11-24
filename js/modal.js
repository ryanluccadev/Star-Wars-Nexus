
/*
    STAR WARS EXPLORER
    Arquivo: modal.js

    Responsabilidades:
    - Criar elementos HTML utilizados nas páginas.
    - Tratar informações vazias ou desconhecidas.
    - Montar os painéis com detalhes dos quatro recursos.
    - Exibir os detalhes utilizando o modal do Bootstrap.
*/

// Formata números conforme o padrão brasileiro.
const formato = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 20
});


// Cria um elemento HTML com texto e classe CSS opcionais.
export function elemento(tag, texto = '', classe = '') {
    const node = document.createElement(tag);

    node.textContent = texto;

    if (classe) {
        node.className = classe;
    }

    return node;
}


// Formata os valores recebidos da API para exibição.
export function valorExibido(valor, unidade = '') {
    const texto = String(valor ?? '').trim();

    // Trata valores desconhecidos ou não informados.
    if (!texto || /^unknown$/i.test(texto)) {
        return 'Não informado';
    }

    if (/^n\/a$/i.test(texto)) {
        return 'Não aplicável';
    }

    if (/^none$/i.test(texto)) {
        return 'Nenhum';
    }

    // Remove separadores de milhar antes da conversão.
    const numerico = texto.replaceAll(',', '');

    // Converte valores numéricos para o formato brasileiro.
    const convertido = /^\d+(\.\d+)?$/.test(numerico) &&
        Number.isFinite(Number(numerico))
            ? formato.format(Number(numerico))
            : texto;

    return unidade ? convertido + unidade : convertido;
}


// Cria um painel com título e lista de informações.
function painel(titulo, linhas) {
    const secao = elemento('section', '', 'detail-panel');
    const lista = elemento('dl');

    for (const [rotulo, valor] of linhas) {
        const linha = elemento('div');

        linha.append(
            elemento('dt', rotulo),
            elemento('dd', valor)
        );

        lista.append(linha);
    }

    secao.append(
        elemento('h3', titulo),
        lista
    );

    return secao;
}


// Retorna a quantidade de elementos de um array.
const contar = itens => Array.isArray(itens) ? itens.length : null;


// Formata a data de lançamento dos filmes.
function formatarData(data) {
    if (!data) {
        return 'Não informado';
    }

    const partes = data.split('-');

    if (partes.length !== 3) {
        return valorExibido(data);
    }

    return partes[2] + '/' + partes[1] + '/' + partes[0];
}


// Monta os painéis com as informações completas de um personagem.
function paineisPersonagem(item) {
    return [
        painel('Informações gerais', [
            ['Nascimento', valorExibido(item.birth_year)],
            ['Gênero', valorExibido(item.gender)],
            ['Altura', valorExibido(item.height, ' cm')],
            ['Massa', valorExibido(item.mass, ' kg')]
        ]),

        painel('Características físicas', [
            ['Cor do cabelo', valorExibido(item.hair_color)],
            ['Cor da pele', valorExibido(item.skin_color)],
            ['Cor dos olhos', valorExibido(item.eye_color)]
        ]),

        painel('Relações na SWAPI', [
            ['Filmes associados', valorExibido(contar(item.films))],
            ['Naves associadas', valorExibido(contar(item.starships))],
            ['Veículos associados', valorExibido(contar(item.vehicles))]
        ])
    ];
}


// Monta os painéis com as informações completas de um planeta.
function paineisPlaneta(item) {
    return [
        painel('Informações gerais', [
            ['Clima', valorExibido(item.climate)],
            ['Terreno', valorExibido(item.terrain)],
            ['População', valorExibido(item.population)],
            ['Diâmetro', valorExibido(item.diameter, ' km')],
            ['Gravidade', valorExibido(item.gravity)],
            ['Rotação', valorExibido(item.rotation_period, ' h')],
            ['Órbita', valorExibido(item.orbital_period, ' dias')],
            ['Água na superfície', valorExibido(item.surface_water, '%')]
        ]),

        painel('Relações na SWAPI', [
            ['Residentes cadastrados', valorExibido(contar(item.residents))],
            ['Filmes associados', valorExibido(contar(item.films))]
        ])
    ];
}


// Monta os painéis com as informações completas de uma nave.
function paineisNave(item) {
    return [
        painel('Informações gerais', [
            ['Modelo', valorExibido(item.model)],
            ['Fabricante', valorExibido(item.manufacturer)],
            ['Classe', valorExibido(item.starship_class)],
            ['Custo', valorExibido(item.cost_in_credits, ' créditos')]
        ]),

        painel('Características técnicas', [
            ['Comprimento', valorExibido(item.length, ' m')],
            ['Velocidade atmosférica máxima', valorExibido(item.max_atmosphering_speed, ' km/h')],
            ['Tripulação', valorExibido(item.crew)],
            ['Passageiros', valorExibido(item.passengers)],
            ['Capacidade de carga', valorExibido(item.cargo_capacity, ' kg')],
            ['Autonomia de suprimentos', valorExibido(item.consumables)],
            ['Classificação do hiperdrive', valorExibido(item.hyperdrive_rating)],
            ['MGLT', valorExibido(item.MGLT)]
        ]),

        painel('Relações na SWAPI', [
            ['Filmes associados', valorExibido(contar(item.films))],
            ['Pilotos cadastrados', valorExibido(contar(item.pilots))]
        ])
    ];
}


// Monta os painéis com as informações completas de um filme.
function paineisFilme(item) {
    return [
        painel('Informações gerais', [
            ['Episódio', valorExibido(item.episode_id)],
            ['Diretor', valorExibido(item.director)],
            ['Produtores', valorExibido(item.producer)],
            ['Lançamento', formatarData(item.release_date)]
        ]),

        painel('Relações na SWAPI', [
            ['Personagens cadastrados', valorExibido(contar(item.characters))],
            ['Planetas associados', valorExibido(contar(item.planets))],
            ['Naves associadas', valorExibido(contar(item.starships))],
            ['Veículos associados', valorExibido(contar(item.vehicles))],
            ['Espécies associadas', valorExibido(contar(item.species))]
        ]),

        painel('Texto de abertura', [
            ['Abertura', valorExibido(item.opening_crawl)]
        ])
    ];
}


// Preenche o modal com os detalhes do registro selecionado.
export function prepararModal({ recurso, item, imagem, registro }) {
    const modal = document.querySelector('#detalhes');

    // Seleciona os painéis correspondentes ao recurso.
    const paineis = {
        people: paineisPersonagem,
        planets: paineisPlaneta,
        starships: paineisNave,
        films: paineisFilme
    };

    const montarPaineis = paineis[recurso];

    if (!montarPaineis) {
        throw new Error('Recurso inválido');
    }

    // Atualiza o título e limpa mensagens anteriores.
    modal.querySelector('#detalhes-titulo').textContent =
        item.name ?? item.title ?? 'Sem título';

    modal.querySelector('#detalhes-status').textContent = '';

    // Substitui o conteúdo pelos detalhes do item selecionado.
    const corpo = modal.querySelector('#detalhes-corpo');

    corpo.replaceChildren(
        imagem,
        ...montarPaineis(item)
    );

    // Exibe o link original do registro na SWAPI, quando disponível.
    const link = modal.querySelector('#registro');

    link.hidden = !registro;

    if (registro) {
        link.href = registro;
    } else {
        link.removeAttribute('href');
    }

    return modal;
}


// Abre o modal do Bootstrap e devolve o foco ao botão ao fechá-lo.
export function abrirModal(modal, origem) {
    if (!window.bootstrap?.Modal) {
        return false;
    }

    modal.addEventListener(
        'hidden.bs.modal',
        () => origem.focus(),
        { once: true }
    );

    window.bootstrap.Modal.getOrCreateInstance(modal).show(origem);

    return true;
}
