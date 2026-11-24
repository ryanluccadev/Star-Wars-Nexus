/** Movimento decorativo e ferramentas de navegação. O catálogo funciona sem este módulo. */
const movimentoReduzido = matchMedia('(prefers-reduced-motion: reduce)');
const telaCompacta = matchMedia('(max-width: 767px)');
const corpo = document.body;
const cabecalho = document.querySelector('.catalog-header');
const hero = document.querySelector('.home-hero');
const formato = new Intl.NumberFormat('pt-BR');

function elemento(tag, classe) {
    const novo = document.createElement(tag);
    novo.className = classe;
    return novo;
}

function estrelas() {
    const canvas = elemento('canvas', 'nexus-estrelas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return;
    }

    canvas.setAttribute('aria-hidden', 'true');
    corpo.prepend(canvas);
    corpo.classList.add('nexus-espaco');

    let largura = 0;
    let altura = 0;
    let pontos = [];
    let pedido = 0;
    let ultimoQuadro = -Infinity;

    function desenhar(tempo = 0, animado = false) {
        ctx.clearRect(0, 0, largura, altura);
        const rolagem = scrollY;

        for (const estrela of pontos) {
            const deslocamento = animado
                ? (tempo * estrela.profundidade * .009 + rolagem * estrela.profundidade * .08)
                : 0;
            const brilho = animado ? .84 + .16 * Math.sin(tempo * .0014 + estrela.fase) : 1;
            const y = (estrela.y + deslocamento) % altura;

            ctx.fillStyle = estrela.cor;
            ctx.globalAlpha = estrela.branco * brilho;
            ctx.fillRect(estrela.x, y, estrela.raio, estrela.raio);
        }

        ctx.globalAlpha = 1;
        if (animado && !telaCompacta.matches) {
            const fase = (tempo + 4250) % 16500;
            if (fase < 640) {
                const progresso = fase / 640;
                const x = largura * (.8 - progresso * .25);
                const y = altura * (.17 + progresso * .18);
                const rastro = ctx.createLinearGradient(x + 85, y - 44, x, y);
                rastro.addColorStop(0, 'transparent');
                rastro.addColorStop(1, 'rgba(201, 220, 255, .7)');
                ctx.globalAlpha = Math.sin(progresso * Math.PI);
                ctx.strokeStyle = rastro;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + 85, y - 44);
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }

    function quadro(tempo) {
        pedido = 0;
        if (document.hidden || movimentoReduzido.matches) {
            return;
        }

        const intervalo = telaCompacta.matches ? 50 : 32;
        if (tempo - ultimoQuadro >= intervalo) {
            desenhar(tempo, true);
            ultimoQuadro = tempo;
        }
        pedido = requestAnimationFrame(quadro);
    }

    function sincronizar() {
        if (pedido) {
            cancelAnimationFrame(pedido);
            pedido = 0;
        }
        if (document.hidden) return;
        desenhar();
        if (!movimentoReduzido.matches) {
            pedido = requestAnimationFrame(quadro);
        }
    }

    function redimensionar() {
        largura = canvas.clientWidth || 1;
        altura = canvas.clientHeight || 1;
        const escala = Math.min(devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(largura * escala);
        canvas.height = Math.round(altura * escala);
        ctx.setTransform(escala, 0, 0, escala, 0, 0);
        pontos = Array.from({ length: telaCompacta.matches ? 42 : 96 }, () => ({
            x: Math.random() * largura,
            y: Math.random() * altura,
            raio: .65 + Math.random() ** 2 * 1.4,
            fase: Math.random() * Math.PI * 2,
            branco: .2 + Math.random() * .56,
            profundidade: .25 + Math.random() * .8,
            cor: Math.random() > .2 ? '#cfddfc' : '#f1d19a'
        }));
        sincronizar();
    }

    addEventListener('resize', redimensionar, { passive: true });
    document.addEventListener('visibilitychange', sincronizar);
    movimentoReduzido.addEventListener('change', sincronizar);
    redimensionar();
}

function navegacaoDeRolagem() {
    const barra = elemento('div', 'nexus-progresso');
    const voltar = elemento('button', 'nexus-voltar-topo outline-button');
    let pedido = 0;
    let ultimoProgresso = -1;
    let ultimoDeslocamento;

    barra.setAttribute('aria-hidden', 'true');
    voltar.type = 'button';
    voltar.hidden = true;
    voltar.setAttribute('aria-label', 'Voltar ao topo');
    voltar.textContent = '↑';
    corpo.append(barra, voltar);

    voltar.addEventListener('click', () => {
        cabecalho?.querySelector('.catalog-brand')?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: movimentoReduzido.matches ? 'auto' : 'smooth' });
    });

    function pintar() {
        pedido = 0;
        const y = Math.max(0, scrollY);
        const percurso = document.documentElement.scrollHeight - innerHeight;
        const progresso = percurso > 0 ? Math.min(y / percurso, 1) : 0;
        const deslocamento = movimentoReduzido.matches || telaCompacta.matches
            ? 0
            : Math.min(y * .06, 24);

        if (progresso !== ultimoProgresso) {
            barra.style.setProperty('--nexus-progresso', progresso);
            ultimoProgresso = progresso;
        }
        if (hero && deslocamento !== ultimoDeslocamento) {
            hero.style.setProperty('--hero-shift', deslocamento + 'px');
            ultimoDeslocamento = deslocamento;
        }

        const visivel = y > 420 || document.activeElement === voltar;
        if (voltar.hidden === visivel) {
            voltar.hidden = !visivel;
        }
    }

    function solicitar() {
        if (!pedido) {
            pedido = requestAnimationFrame(pintar);
        }
    }

    addEventListener('scroll', solicitar, { passive: true });
    addEventListener('resize', solicitar, { passive: true });
    voltar.addEventListener('blur', solicitar);
    movimentoReduzido.addEventListener('change', solicitar);
    if ('ResizeObserver' in window) {
        new ResizeObserver(solicitar).observe(corpo);
    }
    pintar();
}

