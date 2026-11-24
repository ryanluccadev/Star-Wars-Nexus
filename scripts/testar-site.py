"""QA do Star Wars Nexus. Requer Python, Playwright e Chromium."""

import argparse
from collections import Counter
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import re
from pathlib import Path
import sys
from threading import Thread
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
API = 'https://swapi.dev/api/'
PAGINAS = {'people': 'personagens', 'planets': 'planetas', 'starships': 'naves', 'films': 'filmes'}
EXEMPLOS = {
    'people': ('Luke Skywalker', '  lúKÉ  SKYwalkér  '),
    'planets': ('Tatooine', ' TÁTÓoINE '),
    'starships': ('Millennium Falcon', ' mILLÉNnIUM  FÁLCON '),
    'films': ('Uma Nova Esperança', ' ÚmA  nòva  esperanca '),
}
LARGURAS = (320, 375, 390, 768, 1024, 1440, 1920)
CRONOLOGIA = [
    'A Ameaça Fantasma', 'Ataque dos Clones', 'A Vingança dos Sith',
    'Han Solo: Uma História Star Wars', 'Rogue One: Uma História Star Wars',
    'Uma Nova Esperança', 'O Império Contra-Ataca', 'O Retorno de Jedi',
    'O Despertar da Força', 'Os Últimos Jedi', 'A Ascensão Skywalker',
]
LANCAMENTO = [CRONOLOGIA[i] for i in (5, 6, 7, 0, 1, 2, 8, 4, 9, 3, 10)]
DURACOES = (136, 143, 140, 135, 133, 125, 127, 135, 138, 152, 142)
LINKS = ['/', *(f'/pages/{nome}.html' for nome in PAGINAS.values())]
CARD = '.catalog-card'
TITULO_CARD = CARD + ' h2'
URL_API = API + '**'
TITULO_HOME = 'Uma galáxia muito, muito distante.'
APRESENTACAO = (
    'O Star Wars Nexus é um portal interativo dedicado ao universo Star Wars. '
    'Explore personagens icônicos, descubra diferentes planetas, conheça naves lendárias '
    'e reviva os acontecimentos dos filmes que marcaram gerações.'
)
SECOES_REMOVIDAS = '#destaques, #saga, #sobre-titulo, .home-spotlight, .home-saga, .home-editorial'


