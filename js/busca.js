
/*
    STAR WARS EXPLORER
    Arquivo: busca.js

    Responsabilidades:
    - Normalizar os textos utilizados nas pesquisas.
    - Filtrar os registros pelo nome ou título.
    - Ordenar os resultados alfabeticamente.
*/

// Remove acentos e transforma o texto em letras minúsculas.
function normalizar(texto) {
    return texto
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLocaleLowerCase('pt-BR');
}

// Compara os textos considerando as regras do português.
const comparar = new Intl.Collator('pt-BR', {
    sensitivity: 'base',
    numeric: true
}).compare;


// Filtra os registros pelo nome ou título e aplica a ordenação selecionada.
export function filtrarRegistros(registros, termo, ordem = '') {

    // Remove espaços extras e normaliza o texto pesquisado.
    const consulta = normalizar(termo.trim());

    // Mantém apenas os registros que correspondem à pesquisa.
    const filtrados = registros.filter(item => {
        const nome = item.name ?? item.title ?? '';

        return normalizar(nome).includes(consulta);
    });

    // Ordena os registros de A–Z ou Z–A, conforme a opção escolhida.
    if (ordem === 'asc' || ordem === 'desc') {
        filtrados.sort((a, b) => {
            const nomeA = a.name ?? a.title ?? '';
            const nomeB = b.name ?? b.title ?? '';

            return comparar(nomeA, nomeB) * (ordem === 'desc' ? -1 : 1);
        });
    }

    return filtrados;
}
