
/* ===============================================================================
    STAR WARS NEXUS
    Arquivo: api.js

    Responsabilidades:
    - Fazer requisições à API utilizando fetch().
    - Buscar todos os registros, percorrendo as páginas da API.
    - Validar os dados e endereços recebidos.
    - Utilizar o cache para evitar requisições desnecessárias.
    - Disponibilizar os registros para outras partes do sistema.
   =============================================================================== */

import { lerCache, salvarCache, lerContagem, salvarContagem } from './cache.js';

// Endereço principal da API Star Wars.
const ORIGEM = 'https://swapi.dev';

// Recursos disponíveis no sistema.
const RECURSOS_PERMITIDOS = ['people', 'planets', 'starships', 'films'];
const RECURSOS_RELACIONADOS = [...RECURSOS_PERMITIDOS, 'species', 'vehicles'];


/* ===============================================================================
    FUNÇÃO: urlRegistro()

    Verifica se uma URL pertence à SWAPI e possui o formato esperado.

    Retorno:
    - URL padronizada em HTTPS, se for válida.
    - null, se for inválida.
   =============================================================================== */
export function urlRegistro(valor, recurso) {
    try {
        // Verifica se o recurso é permitido.
        if (!RECURSOS_RELACIONADOS.includes(recurso)) {
            return null;
        }

        // Transforma o endereço recebido em um objeto URL.
        const url = new URL(valor);

        // Verifica se o protocolo é HTTP ou HTTPS.
        const protocoloValido = ['http:', 'https:'].includes(url.protocol);

        // Verifica se o domínio pertence à SWAPI.
        const dominioValido = url.host === 'swapi.dev';

        // Rejeita a URL se alguma condição for inválida.
        if (!protocoloValido || !dominioValido || url.username || url.password) {
            return null;
        }

        // Define o formato esperado: /api/recurso/id/
        const padrao = new RegExp('^/api/' + recurso + '/[0-9]+/?$');

        // Verifica se o caminho corresponde ao padrão.
        if (!padrao.test(url.pathname)) {
            return null;
        }

        // Reconstrói a URL utilizando HTTPS.
        const urlPadronizada = new URL(url.pathname.replace(/\/?$/, '/'), ORIGEM);

        return urlPadronizada.href;

    } catch {
        // Caso a URL não possa ser interpretada.
        return null;
    }
}


/* ===============================================================================
    FUNÇÃO: carregarRecurso()

    Busca todos os registros de um recurso na SWAPI.

    Recursos disponíveis:
    - people: personagens.
    - planets: planetas.
    - starships: naves espaciais.
    - films: filmes.

    Retorno:
    - Array contendo todos os registros encontrados.
   =============================================================================== */
const pendentes = new Map();
const contagensPendentes = new Map();

function validarRecurso(recurso) {
    if (!RECURSOS_PERMITIDOS.includes(recurso)) throw new Error('Recurso inválido');
}

async function buscarPagina(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
        const resposta = await fetch(url, { signal: controller.signal });
        if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
        return await resposta.json();
    } finally {
        clearTimeout(timeout);
    }
}

export async function carregarRecurso(recurso, { atualizar = false, aoUsarDadosLocais } = {}) {
    validarRecurso(recurso);
    const cache = registrosValidosNoCache(recurso);
    if (cache && !atualizar) return cache;

    if (!pendentes.has(recurso)) {
        const promessa = buscarRecurso(recurso).finally(() => pendentes.delete(recurso));
        pendentes.set(recurso, promessa);
    }

    try {
        return await pendentes.get(recurso);
    } catch (erro) {
        const local = cache ?? registrosValidosNoCache(recurso, { aceitarExpirado: true });
        if (local) {
            aoUsarDadosLocais?.();
            return local;
        }
        throw erro;
    }
}

export async function contarRecurso(recurso) {
    validarRecurso(recurso);
    const cache = registrosValidosNoCache(recurso);
    if (cache) return cache.length;
    const catalogoPendente = pendentes.get(recurso);
    if (catalogoPendente) {
        try {
            return (await catalogoPendente).length;
        } catch (erro) {
            return contagemExpirada(recurso, erro);
        }
    }

    const local = lerContagem(recurso);
    if (local !== null) return local;

    if (!contagensPendentes.has(recurso)) {
        const url = new URL('/api/' + recurso + '/', ORIGEM);
        const promessa = buscarPagina(url).then(pagina => {
            if (!Number.isSafeInteger(pagina?.count) || pagina.count < 0) {
                throw new Error('Contagem indisponível');
            }
            salvarContagem(recurso, pagina.count);
            return pagina.count;
        }).finally(() => contagensPendentes.delete(recurso));

        contagensPendentes.set(recurso, promessa);
    }

    try {
        return await contagensPendentes.get(recurso);
    } catch (erro) {
        return contagemExpirada(recurso, erro);
    }
}

