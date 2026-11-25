import { carregarRecurso } from './api.js';

// Títulos brasileiros dos episódios que já existem na SWAPI.
const titulos = {
    1: 'A Ameaça Fantasma',
    2: 'Ataque dos Clones',
    3: 'A Vingança dos Sith',
    4: 'Uma Nova Esperança',
    5: 'O Império Contra-Ataca',
    6: 'O Retorno de Jedi'
};

const categorias = {
    prequel: 'Trilogia Prequel',
    original: 'Trilogia Original',
    sequel: 'Trilogia Sequel',
    historias: 'Histórias Star Wars'
};

const episodiosRomanos = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
const ordemHistorias = new Map([['filme:solo', 4], ['filme:rogue-one', 5]]);
const arquivoLocal = new URL('../data/filmes-complementares.json', import.meta.url);
const arquivoMetadados = new URL('../data/filmes-metadados-swapi.json', import.meta.url);
let complementos;
let metadadosSwapi;

export function nomeCategoriaFilme(categoria) {
    return categorias[categoria] ?? '';
}

export function rotuloEpisodio(episodio) {
    return episodiosRomanos[episodio] ? 'Episódio ' + episodiosRomanos[episodio] : '';
}

function normalizarFilme(item, origem, detalhes = item) {
    const episodio = item.episode_id;
    const id = episodio ? 'filme:episodio-' + episodio : item.id;
    const categoria = !episodio ? 'historias' : episodio <= 3 ? 'prequel' : episodio <= 6 ? 'original' : 'sequel';

    return {
        ...item,
        id,
        titulo_pt: item.titulo_pt ?? titulos[episodio] ?? item.title,
        origem,
        categoria,
        duracao_min: Number.isInteger(detalhes.duracao_min) && detalhes.duracao_min > 0
            ? detalhes.duracao_min : null,
        sinopse: detalhes.sinopse,
        producao_verificada: detalhes.producao_verificada,
        nota_lancamento: detalhes.nota_lancamento,
        fonte_duracao_url: detalhes.fonte_duracao_url,
        fonte_creditos_url: detalhes.fonte_creditos_url,
        ordem_historia: ordemHistorias.get(id) ?? (episodio > 3 ? episodio + 2 : episodio)
    };
}

function lerComplementos() {
    complementos ??= fetch(arquivoLocal).then(async resposta => {
        if (!resposta.ok) throw new Error('O arquivo de filmes complementares está indisponível.');
        const itens = await resposta.json();
        if (!Array.isArray(itens) || itens.length !== 5 || itens.some(item =>
            typeof item?.id !== 'string' || typeof item.title !== 'string' ||
            typeof item.titulo_pt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.release_date)
        )) {
            throw new Error('O arquivo de filmes complementares é inválido.');
        }
        return itens;
    }).catch(erro => {
        complementos = undefined;
        throw erro;
    });
    return complementos;
}

function lerMetadadosSwapi() {
    metadadosSwapi ??= fetch(arquivoMetadados).then(async resposta => {
        if (!resposta.ok) throw new Error('Os metadados de filmes estão indisponíveis.');
        const itens = await resposta.json();
        if (!itens || typeof itens !== 'object' || Array.isArray(itens)) {
            throw new Error('Os metadados de filmes são inválidos.');
        }
        return itens;
    }).catch(() => {
        // A ficha essencial e a abertura permanecem disponíveis pela SWAPI.
        metadadosSwapi = undefined;
        return {};
    });
    return metadadosSwapi;
}

export async function carregarFilmes({ incluirMetadados = true, ...opcoes } = {}) {
    const [swapi, locais, metadados] = await Promise.all([
        carregarRecurso('films', opcoes), lerComplementos(),
        incluirMetadados ? lerMetadadosSwapi() : {}
    ]);
    const filmes = new Map();

    for (const filme of swapi.map(item => normalizarFilme(item, 'swapi', metadados[item.episode_id] ?? {}))) {
        filmes.set(filme.id, filme);
    }

    for (const filme of locais.map(item => normalizarFilme(item, 'complementar'))) {
        if (!filmes.has(filme.id)) filmes.set(filme.id, filme);
    }

    return [...filmes.values()].sort((a, b) => a.ordem_historia - b.ordem_historia);
}
