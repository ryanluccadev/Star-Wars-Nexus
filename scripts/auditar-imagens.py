"""Audita o catálogo real e a exibição das imagens. Requer Pillow, Playwright e Chromium."""

from collections import Counter
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import unquote, urlparse
import os
import re

from PIL import Image
from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
IMAGENS = ROOT / 'assets/imagens'
PAGINAS = {
    'people': 'personagens',
    'planets': 'planetas',
    'starships': 'naves',
    'films': 'filmes',
}


class ServidorSilencioso(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def auditar_arquivos(especificas, placeholders):
    arquivos = list(placeholders[r]['arquivo'] for r in PAGINAS)
    creditos = (ROOT / 'CREDITOS-IMAGENS.md').read_text(encoding='utf-8')
    formatos = {'.webp': 'WEBP', '.png': 'PNG'}

    for recurso, entradas in especificas.items():
        ids = [imagem['id'] for imagem in entradas]
        assert len(ids) == len(set(ids)), (recurso, 'IDs duplicados')
        for imagem in entradas:
            assert imagem['arquivo'] in creditos, (recurso, 'Crédito ausente', imagem)
            arquivos.append(imagem['arquivo'])

    assert len(arquivos) == len(set(arquivos)), 'Arquivo usado em mais de um mapeamento'
    arquivos = {*arquivos, 'banners/marca.webp'}
    for path in [ROOT / 'index.html', *(ROOT / 'pages').glob('*.html'), *(ROOT / 'css').glob('*.css')]:
        if path.name.endswith('.min.css'):
            continue
        arquivos.update(re.findall(r'assets/imagens/([\w./-]+\.(?:webp|png))', path.read_text(encoding='utf-8')))

    arquivos_locais = {
        path.relative_to(IMAGENS).as_posix() for path in IMAGENS.rglob('*') if path.suffix in formatos
    }
    assert not arquivos - arquivos_locais, ('Arquivos ausentes', arquivos - arquivos_locais)
    assert not arquivos_locais - arquivos, ('Arquivos órfãos', arquivos_locais - arquivos)
    for nome in sorted(arquivos):
        with Image.open(IMAGENS / nome) as image:
            assert image.format == formatos[Path(nome).suffix] and min(image.size) > 0
            image.verify()
        with Image.open(IMAGENS / nome) as image:
            image.load()
    print(f'{len(arquivos)} arquivos de imagem válidos e inventariados')


def checar_imagens(locator):
    imagens = locator.evaluate_all("""async items => await Promise.all(items.map(async img => {
        img.loading = 'eager';
        await img.decode();
        const titulo = img.closest('article')?.querySelector('h2')?.textContent;
        return {src: img.currentSrc, alt: img.alt, titulo, largura: img.naturalWidth};
    }))""")
    assert imagens and all(img['largura'] > 0 for img in imagens)
    return imagens


def arquivo_exibido(imagem):
    return unquote(urlparse(imagem['src']).path).removeprefix('/assets/imagens/')


def auditar_catalogo(pagina, base, recurso, esperadas):
    pagina.goto(f'{base}/pages/{PAGINAS[recurso]}.html')
    expect(pagina.locator('#atualizar')).to_be_visible(timeout=45000)
    cards = pagina.locator('.catalog-card .card-image')
    encontrados = Counter()
    botao_seguinte = pagina.get_by_role('button', name='Próxima página', exact=True)
    while True:
        assert cards.evaluate_all("(imgs) => imgs.every(img => img.loading === 'lazy' && img.alt)")
        for imagem in checar_imagens(cards):
            esperado = esperadas[imagem['titulo']]
            assert imagem['alt'] == esperado['descricao']
            assert arquivo_exibido(imagem) == esperado['arquivo'], imagem
            encontrados[imagem['titulo']] += 1
        if not botao_seguinte.count() or botao_seguinte.is_disabled():
            break
        botao_seguinte.click()
    assert encontrados == Counter(esperadas.keys()), (recurso, encontrados)

    exemplo = next(
        (nome for nome, img in esperadas.items() if not img['arquivo'].startswith('placeholders/')),
        next(iter(esperadas)),
    )
    busca = pagina.locator('#busca')
    busca.fill(exemplo)
    ordem = pagina.locator('#ordem')
    if ordem.count():
        ordem.select_option('lancamento' if recurso == 'films' else 'desc')
    expect(cards).to_have_count(1)
    detalhes = pagina.get_by_role('button', name=f'Ver detalhes de {exemplo}', exact=True)

    for largura, altura in [(1366, 768), (375, 667)]:
        pagina.set_viewport_size({'width': largura, 'height': altura})
        assert not pagina.evaluate('document.documentElement.scrollWidth > innerWidth')
        antes = checar_imagens(cards)[0]
        detalhes.click()
        expect(pagina.get_by_role('dialog')).to_be_visible()
        modal = checar_imagens(pagina.locator('.detail-image'))[0]
        assert (modal['src'], modal['alt']) == (antes['src'], antes['alt'])
        assert not pagina.evaluate("""() => {
            const corpo = document.querySelector('.modal.show .modal-body');
            return corpo.scrollWidth > corpo.clientWidth + 1;
        }""")
        pagina.keyboard.press('Escape')
        expect(pagina.get_by_role('dialog')).to_be_hidden()

    print(f'{PAGINAS[recurso]}: {len(encontrados)} cards, imagem e alt validados em toda a paginação')


def auditar_fallback(pagina, base, recurso, esperadas, placeholders):
    especificas = [(nome, img) for nome, img in esperadas.items() if img != placeholders[recurso]]
    if not especificas:
        return False
    nome, img = especificas[0]
    bloquear = '**/assets/imagens/' + img['arquivo']
    pagina.route(bloquear, lambda rota: rota.abort())
    try:
        pagina.goto(f'{base}/pages/{PAGINAS[recurso]}.html')
        expect(pagina.locator('#atualizar')).to_be_visible()
        pagina.locator('#busca').fill(nome)
        card = pagina.get_by_role('button', name=f'Ver detalhes de {nome}', exact=True).locator('xpath=ancestor::article')
        expect(card.locator('.card-image')).to_have_attribute('alt', placeholders[recurso]['descricao'])
        assert arquivo_exibido(checar_imagens(card.locator('.card-image'))[0]) == placeholders[recurso]['arquivo']
        card.get_by_role('button', name=f'Ver detalhes de {nome}', exact=True).click()
        expect(pagina.get_by_role('dialog')).to_be_visible()
        imagem_modal = pagina.locator('.detail-image')
        expect(imagem_modal).to_have_attribute('alt', placeholders[recurso]['descricao'])
        assert arquivo_exibido(checar_imagens(imagem_modal)[0]) == placeholders[recurso]['arquivo']
    finally:
        pagina.unroute(bloquear)
    print(f'{PAGINAS[recurso]}: fallback confirmado no card e no modal com falha de carregamento')
    return True


def auditar():
    handler = partial(ServidorSilencioso, directory=ROOT)
    with ThreadingHTTPServer(('127.0.0.1', 0), handler) as server, sync_playwright() as pw:
        Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_port}'
        binario = os.environ.get('NEXUS_CHROMIUM_EXECUTABLE')
        browser = pw.chromium.launch(executable_path=binario)
        page = browser.new_page(ignore_https_errors=os.environ.get('NEXUS_TEST_IGNORE_TLS') == '1')
        erros = []
        page.on('pageerror', lambda error: erros.append(str(error)))
        page.goto(base)
        checar_imagens(page.locator('img'))
        dados = page.evaluate("""async recursos => {
            const { carregarRecurso } = await import('/js/api.js');
            const { carregarFilmes } = await import('/js/filmes.js');
            const { imagensEspecificas, placeholders, imagemDoRegistro } = await import('/js/imagens.js');
            const catalogo = {};
            for (const recurso of recursos) {
                const itens = recurso === 'films'
                    ? await carregarFilmes({ atualizar: true })
                    : await carregarRecurso(recurso, { atualizar: true });
                catalogo[recurso] = itens.map(item => ({
                    id: recurso === 'films' ? String(item.episode_id ?? item.id.replace(/^filme:/, '')) : item.url.split('/').at(-2),
                    nome: item.name ?? item.titulo_pt ?? item.title,
                    imagem: imagemDoRegistro(recurso, item)
                }));
            }
            return {catalogo, imagensEspecificas, placeholders};
        }""", list(PAGINAS))
        auditar_arquivos(dados['imagensEspecificas'], dados['placeholders'])
        esperadas = {}
        for recurso, itens in dados['catalogo'].items():
            ids = {item['id'] for item in itens}
            assert len(ids) == len(itens), (recurso, 'IDs da API repetidos')
            assert all(img['id'] in ids for img in dados['imagensEspecificas'][recurso])
            esperadas[recurso] = {item['nome']: item['imagem'] for item in itens}
            assert len(esperadas[recurso]) == len(itens)
            auditar_catalogo(page, base, recurso, esperadas[recurso])
        for recurso in PAGINAS:
            auditar_fallback(page, base, recurso, esperadas[recurso], dados['placeholders'])
        assert not erros, erros
        browser.close()
        server.shutdown()


if __name__ == '__main__':
    auditar()