function contagemExpirada(recurso, erro) {
    const registros = registrosValidosNoCache(recurso, { aceitarExpirado: true });
    const contagem = registros?.length ?? lerContagem(recurso, { aceitarExpirado: true });
    if (contagem !== null) return contagem;
    throw erro;
}

function validarPagina(url, caminho) {
    if (url.protocol === 'http:' && url.host === 'swapi.dev') url.protocol = 'https:';
    if (url.origin !== ORIGEM || url.pathname !== caminho || url.username || url.password) {
        throw new Error('Endereço de paginação inválido');
    }

    const parametros = [...url.searchParams];
    if (parametros.length > 1 || parametros.some(([chave, valor]) =>
        chave !== 'page' || !/^[1-9]\d*$/.test(valor) || !Number.isSafeInteger(Number(valor))
    )) {
        throw new Error('Parâmetros de paginação inválidos');
    }

    return url.searchParams.get('page') ?? '1';
}

async function buscarRecurso(recurso) {
    const caminho = '/api/' + recurso + '/';
    let proxima = new URL(caminho, ORIGEM);
    const visitadas = new Set();
    const registros = new Map();
    let quantidade;

    while (proxima) {
        const numero = validarPagina(proxima, caminho);
        if (visitadas.has(numero)) throw new Error('A SWAPI repetiu uma página.');
        visitadas.add(numero);

        const pagina = await buscarPagina(proxima);
        if (!Array.isArray(pagina?.results)) throw new Error('Resposta inválida.');

        if (pagina.count !== undefined) {
            if (!Number.isSafeInteger(pagina.count) || pagina.count < 0 ||
                (quantidade !== undefined && quantidade !== pagina.count)) {
                throw new Error('Contagem inconsistente na SWAPI');
            }

            quantidade = pagina.count;
        }

        const totalAnterior = registros.size;
        for (const item of pagina.results) {
            const id = identidade(item, recurso);

            if (!id) {
                throw new Error('Registro inválido');
            }

            registros.set(id, item);
        }

        if (pagina.next === null) break;
        if (typeof pagina.next !== 'string' || !pagina.next.trim() ||
            registros.size === totalAnterior ||
            (quantidade !== undefined && registros.size >= quantidade)) {
            throw new Error('A SWAPI não forneceu uma próxima página válida.');
        }

        proxima = new URL(pagina.next, proxima);
    }

    if (quantidade !== undefined && registros.size !== quantidade) {
        throw new Error('A SWAPI retornou uma listagem incompleta');
    }

    const completos = [...registros.values()];
    salvarCache(recurso, completos, quantidade);
    salvarContagem(recurso, completos.length);
    return completos;
}

// Uma URL canônica identifica cada registro, inclusive após reordenar os cards.
function identidade(item, recurso) {
    const nome = recurso === 'films' ? item?.title : item?.name;
    return typeof nome === 'string' && nome.trim() ? urlRegistro(item.url, recurso) : null;
}

function registrosValidosNoCache(recurso, opcoes) {
    const cache = lerCache(recurso, opcoes);

    if (!cache) {
        return null;
    }

    const ids = cache.map(item => identidade(item, recurso));

    return ids.includes(null) || new Set(ids).size !== ids.length ? null : cache;
}

// Aproveita os catálogos já existentes para traduzir URLs de relacionamentos.
export function indexarNomes(recursoAtual, registrosAtuais) {
    const nomes = new Map();

    for (const recurso of RECURSOS_PERMITIDOS) {
        const itens = recurso === recursoAtual
            ? registrosAtuais
            : registrosValidosNoCache(recurso) ?? [];

        for (const item of itens) {
            const id = identidade(item, recurso);
            if (id) nomes.set(id, item.name ?? item.titulo_pt ?? item.title);
        }
    }

    return nomes;
}