function entradaDaHome() {
    if (!hero || movimentoReduzido.matches) {
        return;
    }

    const chave = 'nexus:entrada-vista';
    try {
        if (sessionStorage.getItem(chave)) {
            return;
        }
        sessionStorage.setItem(chave, '1');
    } catch {
        // Em navegação com armazenamento indisponível, mantenha a entrada desativada.
        return;
    }

    const feixes = elemento('div', 'nexus-entrada-feixes');
    feixes.setAttribute('aria-hidden', 'true');
    hero.prepend(feixes);
    corpo.classList.add('nexus-primeira-visita');
    setTimeout(() => {
        feixes.remove();
        corpo.classList.remove('nexus-primeira-visita');
    }, 1250);
}

function animarNumero(alvo, valor) {
    if (document.hidden || movimentoReduzido.matches || valor < 2) {
        return;
    }

    const inicio = performance.now();
    function quadro(tempo) {
        const progresso = Math.min((tempo - inicio) / 540, 1);
        const encerrar = movimentoReduzido.matches || document.hidden
            || progresso >= 1 || !alvo.isConnected;
        const quantidade = encerrar ? valor : Math.round(valor * (1 - (1 - progresso) ** 3));
        const texto = formato.format(quantidade);

        if (alvo.textContent !== texto) {
            alvo.textContent = texto;
        }
        if (!encerrar) {
            requestAnimationFrame(quadro);
        }
    }

    requestAnimationFrame(quadro);
}

function ativarRevelacoes() {
    if (!('IntersectionObserver' in window) || movimentoReduzido.matches) {
        return;
    }

    const aguardarNumero = new Map();
    const observador = new IntersectionObserver((entradas, intersecao) => {
        for (const entrada of entradas) {
            if (!entrada.isIntersecting) {
                continue;
            }

            const alvo = entrada.target;
            intersecao.unobserve(alvo);
            if (alvo.hasAttribute('data-reveal')) {
                alvo.classList.add('nexus-revelado');
            }
            if (!alvo.hasAttribute('data-contador')) {
                continue;
            }

            const iniciar = () => {
                const texto = alvo.textContent.trim();
                if (!/^\d+(?:\.\d{3})*$/.test(texto)) {
                    return;
                }
                aguardarNumero.get(alvo)?.disconnect();
                aguardarNumero.delete(alvo);
                animarNumero(alvo, Number(texto.replaceAll('.', '')));
            };
            if ('MutationObserver' in window) {
                const mudancas = new MutationObserver(iniciar);
                mudancas.observe(alvo, { childList: true, characterData: true, subtree: true });
                aguardarNumero.set(alvo, mudancas);
            }
            iniciar();
        }
    }, { threshold: .1 });

    for (const alvo of document.querySelectorAll('[data-reveal], [data-contador]')) {
        observador.observe(alvo);
    }
}

estrelas();
navegacaoDeRolagem();
entradaDaHome();
ativarRevelacoes();
