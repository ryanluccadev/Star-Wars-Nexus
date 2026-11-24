
/*
    STAR WARS NEXUS
    Arquivo: modal.js

    Responsabilidades:
    - Criar elementos HTML utilizados nas páginas.
    - Tratar informações vazias ou desconhecidas.
    - Montar os painéis com detalhes dos quatro recursos.
    - Exibir os detalhes utilizando o modal do Bootstrap.
*/

import { urlRegistro } from './api.js';
import { nomeCategoriaFilme, rotuloEpisodio } from './filmes.js';

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


const termosSwapi = new Map(Object.entries({
    male: 'Masculino', female: 'Feminino', hermaphrodite: 'Hermafrodita',
    blond: 'loiro', blonde: 'loiro', brown: 'castanho', black: 'preto',
    white: 'branco', auburn: 'castanho-avermelhado', grey: 'cinza', gray: 'cinza',
    blue: 'azul', yellow: 'amarelo', red: 'vermelho', green: 'verde',
    pink: 'rosa', gold: 'dourado', silver: 'prateado', orange: 'laranja',
    tan: 'bronzeado', pale: 'pálido', fair: 'claro', dark: 'escuro',
    temperate: 'temperado', tropical: 'tropical', arid: 'árido',
    frozen: 'congelado', murky: 'nebuloso', hot: 'quente', cold: 'frio',
    humid: 'úmido', windy: 'ventoso', desert: 'deserto',
    deserts: 'desertos', forests: 'florestas', forest: 'floresta',
    mountains: 'montanhas', grasslands: 'campos', cityscape: 'paisagem urbana',
    swamps: 'pântanos', swamp: 'pântano', jungles: 'selvas', jungle: 'selva',
    tundra: 'tundra', oceans: 'oceanos', lakes: 'lagos', valleys: 'vales',
    'gas giant': 'gigante gasoso', 'ice caves': 'cavernas de gelo'
}));

export function termosEmPortugues(valor) {
    if (typeof valor !== 'string') return valorExibido(valor);
    return valor.split(',').map(parte => {
        const termo = parte.trim();
        return termosSwapi.get(termo.toLowerCase()) ?? valorExibido(termo);
    }).join(', ');
}

// Formata os valores recebidos da API para exibição.
export function valorExibido(valor, unidade = '') {
    const texto = typeof valor === 'string' || Number.isFinite(valor) ? String(valor).trim() : '';

    // Trata valores desconhecidos ou não informados.
    if (!texto || /^(unknown|undefined|null|nan|infinity)$/i.test(texto)) {
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

        const descricao = elemento('dd');

        if (valor instanceof Node) {
            descricao.append(valor);
        } else {
            descricao.textContent = valorExibido(valor);
        }

        linha.append(elemento('dt', rotulo), descricao);

        lista.append(linha);
    }

    secao.append(
        elemento('h3', titulo),
        lista
    );

    return secao;
}

function linkExterno(rotulo, destino) {
    const link = elemento('a', rotulo);
    link.href = destino;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
}

// Mostra nomes quando os catálogos locais os oferecem e links identificáveis nos demais casos.
function relacoes(valor, recurso, tipo, nomes) {
    const itens = typeof valor === 'string' ? [valor] : valor;

    if (!Array.isArray(itens)) {
        return 'Não informado';
    }

    if (!itens.length) {
        return 'Nenhum';
    }

    const lista = elemento('ul', '', 'detail-relations');

    for (const url of itens) {
        const registro = urlRegistro(url, recurso);
        const linha = elemento('li');

        if (registro) {
            const id = new URL(registro).pathname.split('/')[3];
            linha.append(linkExterno(nomes.get(registro) ?? tipo + ' ' + id + ' na SWAPI', registro));
        } else {
            linha.textContent = 'Registro indisponível';
        }

        lista.append(linha);
    }

    return lista;
}


// Formata a data de lançamento dos filmes.
export function formatarData(data) {
    if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return 'Não informado';
    }

    const dataUtc = new Date(data + 'T00:00:00Z');
    if (!Number.isFinite(dataUtc.valueOf()) || dataUtc.toISOString().slice(0, 10) !== data) {
        return 'Não informado';
    }

    return data.split('-').reverse().join('/');
}


// Monta os painéis com as informações completas de um personagem.
function paineisPersonagem(item, nomes) {
    return [
        painel('Informações gerais', [
            ['Nascimento', valorExibido(item.birth_year)],
            ['Gênero', termosEmPortugues(item.gender)],
            ['Altura', valorExibido(item.height, ' cm')],
            ['Massa', valorExibido(item.mass, ' kg')]
        ]),

        painel('Características físicas', [
            ['Cor do cabelo', termosEmPortugues(item.hair_color)],
            ['Cor da pele', termosEmPortugues(item.skin_color)],
            ['Cor dos olhos', termosEmPortugues(item.eye_color)]
        ]),

        painel('Relações na SWAPI', [
            ['Filmes associados', relacoes(item.films, 'films', 'Filme', nomes)],
            ['Naves associadas', relacoes(item.starships, 'starships', 'Nave', nomes)],
            ['Veículos associados', relacoes(item.vehicles, 'vehicles', 'Veículo', nomes)],
            ['Planeta natal', relacoes(item.homeworld, 'planets', 'Planeta', nomes)],
            ['Espécies associadas', relacoes(item.species, 'species', 'Espécie', nomes)]
        ])
    ];
}


