import { contarRecurso } from './api.js';
import { carregarFilmes } from './filmes.js';

const formatarNumero = new Intl.NumberFormat('pt-BR');
const aviso = document.getElementById('home-carregamento-erro');
const botaoTentar = document.getElementById('home-tentar-novamente');
const indicadores = [...document.querySelectorAll('[data-total]')];
const falhas = new Set();

function mostrarEstado(contador, estado) {
    const rotulo = document.createElement('span');
    rotulo.className = 'visually-hidden';
    rotulo.textContent = estado;
    contador.replaceChildren(rotulo, document.createTextNode('—'));
}

async function totalDoRecurso(recurso) {
    if (recurso === 'films') {
        return (await carregarFilmes({ incluirMetadados: false })).length;
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
        }
    }));

    aviso.hidden = falhas.size === 0;
    botaoTentar.disabled = false;
}

botaoTentar.addEventListener('click', () => atualizarIndicadores([...falhas]));
atualizarIndicadores(indicadores);
