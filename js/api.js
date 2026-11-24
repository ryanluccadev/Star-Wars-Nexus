
/* ===============================================================================
    STAR WARS EXPLORER
    Arquivo: api.js

    Responsabilidades:
    - Fazer requisições à API utilizando fetch().
    - Buscar todos os registros, percorrendo as páginas da API.
    - Validar os dados e endereços recebidos.
    - Utilizar o cache para evitar requisições desnecessárias.
    - Disponibilizar os registros para outras partes do sistema.
   =============================================================================== */

import { lerCache, salvarCache } from './cache.js';

// Endereço principal da API Star Wars.
const ORIGEM = 'https://swapi.dev';

// Recursos disponíveis no sistema.
const RECURSOS_PERMITIDOS = ['people', 'planets', 'starships', 'films'];


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
        if (!RECURSOS_PERMITIDOS.includes(recurso)) {
            return null;
        }

        // Transforma o endereço recebido em um objeto URL.
        const url = new URL(valor);

        // Verifica se o protocolo é HTTP ou HTTPS.
        const protocoloValido = ['http:', 'https:'].includes(url.protocol);

        // Verifica se o domínio pertence à SWAPI.
        const dominioValido = url.host === 'swapi.dev';

        // Rejeita a URL se alguma condição for inválida.
        if (!protocoloValido || !dominioValido) {
            return null;
        }

        // Define o formato esperado: /api/recurso/id/
        const padrao = new RegExp('^/api/' + recurso + '/[0-9]+/?$');

        // Verifica se o caminho corresponde ao padrão.
        if (!padrao.test(url.pathname)) {
            return null;
        }

        // Reconstrói a URL utilizando HTTPS.
        const urlPadronizada = new URL(url.pathname, ORIGEM);

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
export async function carregarRecurso(recurso, { atualizar = false } = {}) {

    // 1. Verifica se o recurso solicitado é permitido.
    if (!RECURSOS_PERMITIDOS.includes(recurso)) {
        throw new Error('Recurso inválido');
    }

    // 2. Verifica se existem dados armazenados no cache.
    let cache = null;

    if (!atualizar) {
        cache = lerCache(recurso);
    }

    // Se encontrou cache válido, retorna os dados armazenados.
    if (cache) {
        return cache;
    }

    // 3. Prepara as variáveis utilizadas na paginação.
    const caminho = '/api/' + recurso + '/';

    // Endereço da primeira página que será consultada.
    let proxima = new URL(caminho, ORIGEM);

    // Guarda os endereços das páginas já visitadas.
    const visitadas = new Set();

    // Array que receberá os registros de todas as páginas.
    const registros = [];

    // 4. Continua buscando enquanto existir uma próxima página.
    while (proxima) {

        // Verifica se o endereço pertence à origem esperada.
        const origemValida = proxima.origin === ORIGEM;

        // Verifica se o caminho corresponde ao recurso solicitado.
        const caminhoValido = proxima.pathname === caminho;

        // Verifica se essa página já foi consultada.
        const paginaRepetida = visitadas.has(proxima.href);

        // Interrompe a busca caso a paginação seja inválida.
        if (!origemValida || !caminhoValido || paginaRepetida) {
            throw new Error('Paginação inválida');
        }

        // Registra o endereço para evitar páginas repetidas.
        visitadas.add(proxima.href);

        // 5. Prepara um controlador para cancelar a requisição.
        const controller = new AbortController();

        // Agenda o cancelamento caso demore mais de 12 segundos.
        const timeout = setTimeout(() => {
            controller.abort();
        }, 12000);

        let pagina;

        try {
            // Faz a requisição HTTP para a página atual.
            const resposta = await fetch(proxima, {
                signal: controller.signal
            });

            // Verifica se a requisição HTTP foi bem-sucedida.
            if (!resposta.ok) {
                throw new Error('HTTP ' + resposta.status);
            }

            // Lê o JSON recebido e converte em dados JavaScript.
            pagina = await resposta.json();

        } finally {
            // Cancela o temporizador após a tentativa de requisição.
            clearTimeout(timeout);
        }

        // 6. Verifica se a API retornou um array de registros.
        const resultadosValidos = Array.isArray(pagina?.results);

        if (!resultadosValidos) {
            throw new Error('Resposta inválida');
        }

        // Filmes possuem "title"; os demais recursos possuem "name".
        const propriedadeNome = recurso === 'films' ? 'title' : 'name';

        // Verifica se todos os registros possuem o campo esperado.
        const nomeInvalido = pagina.results.some(
            item => typeof item?.[propriedadeNome] !== 'string'
        );

        if (nomeInvalido) {
            throw new Error('Resposta inválida');
        }

        // 7. Adiciona os registros recebidos ao array principal.
        registros.push(...pagina.results);

        // Verifica se a informação da próxima página é válida.
        if (pagina.next !== null && typeof pagina.next !== 'string') {
            throw new Error('Paginação ausente');
        }

        // 8. Define qual será a próxima página consultada.
        if (pagina.next === null) {
            proxima = null;
        } else {
            proxima = new URL(pagina.next, proxima);
        }

        // Converte URLs HTTP da SWAPI para HTTPS.
        if (proxima?.protocol === 'http:' &&
            proxima.host === 'swapi.dev') {
            proxima.protocol = 'https:';
        }
    }

    // 9. Armazena os registros após buscar todas as páginas.
    salvarCache(recurso, registros);

    // 10. Devolve o array completo para quem chamou a função.
    return registros;
}