// Monta os painéis com as informações completas de um planeta.
function paineisPlaneta(item, nomes) {
    return [
        painel('Informações gerais', [
            ['Clima', termosEmPortugues(item.climate)],
            ['Terreno', termosEmPortugues(item.terrain)],
            ['População', valorExibido(item.population)],
            ['Diâmetro', valorExibido(item.diameter, ' km')],
            ['Gravidade', valorExibido(item.gravity)],
            ['Rotação', valorExibido(item.rotation_period, ' h')],
            ['Órbita', valorExibido(item.orbital_period, ' dias')],
            ['Água na superfície', valorExibido(item.surface_water, '%')]
        ]),

        painel('Relações na SWAPI', [
            ['Residentes cadastrados', relacoes(item.residents, 'people', 'Personagem', nomes)],
            ['Filmes associados', relacoes(item.films, 'films', 'Filme', nomes)]
        ])
    ];
}


// Monta os painéis com as informações completas de uma nave.
function paineisNave(item, nomes) {
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
            ['Filmes associados', relacoes(item.films, 'films', 'Filme', nomes)],
            ['Pilotos cadastrados', relacoes(item.pilots, 'people', 'Personagem', nomes)]
        ])
    ];
}


function urlFonteFilme(valor) {
    try {
        const url = new URL(valor);
        const dominios = ['www.starwars.com', 'www.disneyplus.com', 'catalog.afi.com'];
        if (url.protocol === 'https:' && dominios.includes(url.host) && !url.username && !url.password) {
            return url.href;
        }
    } catch {
        // Endereço ausente ou inválido.
    }
    return null;
}

function sinopseFilme(item) {
    const secao = elemento('section', '', 'detail-panel detail-synopsis');
    secao.append(elemento('h3', 'Sinopse'), elemento('p', valorExibido(item.sinopse)));

    if (item.nota_lancamento) {
        secao.append(elemento('aside', valorExibido(item.nota_lancamento), 'detail-source-note'));
    }

    const fontes = [
        ['Duração e enredo no Disney+ Brasil', urlFonteFilme(item.fonte_duracao_url)],
        ['Créditos de produção', urlFonteFilme(item.fonte_creditos_url)]
    ];
    const lista = elemento('ul', '', 'detail-sources');

    for (const [rotulo, destino] of fontes) {
        if (!destino) continue;
        const linha = elemento('li');
        linha.append(linkExterno(rotulo, destino));
        lista.append(linha);
    }

    if (lista.childElementCount) secao.append(lista);
    return secao;
}

// Monta os painéis com as informações completas de um filme.
function paineisFilme(item, nomes) {
    const tituloOriginal = elemento('span', valorExibido(item.title));
    if (item.title) tituloOriginal.lang = 'en';

    const detalhes = [
        painel('Ficha do filme', [
            ['Título original', tituloOriginal],
            ['Episódio', rotuloEpisodio(item.episode_id) || 'História Star Wars'],
            ['Categoria', nomeCategoriaFilme(item.categoria)],
            ['Direção', valorExibido(item.director)],
            ['Produção', valorExibido(item.producao_verificada ?? item.producer)],
            ['Lançamento', formatarData(item.release_date)],
            ['Duração', valorExibido(item.duracao_min, ' min')],
            ['Fonte dos dados', item.origem === 'complementar' ? 'Catálogo complementar local' : 'SWAPI']
        ]),
        sinopseFilme(item),
        aberturaFilme(item.opening_crawl)
    ];

    if (item.origem !== 'complementar') {
        detalhes.push(painel('Relações na SWAPI', [
            ['Personagens', relacoes(item.characters, 'people', 'Personagem', nomes)],
            ['Planetas', relacoes(item.planets, 'planets', 'Planeta', nomes)],
            ['Naves', relacoes(item.starships, 'starships', 'Nave', nomes)],
            ['Veículos', relacoes(item.vehicles, 'vehicles', 'Veículo', nomes)],
            ['Espécies', relacoes(item.species, 'species', 'Espécie', nomes)]
        ]));
    }

    return detalhes;
}

let limparCrawl;

