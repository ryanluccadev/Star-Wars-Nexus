
/*
    STAR WARS NEXUS
    Arquivo: busca.js

    Responsabilidades:
    - Normalizar os textos utilizados nas pesquisas.
    - Filtrar os registros pelo nome ou título.
    - Ordenar os resultados alfabeticamente.
*/

// Remove acentos e transforma o texto em letras minúsculas.
function normalizar(texto) {
    return texto
        .trim()
        .replace(/\s+/g, ' ')
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
    const consulta = normalizar(termo);

    // Mantém apenas os registros que correspondem à pesquisa.
    const filtrados = consulta
        ? registros.filter(item => [item.name, item.title, item.titulo_pt].some(nome =>
            typeof nome === 'string' && normalizar(nome).includes(consulta)
        ))
        : [...registros];

    // Ordena os registros de A–Z ou Z–A, conforme a opção escolhida.
    if (ordem === 'asc' || ordem === 'desc') {
        filtrados.sort((a, b) => {
            const nomeA = a.name ?? a.titulo_pt ?? a.title ?? '';
            const nomeB = b.name ?? b.titulo_pt ?? b.title ?? '';

            return comparar(nomeA, nomeB) * (ordem === 'desc' ? -1 : 1);
        });
    } else if (ordem === 'historia') {
        filtrados.sort((a, b) => a.ordem_historia - b.ordem_historia);
    } else if (ordem === 'lancamento') {
        const data = item => typeof item.release_date === 'string' ? item.release_date : '\uffff';
        filtrados.sort((a, b) => data(a).localeCompare(data(b)));
    }

    return filtrados;
}
