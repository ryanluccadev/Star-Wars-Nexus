"""Indexa e valida imagens locais, com importação opcional de arquivos autorizados."""

import argparse
import json
import re
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parents[1]
PASTA = RAIZ / 'assets' / 'imagens'
MAPA = RAIZ / 'data' / 'imagens-locais.js'
DESCRICOES = RAIZ / 'data' / 'imagens-descricoes.json'
CREDITOS = RAIZ / 'CREDITOS-IMAGENS.md'
CATEGORIAS = {
    'people': 'personagens',
    'planets': 'planetas',
    'starships': 'naves',
    'films': 'filmes',
}
FORMATOS = {'.jpg', '.jpeg', '.png', '.webp'}


def identificar(pasta, nome):
    if pasta == 'filmes' and nome in {'solo', 'rogue-one'}:
        return nome
    if pasta == 'filmes':
        nome = nome.removeprefix('episodio-')
    id_inicial = re.fullmatch(r'([1-9][0-9]*)(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?', nome)
    if not id_inicial:
        raise ValueError(f'Nome inválido em {pasta}: {nome}')
    return id_inicial.group(1)


def preparar_imagem(arquivo):
    with Image.open(arquivo) as imagem:
        imagem.verify()
    with Image.open(arquivo) as imagem:
        imagem = ImageOps.exif_transpose(imagem).convert('RGB')
        imagem.thumbnail((1440, 1080))
        memoria = BytesIO()
        imagem.save(memoria, format='WEBP', quality=86, method=6)
        return memoria.getvalue()


def ler_existentes():
    encontrados = {}
    for pasta in CATEGORIAS.values():
        for arquivo in sorted((PASTA / pasta).glob('*.webp')):
            id_imagem = identificar(pasta, arquivo.stem)
            chave = pasta, id_imagem
            if chave in encontrados:
                raise ValueError(f'Dois arquivos para o identificador {pasta}/{id_imagem}')
            with Image.open(arquivo) as imagem:
                if imagem.format != 'WEBP':
                    raise ValueError(f'O formato real deve ser WebP: {arquivo}')
                imagem.verify()
            encontrados[chave] = arquivo.name
    return encontrados


def importar(origem, caminho_creditos, encontrados, descricoes):
    creditos = json.loads(caminho_creditos.read_text(encoding='utf-8'))
    preparados = []
    for pasta in CATEGORIAS.values():
        for arquivo in sorted((origem / pasta).glob('*')):
            if not arquivo.is_file() or arquivo.suffix.lower() not in FORMATOS:
                continue
            chave = pasta, identificar(pasta, arquivo.stem)
            if chave in encontrados:
                raise ValueError(f'Já existe uma imagem para {pasta}/{chave[1]}')
            relativo = f'{pasta}/{arquivo.stem}.webp'
            ficha = creditos.get(f'{pasta}/{arquivo.name}', {})
            valores = [ficha.get(campo) for campo in ('descricao', 'fonte', 'autor', 'licenca')]
            if not all(isinstance(valor, str) and valor.strip() for valor in valores):
                raise ValueError(f'Preencha descrição, fonte, autor e licença para {arquivo.name}')
            if urlparse(ficha['fonte']).scheme not in {'https', 'http'}:
                raise ValueError(f'Informe a URL da origem para {arquivo.name}')
            if any('|' in valor or '\n' in valor for valor in valores):
                raise ValueError(f'Preencha os créditos em uma única linha para {arquivo.name}')
            preparados.append((relativo, preparar_imagem(arquivo), ficha))
            encontrados[chave] = Path(relativo).name
    if not preparados:
        raise ValueError('Nenhuma imagem compatível encontrada para importar.')

    atribuicoes = ['\n## Imagens acrescentadas por importação\n']
    for relativo, dados, ficha in preparados:
        destino = PASTA / relativo
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(dados)
        descricoes[relativo] = ficha['descricao']
        atribuicoes.append(
            f"- `{relativo}` — {ficha['autor']}. {ficha['licenca']}. [Origem](<{ficha['fonte']}>)."
        )
    with CREDITOS.open('a', encoding='utf-8') as arquivo:
        arquivo.write('\n'.join(atribuicoes) + '\n')
    DESCRICOES.write_text(json.dumps(descricoes, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def atualizar(entrada, creditos):
    descricoes = json.loads(DESCRICOES.read_text(encoding='utf-8'))
    encontrados = ler_existentes()
    if entrada:
        importar(entrada, creditos, encontrados, descricoes)

    configuracao = {recurso: [] for recurso in CATEGORIAS}
    for recurso, pasta in CATEGORIAS.items():
        for (categoria, id_imagem), nome in encontrados.items():
            if categoria == pasta:
                relativo = f'{pasta}/{nome}'
                descricao = descricoes.get(relativo)
                if not descricao:
                    descricao = 'Imagem do registro ' + nome.removesuffix('.webp').replace('-', ' ')
                configuracao[recurso].append({
                    'id': id_imagem, 'arquivo': relativo, 'descricao': descricao
                })

    mensagem = '// Gerado por scripts/indexar-imagens.py.\nexport const imagensEspecificas = '
    MAPA.write_text(mensagem + json.dumps(configuracao, ensure_ascii=False, indent=4) + ';\n', encoding='utf-8')
    print(f'{sum(map(len, configuracao.values()))} imagens validadas e indexadas.')


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--importar', type=Path, help='Pasta local com subpastas por categoria.')
    cli.add_argument('--creditos', type=Path, help='Arquivo JSON de créditos das imagens importadas.')
    args = cli.parse_args()
    if bool(args.importar) != bool(args.creditos):
        cli.error('--importar e --creditos devem ser usados juntos.')
    try:
        atualizar(args.importar, args.creditos)
    except (OSError, ValueError) as erro:
        raise SystemExit(erro) from erro
