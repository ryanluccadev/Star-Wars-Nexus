
/*
    STAR WARS EXPLORER
    Arquivo: busca.js

    Responsabilidades:
    - Normalizar os textos utilizados nas pesquisas.
    - Filtrar os registros pelo nome.
    - Ordenar os resultados alfabeticamente.
*/

// Remove acentos e transforma o texto em letras minúsculas.
function normalizar(texto) {
    return texto
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLocaleLowerCase('pt-BR');
}

// Compara os nomes considerando as regras do português.
const comparar = new Intl.Collator('pt-BR', {
    sensitivity: 'base',
    numeric: true
}).compare;


// Filtra os registros pelo nome e aplica a ordenação selecionada.
export function filtrarRegistros(registros, termo, ordem = '') {

    // Remove espaços extras e normaliza o texto pesquisado.
    const consulta = normalizar(termo.trim());

    // Mantém apenas os registros que correspondem à pesquisa.
    const filtrados = registros.filter(item =>
        normalizar(item.name).includes(consulta)
    );

    // Ordena os registros de A–Z ou Z–A, conforme a opção escolhida.
    if (ordem) {
        filtrados.sort((a, b) =>
            comparar(a.name, b.name) * (ordem === 'desc' ? -1 : 1)
        );
    }

    return filtrados;
}
