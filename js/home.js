import { contarRecurso } from './api.js';
import { carregarFilmes, nomeCategoriaFilme, rotuloEpisodio } from './filmes.js';
import { imagemDoRegistro, placeholders } from './imagens.js';

const formatarNumero = new Intl.NumberFormat('pt-BR');
const aviso = document.getElementById('home-carregamento-erro');
const botaoTentar = document.getElementById('home-tentar-novamente');
const indicadores = [...document.querySelectorAll('[data-total]')];
const falhas = new Set();
const galeria = document.getElementById('galeria-posters');
const galeriaStatus = document.getElementById('galeria-status');
const controlesGaleria = document.getElementById('galeria-controles');
const galeriaAnterior = document.getElementById('galeria-anterior');
const galeriaProximo = document.getElementById('galeria-proximo');
const linhaDoTempo = document.getElementById('linha-do-tempo');

// Seleção editorial para links diretos aos catálogos.
const destaques = {
    people: { pagina: 'personagens', itens: [['1', 'Luke Skywalker'], ['20', 'Yoda'], ['3', 'R2-D2']] },
    starships: { pagina: 'naves', itens: [['10', 'Millennium Falcon'], ['12', 'X-wing'], ['21', 'Slave 1']] },
    planets: { pagina: 'planetas', itens: [['1', 'Tatooine'], ['4', 'Hoth'], ['7', 'Endor']] }
};

function linkCatalogo(pagina, nome) {
    return 'pages/' + pagina + '.html?' + new URLSearchParams({ busca: nome });
}

function preencherImagem(imagem, recurso, item) {
    const { arquivo } = imagemDoRegistro(recurso, item);
    const pasta = 'assets/imagens/';
    imagem.addEventListener('error', () => {
        imagem.src = pasta + placeholders[recurso].arquivo;
    }, { once: true });
    imagem.src = pasta + arquivo;
}

function renderizarDestaques() {
    const modelo = document.getElementById('modelo-destaque');
    for (const [recurso, { pagina, itens }] of Object.entries(destaques)) {
        const lista = document.querySelector(`[data-destaques="${recurso}"]`);
        lista.replaceChildren(...itens.map(([id, nome]) => {
            const card = modelo.content.cloneNode(true);
            card.querySelector('a').href = linkCatalogo(pagina, nome);
            card.querySelector('span').textContent = nome;
            preencherImagem(card.querySelector('img'), recurso, {
                url: `https://swapi.dev/api/${recurso}/${id}/`
            });
            return card;
        }));
    }
}

function atualizarControlesGaleria() {
    galeriaAnterior.disabled = galeria.scrollLeft <= 1;
    galeriaProximo.disabled = galeria.scrollLeft + galeria.clientWidth >= galeria.scrollWidth - 1;
}

function rolarGaleria(direcao) {
    const comportamento = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    galeria.scrollBy({ left: direcao * galeria.clientWidth * .82, behavior: comportamento });
}

function renderizarCinema(filmes) {
    const modeloPoster = document.getElementById('modelo-poster');
    const modeloLinha = document.getElementById('modelo-linha-do-tempo');
    const posters = document.createDocumentFragment();
    const cronologia = document.createDocumentFragment();

    for (const filme of filmes) {
        const titulo = filme.titulo_pt;
        const href = linkCatalogo('filmes', titulo);
        const etiqueta = rotuloEpisodio(filme.episode_id) || nomeCategoriaFilme(filme.categoria);
        const poster = modeloPoster.content.cloneNode(true);
        const linha = modeloLinha.content.cloneNode(true);

        for (const parte of [poster, linha]) {
            const link = parte.querySelector('a');
            link.href = href;
            link.dataset.grupo = filme.categoria;
            parte.querySelector('.home-film-label').textContent = etiqueta;
            parte.querySelector('strong').textContent = titulo;
        }

        preencherImagem(poster.querySelector('img'), 'films', filme);
        linha.querySelector('.home-film-year').textContent = filme.release_date?.slice(0, 4) ?? '';
        posters.append(poster);
        cronologia.append(linha);
    }

    galeria.replaceChildren(posters);
    linhaDoTempo.replaceChildren(cronologia);
    galeria.hidden = false;
    controlesGaleria.hidden = false;
    galeriaStatus.hidden = true;
    atualizarControlesGaleria();
}

function mostrarEstado(contador, estado) {
    const rotulo = document.createElement('span');
    rotulo.className = 'visually-hidden';
    rotulo.textContent = estado;
    contador.replaceChildren(rotulo, document.createTextNode('—'));
}

async function totalDoRecurso(recurso) {
    if (recurso === 'films') {
        const filmes = await carregarFilmes({ incluirMetadados: false });
        renderizarCinema(filmes);
        return filmes.length;
    }

    return contarRecurso(recurso);
}

async function atualizarIndicadores(contadores) {
    botaoTentar.disabled = true;

    await Promise.all(contadores.map(async contador => {
        mostrarEstado(contador, 'Carregando');
        try {
            const total = await totalDoRecurso(contador.dataset.total);
            contador.textContent = formatarNumero.format(total);
            falhas.delete(contador);
        } catch {
            mostrarEstado(contador, 'Indisponível');
            falhas.add(contador);
            if (contador.dataset.total === 'films') {
                galeriaStatus.textContent = 'A galeria e a linha do tempo estão indisponíveis. Use “Tentar novamente” nos indicadores.';
            }
        }
    }));

    aviso.hidden = falhas.size === 0;
    botaoTentar.disabled = false;
}

botaoTentar.addEventListener('click', () => atualizarIndicadores([...falhas]));
galeriaAnterior.addEventListener('click', () => rolarGaleria(-1));
galeriaProximo.addEventListener('click', () => rolarGaleria(1));
galeria.addEventListener('scroll', atualizarControlesGaleria, { passive: true });
addEventListener('resize', atualizarControlesGaleria, { passive: true });
renderizarDestaques();
atualizarIndicadores(indicadores);
