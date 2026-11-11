#!/usr/bin/env python3
"""Empacota Natal V4 apenas com WebPs idênticos ao ZIP V3 aprovado.

Fonte de bytes: URLs públicas do deployment comercial. Se qualquer URL estiver
indisponível ou se o SHA-256 divergir do artefato V3 aprovado, NÃO gera o ZIP.
Não modifica o site público, Supabase ou dados de pedidos.
"""
from hashlib import sha256
from os import environ
from pathlib import Path
from urllib.request import Request, urlopen
from zipfile import ZIP_DEFLATED, ZipFile

BASE = Path("outputs/luciane-oliveira-doces-cloudflare-pages.zip")
RELEASE = environ.get("NATAL_PACKAGE_VERSION", "V4")
if RELEASE not in {"V4", "V4_1"}:
    raise SystemExit("Versão não autorizada de pacote Natal")
FINAL = Path(f"outputs/LUCIANE_NATAL_{RELEASE}.zip")
URL = "https://lucianeoliveiradoces.pages.dev"
# SHA-256 medidos nos oito binários de LUCIANE_NATAL_V3.zip, 11/11/2026.
APPROVED = {
    "images/chocotone-casadinho-card-2026.webp": "5195c1a0c6de3e786a60829ce86ecefe6364f9f035d140b136ab1b27d99a7dea",
    "images/chocotone-casadinho-detail-2026.webp": "f2929a7cecffaab8ca96d409da6f24ca997241b10f4735784b9a9a402fb0bd21",
    "images/chocotone-ferrero-rocher-card-2026.webp": "1713660cce3b7ae6be44494a6ddd1db54157da7ce5a5d7053095e58bbf9b5fab",
    "images/chocotone-ferrero-rocher-detail-2026.webp": "d620313bcda485fa16f6c0f1a427c8d603c44c2e9304288c139400fc91622801",
    "images/chocotone-morango-brigadeiro-branco-chocolate-card-2026.webp": "0090c4dd6ca057d7ebcdf7b23fcb4a80ffcd9a5c6cd0baf51f1a4b7db0b7a113",
    "images/chocotone-morango-brigadeiro-branco-chocolate-detail-2026.webp": "57a1e2f12c144f349307332f1179a082520b36a5f25f4711a2c0a0c083c83e4e",
    "images/chocotone-ninho-nutella-card-2026.webp": "1245edcbcc136535580bd544a09beee3077d2ab57f6e286bfb6faab97a4ef3ca",
    "images/chocotone-ninho-nutella-detail-2026.webp": "032136d6da7810c556a32ce2360d5aa689821a1562f9d5d2f6721ca339dd24dd",
}
if not BASE.is_file():
    raise SystemExit(f"Build Cloudflare não encontrado: {BASE}")

photos = {}
for path, expected in APPROVED.items():
    request = Request(f"{URL}/{path}", headers={"User-Agent": "Luciane-Natal-V4-integrity-check"})
    with urlopen(request, timeout=25) as response:
        blob = response.read(2_000_001)
    digest = sha256(blob).hexdigest()
    if digest != expected:
        raise SystemExit(f"Foto não corresponde ao V3 aprovado: {path} (SHA={digest})")
    photos[path] = blob
    print(f"Foto aprovada preservada: {path} ({len(blob)} bytes)")

with ZipFile(BASE) as original:
    names = set(original.namelist())
    if names.intersection(APPROVED):
        raise SystemExit("O build já contém fotos de Natal: verificar origem antes de sobrescrever")
    if len(names) != len(original.namelist()):
        raise SystemExit("Arquivos duplicados no pacote-base")
    with ZipFile(FINAL, "w") as packaged:
        for member in original.infolist():
            packaged.writestr(member, original.read(member.filename))
        for path, blob in photos.items():
            packaged.writestr(path, blob, compress_type=ZIP_DEFLATED, compresslevel=8)

with ZipFile(FINAL) as final:
    names = set(final.namelist())
    assert final.testzip() is None, "ZIP corrompido"
    assert len(names) == len(final.namelist()), "Caminhos duplicados"
    assert {"index.html", "admin/index.html", "pedido/index.html", "404.html",
            "_worker.js", "_routes.json", "_headers"}.issubset(names)
    for path, approved_sha in APPROVED.items():
        assert sha256(final.read(path)).hexdigest() == approved_sha, path
    assert not any(x.startswith((".env", "supabase/", "node_modules/")) for x in names)
    print(f"LUCIANE_NATAL_{RELEASE} íntegro: {len(names)} arquivos, {FINAL.stat().st_size} bytes, SHA256 {sha256(FINAL.read_bytes()).hexdigest()}")
