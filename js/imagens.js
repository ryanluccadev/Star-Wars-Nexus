import { urlRegistro } from './api.js';
import { imagensEspecificas } from '../data/imagens-locais.js';

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

export function imagemDoRegistro(recurso, item) {
    const url = urlRegistro(item.url, recurso);
    const chave = recurso === 'films'
        ? String(item.episode_id ?? item.id?.replace(/^filme:/, ''))
        : url?.split('/').at(-2);

    const imagem = imagensEspecificas[recurso].find(({ id }) => id === chave);
    return imagem ?? placeholders[recurso];
}
