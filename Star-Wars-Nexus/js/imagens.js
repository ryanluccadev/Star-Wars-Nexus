import { urlRegistro } from './api.js';
import { imagensEspecificas } from '../data/imagens-locais.js';

// O identificador é o mesmo do mapa de imagens. As opções são específicas da apresentação.
const enquadramentos = {
    people: {
        1: { card: { y: '17%' }, destaque: { y: '22%' } },
        3: { destaque: { y: '22%' } },
        6: { card: { y: '12%' } },
        9: { card: { y: '15%' } },
        20: { card: { y: '28%' }, destaque: { y: '28%' } }
    },
    planets: {
        1: { destaque: { x: '46%' } },
        4: { destaque: { y: '39%' } },
        5: { card: { y: '65%' }, modal: { y: '65%' } },
        7: { destaque: { y: '36%' } },
        41: { card: { y: '38%' }, modal: { y: '38%' } },
        42: { card: { y: '30%' }, modal: { y: '30%' } },
        47: { card: { y: '20%' }, modal: { y: '20%' } },
        48: { card: { y: '22%' }, modal: { y: '22%' } },
        51: { card: { y: '35%' }, modal: { y: '35%' } },
        54: { card: { y: '21%' }, modal: { y: '21%' } }
    }
};

export const placeholders = {
    people: {
        arquivo: 'placeholders/personagem.webp',
        descricao: 'Imagem do personagem indisponível'
    },
    planets: {
        arquivo: 'placeholders/planeta.webp',
        descricao: 'Imagem do planeta indisponível'
    },
    starships: {
        arquivo: 'placeholders/nave.webp',
        descricao: 'Imagem da nave indisponível'
    },
    films: {
        arquivo: 'placeholders/filme.webp',
        descricao: 'Pôster oficial indisponível'
    }
};

export { imagensEspecificas };

function chaveDaImagem(recurso, item) {
    return recurso === 'films'
        ? String(item.episode_id ?? item.id?.replace(/^filme:/, ''))
        : urlRegistro(item.url, recurso)?.split('/').at(-2);
}

export function imagemDoRegistro(recurso, item) {
    const chave = chaveDaImagem(recurso, item);
    const imagem = imagensEspecificas[recurso].find(({ id }) => id === chave);
    return imagem ?? placeholders[recurso];
}

export function aplicarEnquadramento(imagem, recurso, item, contexto) {
    const ajuste = enquadramentos[recurso]?.[chaveDaImagem(recurso, item)]?.[contexto];
    if (!ajuste) return;

    const propriedades = [
        ['--imagem-x', ajuste.x],
        ['--imagem-y', ajuste.y],
        ['--imagem-fit', ajuste.preenchimento],
        ['--imagem-escala', ajuste.escala]
    ];
    for (const [propriedade, valor] of propriedades) {
        if (valor !== undefined) imagem.style.setProperty(propriedade, String(valor));
    }
}