function aberturaFilme(texto) {
    const secao = elemento('section', '', 'detail-panel detail-crawl');
    secao.append(elemento('h3', 'Texto de abertura'));

    if (typeof texto !== 'string' || !texto.trim() || /^(unknown|undefined|null|n\/a)$/i.test(texto.trim())) {
        secao.append(elemento('p', 'Não informado'));
        return secao;
    }

    const leitura = elemento('div', texto, 'crawl-reading');
    leitura.lang = 'en';
    const palco = elemento('div', '', 'crawl-stage');
    palco.hidden = true;
    palco.setAttribute('aria-hidden', 'true');
    const movimento = elemento('div', texto, 'crawl-moving');
    palco.append(movimento);

    const controles = elemento('div', '', 'crawl-controls');
    const botoes = ['Iniciar', 'Pausar', 'Reiniciar', 'Leitura estática'].map(rotulo => {
        const botao = elemento('button', rotulo, 'outline-button');
        botao.type = 'button';
        controles.append(botao);
        return botao;
    });
    const [iniciar, pausar, reiniciar, estatica] = botoes;
    const preferencia = matchMedia('(prefers-reduced-motion: reduce)');
    const ouvintes = new AbortController();
    let animacao;

    function mostrarLeitura() {
        if (animacao) {
            animacao.onfinish = null;
            animacao.cancel();
            animacao = undefined;
        }
        palco.hidden = true;
        leitura.classList.remove('visually-hidden');
        pausar.textContent = 'Pausar';
        pausar.disabled = true;
    }

    function animar() {
        if (preferencia.matches || typeof movimento.animate !== 'function') return;
        mostrarLeitura();
        leitura.classList.add('visually-hidden');
        palco.hidden = false;
        pausar.disabled = false;

        animacao = movimento.animate([
            { transform: 'rotateX(24deg) translateY(16rem)', opacity: 1 },
            { transform: 'rotateX(35deg) translateY(-85%)', opacity: 1, offset: .8 },
            { transform: 'rotateX(48deg) translateY(-120%)', opacity: 0 }
        ], {
            duration: Math.max(26000, texto.length * 48),
            easing: 'linear'
        });
        animacao.onfinish = mostrarLeitura;
    }

    function atualizarPreferencia() {
        const reduzir = preferencia.matches || typeof movimento.animate !== 'function';
        iniciar.disabled = reduzir;
        reiniciar.disabled = reduzir;
        if (reduzir) mostrarLeitura();
    }

    iniciar.addEventListener('click', animar);
    reiniciar.addEventListener('click', animar);
    estatica.addEventListener('click', mostrarLeitura);
    pausar.addEventListener('click', () => {
        if (!animacao) return;
        if (animacao.playState === 'paused') {
            animacao.play();
            pausar.textContent = 'Pausar';
        } else {
            animacao.pause();
            pausar.textContent = 'Retomar';
        }
    });
    preferencia.addEventListener('change', atualizarPreferencia, { signal: ouvintes.signal });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && animacao?.playState === 'running') pausar.click();
    }, { signal: ouvintes.signal });
    limparCrawl = () => {
        mostrarLeitura();
        ouvintes.abort();
        limparCrawl = undefined;
    };

    mostrarLeitura();
    atualizarPreferencia();
    secao.append(controles, leitura, palco);
    return secao;
}

// Preenche o modal com os detalhes do registro selecionado.
export function prepararModal({ recurso, item, imagem, registro, nomes = new Map() }) {
    const modal = document.querySelector('#detalhes');
    limparCrawl?.();

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
        item.name ?? item.titulo_pt ?? item.title ?? 'Sem título';

    modal.querySelector('#detalhes-status').textContent = '';

    // Substitui o conteúdo pelos detalhes do item selecionado.
    const corpo = modal.querySelector('#detalhes-corpo');

    corpo.replaceChildren(
        imagem,
        ...montarPaineis(item, nomes)
    );

    // Exibe o link original do registro na SWAPI, quando disponível.
    const link = modal.querySelector('#registro');

    const fonte = item.origem === 'complementar' ? urlFonteFilme(item.fonte_url) : null;
    const destino = urlRegistro(registro, recurso) ?? fonte;
    link.hidden = !destino;

    if (destino) {
        link.href = destino;
        link.textContent = fonte ? 'Ver fonte oficial ↗' : 'Ver na SWAPI ↗';
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

    const instancia = window.bootstrap.Modal.getOrCreateInstance(modal);
    const abertura = new AbortController();
    let encerrarAoAbrir = false;

    document.addEventListener('keydown', evento => {
        if (evento.key === 'Escape') encerrarAoAbrir = true;
    }, { capture: true, signal: abertura.signal });

    modal.addEventListener('shown.bs.modal', () => {
        abertura.abort();
        if (encerrarAoAbrir) instancia.hide();
    }, { once: true });

    modal.addEventListener(
        'hidden.bs.modal',
        () => {
            limparCrawl?.();
            origem.focus();
        },
        { once: true }
    );

    instancia.show(origem);

    return true;
}
