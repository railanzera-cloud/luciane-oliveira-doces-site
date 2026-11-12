#!/usr/bin/env python3
"""Finaliza a V4.3 com três fotos ORIGINAIS da loja (9 WebPs, sem retoque).

Uso local:
  python scripts/finish-cascao-v43-cloudflare.py \
    --base outputs/LUCIANE_COMERCIAL_V4_3_BASE_SEM_FOTOS_CASCAO.zip \
    --kinder <foto1.jpeg> --morango <foto2.jpeg> --chocotone <foto3.jpeg> \
    --output outputs/LUCIANE_COMERCIAL_V4_3_CASCAO_NATAL.zip

NÃO publica Cloudflare nem altera Supabase. Requer Pillow. Valida as três
fotografias exatas enviadas em 12/11 e as oito fotos de Natal já aprovadas.
"""
from argparse import ArgumentParser
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

from PIL import Image

EXPECTED_JPEG = {
    "kinder-bueno": "fa639ae45e5a4f0fb954368140ac11ddadc3365ab7778cccbae0bd0b3e73ce25",
    "ninho-morango": "6f50d502edeacf4b400ea1f6ef7bd49fc3d4548c1625b6bcb04c788bd2d063df",
    "ninho-nutella-chocotone": "45391c0ec15dbae3872d7b67d15307e2e72e17a94215a89edafdd47304212c22",
}
NATAL_SHA = {
    "images/chocotone-casadinho-card-2026.webp": "5195c1a0c6de3e786a60829ce86ecefe6364f9f035d140b136ab1b27d99a7dea",
    "images/chocotone-casadinho-detail-2026.webp": "f2929a7cecffaab8ca96d409da6f24ca997241b10f4735784b9a9a402fb0bd21",
    "images/chocotone-ferrero-rocher-card-2026.webp": "1713660cce3b7ae6be44494a6ddd1db54157da7ce5a5d7053095e58bbf9b5fab",
    "images/chocotone-ferrero-rocher-detail-2026.webp": "d620313bcda485fa16f6c0f1a427c8d603c44c2e9304288c139400fc91622801",
    "images/chocotone-morango-brigadeiro-branco-chocolate-card-2026.webp": "0090c4dd6ca057d7ebcdf7b23fcb4a80ffcd9a5c6cd0baf51f1a4b7db0b7a113",
    "images/chocotone-morango-brigadeiro-branco-chocolate-detail-2026.webp": "57a1e2f12c144f349307332f1179a082520b36a5f25f4711a2c0a0c083c83e4e",
    "images/chocotone-ninho-nutella-card-2026.webp": "1245edcbcc136535580bd544a09beee3077d2ab57f6e286bfb6faab97a4ef3ca",
    "images/chocotone-ninho-nutella-detail-2026.webp": "032136d6da7810c556a32ce2360d5aa689821a1562f9d5d2f6721ca339dd24dd",
}
VARIANTS = (("", None, 88), ("-card", 600, 84), ("-360", 360, 82))

def digest(data):
    return sha256(data).hexdigest()

def encode_original_photo(source, flavor):
    blob = Path(source).read_bytes()
    if digest(blob) != EXPECTED_JPEG[flavor]:
        raise SystemExit(f"Foto de origem divergente: {flavor}")
    with Image.open(BytesIO(blob)) as source_image:
        image = source_image.convert("RGB")
        if image.size != (1122, 1402):
            raise SystemExit(f"Dimensão de origem divergente: {flavor}")
        result = {}
        for suffix, width, quality in VARIANTS:
            resized = image if width is None else image.resize(
                (width, round(image.height * width / image.width)), Image.Resampling.LANCZOS
            )
            out = BytesIO()
            resized.save(out, "WEBP", quality=quality, method=6, exact=True)
            name = (f"images/cascao-trufado-{flavor}-20261112-360.webp" if suffix == "-360"
                    else f"images/cascao-trufado-{flavor}{suffix}-20261112.webp")
            result[name] = out.getvalue()
        return result

def main():
    parser = ArgumentParser()
    parser.add_argument("--base", type=Path, required=True)
    parser.add_argument("--kinder", type=Path, required=True)
    parser.add_argument("--morango", type=Path, required=True)
    parser.add_argument("--chocotone", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.base.resolve() == args.output.resolve():
        raise SystemExit("Não sobrescrever a base")
    photos = {}
    for flavor, path in (
        ("kinder-bueno", args.kinder),
        ("ninho-morango", args.morango),
        ("ninho-nutella-chocotone", args.chocotone),
    ):
        photos.update(encode_original_photo(path, flavor))
    assert len(photos) == 9
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(args.base) as src:
        old = src.namelist()
        if len(old) != len(set(old)) or set(old).intersection(photos):
            raise SystemExit("Arquivos duplicados ou foto nova já presente na base")
        for name, expected in NATAL_SHA.items():
            if name not in old or digest(src.read(name)) != expected:
                raise SystemExit(f"Foto de Natal divergente: {name}")
        if not {"index.html", "admin/index.html", "pedido/index.html", "_worker.js"}.issubset(old):
            raise SystemExit("Base Cloudflare incompleta")
        assets = "\n".join(src.read(n).decode("utf8", "replace") for n in old if n.startswith("assets/") and n.endswith(".js"))
        for required in ("cascao-trufado-kinder-bueno", "cascao-trufado-ninho-morango",
                         "cascao-trufado-ninho-nutella-chocotone", "Cascão Trufado",
                         "chocotone-casadinho", "create-whatsapp-order"):
            if required not in assets:
                raise SystemExit(f"Build sem código V4.3: {required}")
        with ZipFile(args.output, "w") as final:
            for entry in src.infolist():
                final.writestr(entry, src.read(entry.filename))
            for name, data in sorted(photos.items()):
                final.writestr(name, data, compress_type=ZIP_DEFLATED, compresslevel=8)
    with ZipFile(args.output) as check:
        if check.testzip() is not None or len(check.namelist()) != len(set(check.namelist())):
            raise SystemExit("ZIP final corrompido ou duplicado")
        for name, data in photos.items():
            if check.read(name) != data:
                raise SystemExit(f"Foto alterada no pacote: {name}")
        for name, expected in NATAL_SHA.items():
            if digest(check.read(name)) != expected:
                raise SystemExit(f"Foto Natal alterada: {name}")
        if any(n.startswith((".env", "supabase/", "node_modules/")) for n in check.namelist()):
            raise SystemExit("Pacote contém arquivos de desenvolvimento")
        print(f"V4.3 FINAL: {len(check.namelist())} arquivos; {args.output.stat().st_size} bytes")
        print(f"SHA256: {digest(args.output.read_bytes())}")

if __name__ == "__main__":
    main()