class ServidorSilencioso(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class Testes:
    def __init__(self, filtro):
        self.resultados = []
        self.filtro = filtro

    def executar(self, nome, funcao):
        if self.filtro and not re.search(self.filtro, nome, re.IGNORECASE):
            return
        try:
            funcao()
        except Exception as erro:
            resultado = {'teste': nome, 'status': 'falhou', 'motivo': str(erro)}
        else:
            resultado = {'teste': nome, 'status': 'passou'}
        self.resultados.append(resultado)
        print(f"{resultado['status'].upper()} {nome}", flush=True)
        if 'motivo' in resultado:
            print(resultado['motivo'], flush=True)


def rota_pagina(recurso):
    return '/pages/' + PAGINAS[recurso] + '.html'


def aguardar(pagina):
    expect(pagina.locator('#atualizar')).to_be_visible(timeout=15000)
    expect(pagina.locator('#lista')).to_have_attribute('aria-busy', 'false')


def capturar_swapi(pagina, base):
    pagina.goto(base + '/CREDITOS-IMAGENS.md')
    capturas = pagina.evaluate("""async recursos => {
        const origem = 'https://swapi.dev/api/';
        const porRecurso = await Promise.all(recursos.map(async recurso => {
            const capturas = {};
            let url = origem + recurso + '/';
            const registrados = new Set();
            let contagem;
            while (url) {
                if (registrados.has(url) || !url.startsWith(origem)) {
                    throw new Error('Paginação inválida: ' + url);
                }
                registrados.add(url);
                const resposta = await fetch(url, { signal: AbortSignal.timeout(18000) });
                if (!resposta.ok) throw new Error('SWAPI ' + resposta.status + ' em ' + url);
                const corpo = await resposta.json();
                if (!Array.isArray(corpo.results)) throw new Error('Resposta inválida em ' + url);
                contagem ??= corpo.count;
                if (corpo.count !== contagem) throw new Error('Contagem instável em ' + url);
                capturas[url] = corpo;
                url = corpo.next ? new URL(corpo.next, url).href.replace(/^http:/, 'https:') : null;
            }
            const ids = Object.values(capturas).flatMap(p => p.results.map(item => item.url));
            if (new Set(ids).size !== contagem || ids.length !== contagem) {
                throw new Error('Registros incompletos ou duplicados: ' + recurso);
            }
            return capturas;
        }));
        return Object.assign({}, ...porRecurso);
    }""", list(PAGINAS))
    return capturas


def renderizar_api(rota, capturas, status=None):
    dado = capturas.get(rota.request.url.replace('http:', 'https:', 1))
    if status is not None:
        rota.fulfill(status=status, json={'detail': 'Falha simulada pela auditoria'},
                     headers={'Access-Control-Allow-Origin': '*'})
    elif dado is None:
        rota.fulfill(status=404, json={'detail': 'URL ausente na captura real'})
    else:
        rota.fulfill(status=200, json=dado, headers={'Access-Control-Allow-Origin': '*'})


def carregar_titulos(pagina):
    titulos = []
    proximo = pagina.get_by_role('button', name='Próxima página', exact=True)
    while True:
        itens = pagina.locator(TITULO_CARD).all_text_contents()
        assert itens, 'Catálogo sem cards'
        titulos.extend(itens)
        if not proximo.count() or proximo.is_disabled():
            return titulos
        proximo.click()


def verificar_catalogo(pagina, base, recurso, esperado, capturas, registrar):
    registrar.clear()
    pagina.goto(base + rota_pagina(recurso))
    aguardar(pagina)
    titulos = carregar_titulos(pagina)
    assert len(titulos) == len(esperado), (len(titulos), len(esperado))
    if recurso == 'films':
        assert titulos == CRONOLOGIA, titulos
    else:
        assert Counter(titulos) == Counter(esperado)
    caminhos = {url for url in capturas if urlparse(url).path == '/api/' + recurso + '/'}
    assert Counter(registrar) == Counter(caminhos), registrar
    print(f'  {len(titulos)} cards, {len(caminhos)} resposta(s) paginada(s) da SWAPI, catálogo {recurso}', flush=True)


def checar_semantica(pagina, caminho):
    assert pagina.locator('html').get_attribute('lang').lower().startswith('pt')
    for elemento in ['header.catalog-header', 'main', 'footer', 'h1', 'nav#menu-principal a[aria-current=page]']:
        expect(pagina.locator(elemento)).to_have_count(1)
    assert pagina.evaluate("""() => {
        const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
        return new Set(ids).size === ids.length;
    }"""), 'ID HTML duplicado'
    assert pagina.evaluate(r"""() => [...document.querySelectorAll(
        'main input:not([type="hidden"]), main select'
    )].every(campo => campo.labels?.length > 0 || Boolean(
        campo.getAttribute('aria-label')?.trim() ||
        campo.getAttribute('aria-labelledby')?.split(/\\s+/).some(id => document.getElementById(id))
    ))"""), 'Campo de pesquisa ou filtro sem rótulo'
    links = pagina.locator('header.catalog-header nav a[href]').evaluate_all(
        '(links) => links.map(el => new URL(el.href).pathname)'
    )
    assert set(links) == {'/index.html', *LINKS[1:]}, links
    ativo = pagina.locator('nav#menu-principal a[aria-current=page]').get_attribute('href')
    assert ativo.endswith(caminho.rsplit('/', 1)[-1] or 'index.html'), ativo


def largura_pagina(pagina):
    assert pagina.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (
        pagina.url, pagina.evaluate("({janela: innerWidth, documento: document.documentElement.scrollWidth})")
    )


def checar_imagens(pagina, seletor='img'):
    falhas = pagina.locator(seletor).evaluate_all("""async imagens => {
        for (const img of imagens) { img.loading = 'eager'; }
        const dados = await Promise.all(imagens.map(async img => {
            try { await img.decode(); } catch {}
            return [img.currentSrc, img.naturalWidth, img.hasAttribute('alt')];
        }));
        return dados.filter(([url, largura, temAlt]) => !url || !largura || !temAlt);
    }""")
    assert not falhas, falhas


def verificar_tela(pagina, base, caminho, largura, diretorio):
    altura = 900 if largura >= 1024 else 812
    pagina.set_viewport_size({'width': largura, 'height': altura})
    pagina.goto(base + caminho)
    checar_semantica(pagina, caminho)
    logo_rodape = pagina.locator('.footer-brand img')
    expect(logo_rodape).to_be_visible()
    assert logo_rodape.evaluate(
        "logo => logo.src === document.querySelector('.catalog-brand img').src"
    ), 'O rodapé deve usar o logo do cabeçalho'
    if caminho == '/':
        expect(pagina.locator('#explorar')).to_be_visible()
        expect(pagina.locator('#indicadores')).to_be_visible()
        expect(pagina.locator(SECOES_REMOVIDAS)).to_have_count(0)
        expect(pagina.locator('[data-contador]')).to_have_count(4, timeout=15000)
        expect(pagina.locator('.home-hero-media')).to_have_css('background-image', re.compile('hero-nexus.webp'))
    else:
        aguardar(pagina)
        expect(pagina.locator(TITULO_CARD).first).to_be_visible()
        expect(pagina.locator('.catalog-controls input')).to_have_count(1)
        assert pagina.locator(CARD).evaluate_all("""cards => cards.every(card =>
            card.querySelectorAll('button').length === 1 &&
            card.querySelector('button').textContent.includes('Ver detalhes')
        )"""), 'Cada card deve oferecer uma única ação de detalhes'
    largura_pagina(pagina)
    checar_imagens(pagina)

    menu = pagina.locator('nav#menu-principal')
    if pagina.locator('.catalog-toggle').is_visible():
        botao = pagina.locator('.catalog-toggle')
        expect(menu).to_be_hidden()
        botao.focus()
        pagina.keyboard.press('Enter')
        expect(menu).to_have_class(re.compile(r'\bshow\b'))
        expect(botao).to_have_attribute('aria-expanded', 'true')
        largura_pagina(pagina)
        pagina.keyboard.press('Enter')
        expect(menu).to_be_hidden()
    else:
        expect(menu).to_be_visible()

    pagina.evaluate("window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'})")
    cabecalho = pagina.locator('.catalog-header')
    assert cabecalho.evaluate("el => el.getBoundingClientRect().bottom <= 0"), (
        pagina.url, largura, 'o cabeçalho deve sair da tela ao rolar'
    )

    if diretorio and largura in (375, 1440):
        pagina.locator('footer').scroll_into_view_if_needed()
        pagina.evaluate("""async () => {
            document.activeElement?.blur();
            window.scrollTo({top: 0, behavior: 'instant'});
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }""")
        nome = caminho.rsplit('/', 1)[-1].removesuffix('.html') or 'home'
        pagina.screenshot(path=str(diretorio / f'{nome}-{largura}.png'), full_page=True, animations='disabled')

    if caminho != '/':
        botao_detalhes = pagina.get_by_role('button', name='Ver detalhes de', exact=False).first
        botao_detalhes.click()
        dialogo = pagina.get_by_role('dialog')
        expect(dialogo).to_be_visible()
        assert pagina.locator('#detalhes-corpo').evaluate('(el) => el.scrollWidth <= el.clientWidth + 1'), (
            pagina.url, largura, 'rolagem horizontal no modal'
        )
        checar_imagens(pagina, '.detail-image')
        fechar = dialogo.locator('.modal-header').get_by_role('button', name='Fechar', exact=True)
        expect(fechar.locator('span')).to_have_text('×')
        expect(fechar.locator('span')).to_be_visible()
        expect(fechar).to_have_css('filter', 'none')
        if largura == 375:
            fechar.focus()
            fechar.press('Space')
        elif largura == 1440:
            fechar.click()
        else:
            pagina.keyboard.press('Escape')
        expect(dialogo).to_be_hidden()
        expect(botao_detalhes).to_be_focused()


def verificar_busca(pagina, base, recurso):
    nome, variante = EXEMPLOS[recurso]
    pagina.goto(base + rota_pagina(recurso))
    aguardar(pagina)
    busca = pagina.locator('#busca')
    busca.fill(variante)
    expect(pagina.locator(TITULO_CARD)).to_have_text([nome])
    expect(pagina.locator('#status')).to_contain_text('1')
    busca.fill('nenhuma-correspondencia-nexus-4c9e')
    expect(pagina.locator(TITULO_CARD)).to_have_count(0)
    expect(pagina.locator('#feedback')).to_be_visible()
    limpar = pagina.locator('#limpar-busca')
    expect(limpar).to_be_visible()
    limpar.click()
    expect(busca).to_have_value('')
    expect(busca).to_be_focused()
    expect(pagina.locator(TITULO_CARD).first).to_be_visible()


def verificar_filmes(pagina, base, quantidade_bruta):
    assert quantidade_bruta == 6, quantidade_bruta
    pagina.goto(base + rota_pagina('films'))
    aguardar(pagina)
    assert carregar_titulos(pagina) == CRONOLOGIA
    ordem = pagina.locator('#ordem')
    ordem.select_option('lancamento')
    assert carregar_titulos(pagina) == LANCAMENTO
    ordem.select_option('asc')
    esperado = pagina.evaluate("""titulos => [...titulos].sort(new Intl.Collator(
      'pt-BR', { sensitivity: 'base', numeric: true }
    ).compare)""", CRONOLOGIA)
    assert carregar_titulos(pagina) == esperado
    categoria = pagina.locator('#categoria-filme')
    busca = pagina.locator('#busca')
    ordem.select_option('historia')
    for valor, indices in (
        ('prequel', (0, 1, 2)), ('original', (5, 6, 7)),
        ('sequel', (8, 9, 10)), ('historias', (3, 4)),
    ):
        categoria.select_option(valor)
        expect(pagina.locator(TITULO_CARD)).to_have_text([CRONOLOGIA[i] for i in indices])
    ordem.select_option('lancamento')
    expect(pagina.locator(TITULO_CARD)).to_have_text([CRONOLOGIA[4], CRONOLOGIA[3]])
    busca.fill(' A STAR Wars Story ')
    expect(pagina.locator(TITULO_CARD)).to_have_text([CRONOLOGIA[4], CRONOLOGIA[3]])
    busca.fill('rOgUe')
    expect(pagina.locator(TITULO_CARD)).to_have_text([CRONOLOGIA[4]])
    registro = pagina.locator(CARD).first
    expect(registro).to_contain_text('Rogue One: A Star Wars Story')
    registro.get_by_role('button', name='Ver detalhes de', exact=False).click()
    dialogo = pagina.get_by_role('dialog')
    expect(dialogo).to_contain_text('Gareth Edwards')
    expect(dialogo).to_contain_text('16/12/2016')
    link = dialogo.locator('a[href="https://www.starwars.com/films/rogue-one"]')
    expect(link).to_be_visible()
    assert dialogo.locator('a[href^="https://swapi.dev/api/films/"]').count() == 0
    pagina.keyboard.press('Escape')
    expect(dialogo).to_be_hidden()
    categoria.select_option('original')
    busca.fill(' A NEW HOPE ')
    expect(pagina.locator(TITULO_CARD)).to_have_text([CRONOLOGIA[5]])
    expect(registro.locator('.card-episode')).to_contain_text('IV')
    expect(registro).to_contain_text('1977')
    registro.get_by_role('button', name='Ver detalhes de', exact=False).click()
    expect(dialogo).to_contain_text('George Lucas')
    expect(dialogo.locator('a[href^="https://swapi.dev/api/films/"]')).to_be_visible()
    pagina.keyboard.press('Escape')


def verificar_crawl(pagina, base):
    pagina.emulate_media(reduced_motion='no-preference')
    try:
        pagina.goto(base + '/pages/filmes.html')
        aguardar(pagina)
        pagina.locator('#busca').fill('A New Hope')
        pagina.locator(CARD).get_by_role('button', name='Ver detalhes de', exact=False).click()
        crawl = pagina.locator('.detail-crawl')
        expect(crawl).to_contain_text('civil war')
        crawl.get_by_role('button', name='Iniciar', exact=True).click()
        crawl.get_by_role('button', name='Pausar', exact=True).click()
        expect(crawl.get_by_role('button', name='Retomar', exact=True)).to_be_visible()
        crawl.get_by_role('button', name='Reiniciar', exact=True).click()
        crawl.get_by_role('button', name='Leitura estática', exact=True).click()
        expect(crawl).to_contain_text('civil war')
        pagina.emulate_media(reduced_motion='reduce')
        expect(crawl.get_by_role('button', name='Iniciar', exact=True)).to_be_disabled()
        expect(crawl.locator('.crawl-reading')).to_be_visible()
        pagina.keyboard.press('Escape')
        expect(pagina.get_by_role('dialog')).to_be_hidden()
    finally:
        pagina.emulate_media(reduced_motion='reduce')


def verificar_metadados_filmes(pagina, base):
    pagina.goto(base + '/pages/filmes.html')
    aguardar(pagina)
    dialogo = pagina.get_by_role('dialog')
    anterior = None
    busca = pagina.locator('#busca')

    for indice, nome in enumerate(CRONOLOGIA):
        busca.fill(nome)
        abrir = pagina.get_by_role('button', name='Ver detalhes de ' + nome, exact=True)
        abrir.click()
        expect(dialogo.get_by_role('heading', name=nome, exact=True)).to_be_visible()
        if anterior:
            expect(dialogo.get_by_role('heading', name=anterior, exact=True)).to_have_count(0)
        anterior = nome
        duracao = dialogo.locator('dt:text-is("Duração") + dd')
        expect(duracao).to_have_text(f'{DURACOES[indice]} min')
        sinopse = dialogo.locator('.detail-synopsis')
        expect(sinopse.get_by_role('heading', name='Sinopse', exact=True)).to_be_visible()
        descricao = sinopse.locator('p:first-of-type')
        expect(descricao).to_have_text(re.compile(r'\S'))
        expect(descricao).not_to_have_text('Não informado')
        crawl = dialogo.locator('.detail-crawl')
        controles = crawl.get_by_role('button', name='Iniciar', exact=True)
        if indice in (0, 1, 2, 5, 6, 7):
            expect(dialogo).to_contain_text('SWAPI')
            expect(controles).to_be_disabled()
            expect(crawl.locator('.crawl-reading')).to_be_visible()
        else:
            expect(dialogo).to_contain_text('Catálogo complementar local')
            expect(crawl).to_contain_text('Não informado')
            expect(controles).to_have_count(0)

        dialogo.locator('.modal-header').get_by_role('button', name='Fechar', exact=True).click()
        expect(dialogo).to_be_hidden()
        expect(abrir).to_be_focused()

    print(f'  Metadados visíveis: {len(CRONOLOGIA)} durações e {len(CRONOLOGIA)} sinopses', flush=True)


def verificar_cache(pagina, base, capturas, registrar):
    pagina.goto(base + '/pages/personagens.html')
    aguardar(pagina)
    registrar.clear()
    pagina.reload()
    aguardar(pagina)
    assert not registrar, registrar
    chave = 'swe:cache:v1:people'
    assert pagina.evaluate('(chave) => Array.isArray(JSON.parse(localStorage.getItem(chave)).dados)', chave)
    pagina.locator('#atualizar').click()
    aguardar(pagina)
    esperado = [url for url in capturas if urlparse(url).path == '/api/people/']
    assert Counter(registrar) == Counter(esperado), registrar
    registrar.clear()
    pagina.evaluate("(chave) => localStorage.setItem(chave, '{json inválido')", chave)
    pagina.reload()
    aguardar(pagina)
    assert Counter(registrar) == Counter(esperado), registrar


def verificar_armazenamento_bloqueado(browser, base, capturas):
    with browser.new_context(reduced_motion='reduce') as contexto:
        pagina = contexto.new_page()
        erros = []
        pagina.on('pageerror', lambda erro: erros.append(str(erro)))
        pagina.route(URL_API, lambda pedido: renderizar_api(pedido, capturas))
        pagina.add_init_script("""(() => {
            Storage.prototype.getItem = function () {
                throw new DOMException('Leitura bloqueada para teste', 'SecurityError');
            };
            Storage.prototype.setItem = function () {
                throw new DOMException('Gravação bloqueada para teste', 'QuotaExceededError');
            };
        })()""")
        pagina.goto(base + '/pages/naves.html?busca=Millennium%20Falcon')
        assert pagina.evaluate("""() => {
            try { localStorage.setItem('nexus-qa', 'ok'); }
            catch (erro) { return erro.name === 'QuotaExceededError'; }
            return false;
        }"""), 'A simulação de armazenamento bloqueado não foi aplicada'
        aguardar(pagina)
        expect(pagina.locator(TITULO_CARD)).to_have_text(['Millennium Falcon'])
        pagina.locator('#atualizar').click()
        aguardar(pagina)
        expect(pagina.locator(TITULO_CARD)).to_have_text(['Millennium Falcon'])
        assert not erros, erros


def verificar_dados_externos(browser, base, capturas):
    captura = dict(capturas)
    url = API + 'people/'
    primeira = dict(captura[url])
    entrada = primeira['results']
    assert entrada, 'A captura real não retornou personagens'
    primeiro, *outros = entrada
    texto = '<strong data-sentinela-nexus>Nome de teste</strong>'
    primeira['results'] = [
        dict(primeiro, name=texto, birth_year=None, height=None, hair_color=None), *outros,
    ]
    captura[url] = primeira

    with browser.new_context(reduced_motion='reduce') as contexto:
        pagina = contexto.new_page()
        erros = []
        pagina.on('pageerror', lambda erro: erros.append(str(erro)))
        pagina.route(URL_API, lambda pedido: renderizar_api(pedido, captura))
        pagina.goto(base + '/pages/personagens.html')
        aguardar(pagina)
        pagina.locator('#busca').fill('Nome de teste')
        expect(pagina.locator(TITULO_CARD)).to_have_text([texto])
        expect(pagina.locator(CARD)).to_contain_text('Não informado')
        expect(pagina.locator('[data-sentinela-nexus]')).to_have_count(0)
        pagina.get_by_role('button', name='Ver detalhes de', exact=False).click()
        dialogo = pagina.get_by_role('dialog')
        expect(dialogo.get_by_role('heading', level=2)).to_have_text(texto)
        expect(dialogo).to_contain_text('Não informado')
        expect(dialogo).not_to_contain_text(re.compile(r'\b(undefined|null|NaN)\b'))
        expect(pagina.locator('[data-sentinela-nexus]')).to_have_count(0)
        assert not erros, erros


def verificar_respostas_invalidas(browser, base, capturas):
    url = API + 'people/'
    primeira = capturas[url]
    casos = (
        (dict(primeira, results='resposta de teste inválida'), 'resultados inválidos'),
        (dict(primeira, next=url), 'paginação cíclica'),
    )
    for dado, nome in casos:
        with browser.new_context(reduced_motion='reduce') as contexto:
            pagina = contexto.new_page()
            requests = []

            def rota(pedido):
                requests.append(pedido.request.url)
                renderizar_api(pedido, {url: dado})

            pagina.route(URL_API, rota)
            pagina.goto(base + '/pages/personagens.html')
            expect(pagina.locator('#feedback')).to_be_visible(timeout=10000)
            expect(pagina.locator('#acao')).to_contain_text('Tentar')
            expect(pagina.locator(TITULO_CARD)).to_have_count(0)
            assert requests == [url], (nome, requests)
            print(f'  Tratou {nome} após uma única requisição', flush=True)


def verificar_falhas(browser, base, capturas):
    contexto = browser.new_context(reduced_motion='reduce')
    modo = '503'
    pagina = contexto.new_page()
    try:
        def rota(pedido):
            if modo == 'offline':
                pedido.abort('internetdisconnected')
            else:
                renderizar_api(pedido, capturas, 503 if modo == '503' else None)

        pagina.route(URL_API, rota)
        pagina.goto(base + '/pages/personagens.html')
        expect(pagina.locator('#feedback')).to_be_visible(timeout=15000)
        expect(pagina.locator('#acao')).to_contain_text('Tentar')
        modo = 'conectado'
        pagina.locator('#acao').click()
        aguardar(pagina)
        expect(pagina.locator(TITULO_CARD).first).to_be_visible()
        chave = 'swe:cache:v1:people'
        pagina.evaluate("""(chave) => {
            const cache = JSON.parse(localStorage.getItem(chave));
            cache.data = Date.now() - 2 * 24 * 60 * 60 * 1000;
            localStorage.setItem(chave, JSON.stringify(cache));
        }""", chave)
        modo = 'offline'
        pagina.reload()
        expect(pagina.locator(TITULO_CARD).first).to_be_visible(timeout=15000)
        expect(pagina.locator('#nota-cache')).to_be_visible()
    finally:
        contexto.close()


def verificar_carregamento(browser, base, capturas):
    contexto = browser.new_context(reduced_motion='reduce')
    pagina = contexto.new_page()
    liberado = False
    pendentes = []

    def rota(pedido):
        if liberado:
            renderizar_api(pedido, capturas)
        else:
            pendentes.append(pedido)

    try:
        pagina.route(URL_API, rota)
        pagina.goto(base + '/pages/personagens.html', wait_until='domcontentloaded')
        expect(pagina.locator('#lista')).to_have_attribute('aria-busy', 'true')
        expect(pagina.locator('.catalog-skeleton[aria-hidden=true]')).to_have_count(6)
        liberado = True
        for pedido in pendentes:
            renderizar_api(pedido, capturas)
        aguardar(pagina)
        expect(pagina.locator('.catalog-skeleton')).to_have_count(0)
        expect(pagina.locator(TITULO_CARD).first).to_be_visible()
    finally:
        contexto.close()


def verificar_fallback(pagina, base):
    pagina.goto(base + '/pages/personagens.html?busca=Luke%20Skywalker')
    aguardar(pagina)
    imagem = pagina.locator(CARD + ' .card-image')
    expect(imagem).to_have_count(1)
    antes = imagem.get_attribute('src')
    assert '/placeholders/' not in antes, antes
    bloquear = '**/' + urlparse(antes).path.lstrip('/')
    pagina.route(bloquear, lambda pedido: pedido.abort())
    try:
        pagina.reload()
        aguardar(pagina)
        expect(imagem).to_have_attribute('src', re.compile(r'/placeholders/'), timeout=10000)
        checar_imagens(pagina, CARD + ' .card-image')
        pagina.get_by_role('button', name='Ver detalhes de Luke Skywalker').click()
        modal = pagina.locator('.detail-image')
        expect(modal).to_have_attribute('src', re.compile(r'/placeholders/'), timeout=10000)
        assert modal.get_attribute('src') == imagem.get_attribute('src')
        pagina.keyboard.press('Escape')
    finally:
        pagina.unroute(bloquear)


def verificar_home(pagina, base, capturas):
    pagina.goto(base)
    expect(pagina.get_by_role('heading', level=1)).to_have_text(TITULO_HOME)
    expect(pagina.locator('.home-hero')).to_contain_text(APRESENTACAO)
    expect(pagina.locator(SECOES_REMOVIDAS)).to_have_count(0)
    for texto in ('Personagens em destaque', 'A saga Skywalker', 'As conexões da galáxia',
                  'Tikal, Guatemala', 'Descobrir Yavin IV'):
        expect(pagina.locator('main')).not_to_contain_text(texto)
    expect(pagina.locator('main img[src*="3-yavin-iv"], main a[href*="Yavin"]')).to_have_count(0)
    assert pagina.locator('main').evaluate("""main => {
        const hero = main.querySelector('.home-hero');
        const numeros = main.querySelector('#indicadores');
        const explorar = main.querySelector('#explorar');
        return Boolean(hero && numeros && explorar &&
            (hero.compareDocumentPosition(numeros) & Node.DOCUMENT_POSITION_FOLLOWING) &&
            (numeros.compareDocumentPosition(explorar) & Node.DOCUMENT_POSITION_FOLLOWING));
    }"""), 'Hero, indicadores e exploração fora de ordem'
    hero = pagina.locator('.home-hero')
    explorar = hero.get_by_role('link', name='Explorar a galáxia', exact=True)
    filmes = hero.get_by_role('link', name='Conhecer os filmes', exact=True)
    expect(explorar).to_have_attribute('href', '#explorar')
    expect(filmes).to_have_attribute('href', 'pages/filmes.html')
    for href in LINKS[1:]:
        expect(pagina.locator(f'#explorar a[href$="{href.lstrip("/")}"]')).to_be_visible()
    expect(pagina.locator('#explorar a[href]')).to_have_count(4)
    numeros = [capturas[API + recurso + '/']['count'] for recurso in list(PAGINAS)[:-1]] + [11]
    expect(pagina.locator('[data-contador]')).to_have_text(list(map(str, numeros)), timeout=15000)
    explorar.click()
    expect(pagina).to_have_url(base + '/#explorar')
    filmes.click()
    expect(pagina).to_have_url(base + '/pages/filmes.html')
    aguardar(pagina)


def verificar_cache_contadores(browser, base, capturas):
    with browser.new_context(reduced_motion='reduce') as contexto:
        pagina = contexto.new_page()
        requests = []

        def rota(pedido):
            requests.append(pedido.request.url)
            renderizar_api(pedido, capturas)

        pagina.route(URL_API, rota)
        pagina.goto(base)
        numeros = [capturas[API + recurso + '/']['count'] for recurso in list(PAGINAS)[:-1]] + [11]
        contadores = pagina.locator('[data-contador]')
        expect(contadores).to_have_text(list(map(str, numeros)), timeout=15000)
        assert requests, 'A Home fria não consultou a SWAPI'
        assert len(requests) == len(set(requests)), requests
        requests.clear()
        pagina.reload()
        expect(contadores).to_have_text(list(map(str, numeros)), timeout=15000)
        assert not requests, requests


def verificar_animacoes(browser, base, capturas):
    with browser.new_context(
        reduced_motion='no-preference', viewport={'width': 390, 'height': 700},
    ) as contexto:
        pagina = contexto.new_page()
        pagina.route(URL_API, lambda pedido: renderizar_api(pedido, capturas))
        pagina.goto(base)
        estrelas = pagina.locator('canvas.nexus-estrelas')
        expect(estrelas).to_have_attribute('aria-hidden', 'true')
        inicial = estrelas.evaluate('canvas => canvas.toDataURL()')
        pagina.wait_for_function("""anterior =>
            document.querySelector('canvas.nexus-estrelas').toDataURL() !== anterior
        """, arg=inicial, timeout=4000)
        pagina.evaluate("""() => {
            Object.defineProperty(document, 'hidden', {value: true, configurable: true});
            document.dispatchEvent(new Event('visibilitychange'));
        }""")
        parada = estrelas.evaluate('canvas => canvas.toDataURL()')
        assert estrelas.evaluate("""canvas => new Promise(resolve => {
            setTimeout(() => resolve(canvas.toDataURL()), 150);
        })""") == parada, 'O fundo continuou animado em uma aba oculta'
        pagina.evaluate("""() => {
            delete document.hidden;
            document.dispatchEvent(new Event('visibilitychange'));
        }""")
        pagina.emulate_media(reduced_motion='reduce')
        estatica = estrelas.evaluate('canvas => canvas.toDataURL()')
        assert estrelas.evaluate("""canvas => new Promise(resolve => {
            setTimeout(() => resolve(canvas.toDataURL()), 150);
        })""") == estatica, 'Movimento presente com preferência por redução'
        pagina.locator('#explorar').scroll_into_view_if_needed()
        topo = pagina.get_by_role('button', name='Voltar ao topo')
        expect(topo).to_be_visible()
        barra = pagina.locator('.nexus-progresso')
        assert float(barra.evaluate("el => el.style.getPropertyValue('--nexus-progresso')")) > 0
        topo.focus()
        pagina.keyboard.press('Enter')
        expect(pagina.locator('.catalog-brand').first).to_be_focused()
        pagina.wait_for_function('window.scrollY < 2')


def verificar_home_sem_javascript(browser, base):
    with browser.new_context(java_script_enabled=False, viewport={'width': 375, 'height': 800}) as contexto:
        pagina = contexto.new_page()
        pagina.goto(base)
        expect(pagina.get_by_role('heading', level=1)).to_have_text(TITULO_HOME)
        expect(pagina.locator('.home-hero')).to_contain_text(APRESENTACAO)
        for link in pagina.locator('#explorar a').all():
            expect(link).to_be_visible()
        expect(pagina.locator('#explorar a')).to_have_count(4)
        expect(pagina.locator('footer')).to_be_visible()
        largura_pagina(pagina)


def verificar_links(pagina, base):
    for caminho in LINKS:
        pagina.goto(base + caminho)
        if caminho != '/':
            aguardar(pagina)
        links = pagina.locator('a[href]').evaluate_all("""links => links
           .map(link => new URL(link.href))
           .filter(url => url.origin === location.origin)
           .map(url => ({url: url.href, fragmento: url.hash, pagina: url.pathname}))
        """)
        for link in links:
            if link['fragmento'] and link['pagina'] == caminho:
                assert pagina.evaluate(
                    '(id) => !!document.getElementById(id)', link['fragmento'][1:],
                ), link
            else:
                url = link['url'].split('#', 1)[0]
                resposta = pagina.request.get(url, timeout=3000)
                assert resposta.ok, (url, resposta.status)


def verificar_teclado(pagina, base):
    pagina.goto(base)
    pagina.keyboard.press('Tab')
    expect(pagina.get_by_role('link', name='Pular para o conteúdo')).to_be_focused()
    pagina.keyboard.press('Enter')
    expect(pagina.locator('main')).to_be_focused()
    assert pagina.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")


def executar(opcoes):
    testes = Testes(opcoes.somente)
    handler = partial(ServidorSilencioso, directory=ROOT)
    with ThreadingHTTPServer(('127.0.0.1', 0), handler) as server, sync_playwright() as pw:
        servidor = Thread(target=server.serve_forever, daemon=True)
        servidor.start()
        base = f'http://127.0.0.1:{server.server_port}'
        browser = pw.chromium.launch(executable_path=os.environ.get('NEXUS_CHROMIUM_EXECUTABLE'))
        ao_vivo = browser.new_page(ignore_https_errors=os.environ.get('NEXUS_TEST_IGNORE_TLS') == '1')
        capturas = capturar_swapi(ao_vivo, base)
        if opcoes.capturas:
            opcoes.capturas.write_text(json.dumps(capturas, ensure_ascii=False), encoding='utf-8')
        estatisticas = {r: capturas[API + r + '/']['count'] for r in PAGINAS}
        print(f'SWAPI real: {estatisticas}, {len(capturas)} página(s) capturadas', flush=True)
        ao_vivo.close()

        contexto = browser.new_context(reduced_motion='reduce', viewport={'width': 1440, 'height': 900})
        pagina = contexto.new_page()
        excecoes, console, locais, registrar = [], [], [], []
        pagina.on('pageerror', lambda erro: excecoes.append(str(erro)))
        pagina.on('console', lambda msg: console.append(msg.text) if msg.type == 'error' else None)
        pagina.on('response', lambda resp: locais.append((resp.status, resp.url))
                  if resp.status >= 400 and resp.url.startswith(base) else None)

        def registrar_api(rota):
            registrar.append(rota.request.url)
            renderizar_api(rota, capturas)

        contexto.route(URL_API, registrar_api)

        for recurso in PAGINAS:
            dados = [registro['name'] for url, dados in capturas.items()
                     if urlparse(url).path == '/api/' + recurso + '/'
                     for registro in dados['results'] if 'name' in registro]
            esperado = CRONOLOGIA if recurso == 'films' else dados
            testes.executar(f'Carregamento paginado e total de {PAGINAS[recurso]}',
                            lambda: verificar_catalogo(pagina, base, recurso, esperado, capturas, registrar))
            testes.executar(f'Busca acessível e limpeza em {PAGINAS[recurso]}',
                            lambda: verificar_busca(pagina, base, recurso))

        testes.executar('Home definitiva com apresentação, dois CTAs e quatro catálogos',
                        lambda: verificar_home(pagina, base, capturas))
        testes.executar('Indicadores da Home com cache e sem requisições duplicadas',
                        lambda: verificar_cache_contadores(browser, base, capturas))
        testes.executar('Home sem JavaScript preserva apresentação e quatro links',
                        lambda: verificar_home_sem_javascript(browser, base))
        testes.executar('11 filmes, três ordenações, quatro filtros e origens',
                        lambda: verificar_filmes(pagina, base, estatisticas['films']))
        testes.executar('Metadados de 11 filmes, ausência de dados residuais e fechamento por botão',
                        lambda: verificar_metadados_filmes(pagina, base))
        testes.executar('Crawl com início, pausa, reinício e leitura estática',
                        lambda: verificar_crawl(pagina, base))
        testes.executar('Cache, atualização manual e JSON inválido',
                        lambda: verificar_cache(pagina, base, capturas, registrar))
        testes.executar('Links locais de todas as páginas',
                        lambda: verificar_links(pagina, base))
        testes.executar('Navegação por teclado com movimento reduzido',
                        lambda: verificar_teclado(pagina, base))
        testes.executar('Animação espacial, pausa em aba oculta, redução de movimento e volta ao topo',
                        lambda: verificar_animacoes(browser, base, capturas))

        for largura in LARGURAS:
            for caminho in LINKS:
                testes.executar(f'Responsividade {largura}px {caminho}',
                                lambda: verificar_tela(pagina, base, caminho, largura, opcoes.screenshots))

        testes.executar('Console, exceções e respostas locais sem erros',
                        lambda: verificar_erros(excecoes, console, locais))
        testes.executar('Fallback de imagem indisponível em card e modal',
                        lambda: verificar_fallback(pagina, base))
        testes.executar('Skeleton durante carregamento e remoção após resposta',
                        lambda: verificar_carregamento(browser, base, capturas))
        testes.executar('Armazenamento bloqueado com catálogo e atualização funcionais',
                        lambda: verificar_armazenamento_bloqueado(browser, base, capturas))
        testes.executar('Texto externo tratado como texto e campos nulos tratados no card e modal',
                        lambda: verificar_dados_externos(browser, base, capturas))
        testes.executar('Respostas inválidas e paginação cíclica terminam com mensagem de erro',
                        lambda: verificar_respostas_invalidas(browser, base, capturas))
        testes.executar('HTTP 503, recuperação e fallback de cache expirado sem conexão',
                        lambda: verificar_falhas(browser, base, capturas))
        contexto.close()
        browser.close()
        server.shutdown()

    total = Counter(item['status'] for item in testes.resultados)
    resumo = {'swapi': estatisticas, 'paginas_swapi': len(capturas),
              'resumo': dict(total), 'resultados': testes.resultados}
    if opcoes.relatorio:
        opcoes.relatorio.write_text(json.dumps(resumo, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"Total: {total['passou']} aprovados, {total['falhou']} com falha", flush=True)
    return int(bool(total['falhou']))


def verificar_erros(excecoes, console, locais):
    assert not (excecoes or console or locais), {'exceções': excecoes, 'console': console, 'HTTP local': locais}


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--somente', help='Filtro de testes por expressão regular')
    cli.add_argument('--screenshots', type=Path, help='Pasta para capturas de 375 e 1440 px')
    cli.add_argument('--capturas', type=Path, help='Arquivo JSON de respostas reais capturadas nesta execução')
    cli.add_argument('--relatorio', type=Path, help='Arquivo do relatório JSON')
    args = cli.parse_args()
    if args.screenshots:
        args.screenshots.mkdir(parents=True, exist_ok=True)
    sys.exit(executar(args))
