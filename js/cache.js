
/*
    STAR WARS EXPLORER
    Arquivo: cache.js

    Responsabilidades:
    - Salvar e recuperar dados do localStorage.
    - Verificar a validade dos dados armazenados.
    - Evitar requisições desnecessárias à API.
    - Gerenciar os identificadores das naves favoritas.
*/

// Tempo de validade do cache: 24 horas em milissegundos.
const VALIDADE = 24 * 60 * 60 * 1000;

/*
    FUNÇÃO: chaveCache()

    Cria a chave utilizada para identificar os dados de cada recurso.

    Exemplo:
    chaveCache('planets') -> 'swe:cache:v1:planets'
*/
function chaveCache(recurso) {
    return 'swe:cache:v1:' + recurso;
}


/*
    FUNÇÃO: ler()

    Recupera um valor do localStorage e converte o JSON
    armazenado em dados JavaScript.

    Retorna null caso não consiga recuperar ou interpretar os dados.
*/
function ler(chave) {
    try {
        // Recupera o texto armazenado e interpreta o JSON.
        const texto = localStorage.getItem(chave);

        return JSON.parse(texto);

    } catch {
        return null;
    }
}


/*
    FUNÇÃO: salvar()

    Converte os dados em JSON e os armazena no localStorage.

    Retorna true quando consegue salvar ou false se ocorrer um erro.
*/
function salvar(chave, valor) {
    try {
        // Converte os dados JavaScript em texto JSON.
        const texto = JSON.stringify(valor);

        // Armazena o texto utilizando a chave informada.
        localStorage.setItem(chave, texto);

        return true;

    } catch {
        return false;
    }
}


/*
    FUNÇÃO: lerCache()

    Recupera os registros de um recurso e verifica
    se os dados estão dentro das 24 horas de validade.

    Retorna os registros ou null caso o cache seja inválido.
*/
export function lerCache(recurso) {

    // Cria a chave correspondente ao recurso.
    const chave = chaveCache(recurso);

    // Recupera o cache armazenado no navegador.
    const cache = ler(chave);

    // Verifica se os dados são um array e se a data é válida.
    const dadosValidos = Array.isArray(cache?.dados);
    const dataValida = Number.isFinite(cache?.data);

    if (!dadosValidos || !dataValida) {
        return null;
    }

    // Calcula quanto tempo passou desde o salvamento.
    const idade = Date.now() - cache.data;

    // Rejeita dados salvos no futuro ou com 24 horas ou mais.
    if (idade < 0 || idade >= VALIDADE) {
        return null;
    }

    // Retorna somente os registros armazenados.
    return cache.dados;
}


/*
    FUNÇÃO: salvarCache()

    Armazena os registros junto com a data atual,
    permitindo verificar sua validade posteriormente.
*/
export function salvarCache(recurso, dados) {

    // Objeto contendo a data e os registros.
    const cache = {
        data: Date.now(),
        dados: dados
    };

    // Salva o objeto na chave correspondente ao recurso.
    return salvar(chaveCache(recurso), cache);
}