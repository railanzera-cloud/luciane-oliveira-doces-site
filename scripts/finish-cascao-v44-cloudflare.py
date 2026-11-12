#!/usr/bin/env python3
"""Assemble V4.4 Cloudflare ZIP without modifying approved food photographs.

Usage:
 python scripts/finish-cascao-v44-cloudflare.py --base BUILD.zip --previous V43.zip \
    --morango MORANGO.jpeg --kinder KINDER.jpeg --chocotone CHOCOTONE.jpeg \
    --trio TRIO.jpeg --output V44.zip
The 97-file build comes from CI on the V4.4 HEAD. All binaries stay outside GitHub.
Does NOT deploy to Cloudflare, Supabase, or authorize release of hidden SKUs.
"""
import argparse
import hashlib
import io
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from PIL import Image

INPUT_SHA = {
    "morango": "6d1f962e57e520ef3194ffa262a4a106a031e7605f0b7c6e021f3e7c41ef984c",
    "kinder": "1e55d51c30c6da82e95fcb5f8b1ec9e7e926bf854a3d3986eebaf303ca4c7f72",
    "chocotone": "8419c34bacce7ac45bff536113069f236b81dd9a24a36645d5d5479e2de09db1",
    "trio": "2f2ff6429eb08b67e4c75fd8a6c33ae8caa483ab884b17b1c227946219bebae8",
}
PRIOR_SHA = "cc97c8e3014215480f33ac498ed1255b67ca9564678b4f80ab19409a4c82094e"
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
def sha(b):
    return hashlib.sha256(b).hexdigest()

def webp(image, width, height, quality):
    image = image.resize((width, height), Image.Resampling.LANCZOS) if image.size != (width,height) else image
    b=io.BytesIO()
    image.save(b,"WEBP",quality=quality,method=6,exact=True)
    return b.getvalue()

def new_images(paths):
    photos = {}
    for key, source in paths.items():
        content=source.read_bytes()
        if sha(content)!=INPUT_SHA[key]:
            raise SystemExit("Wrong uploaded source image: "+key)
        image=Image.open(io.BytesIO(content)).convert("RGB")
        if image.size != (1122,1402):
            raise SystemExit("Wrong uploaded dimensions: "+key)
        if key=="trio":
            # Crop only the photo (no retouching): show all three distinct toppings.
            center=image.crop((0,70,1122,840))
            name="images/cascao-trufado-trio-home-20261112-v44"
            photos[name+".webp"]=webp(center,1122,770,90)
            photos[name+"-360.webp"]=webp(center,360,247,85)
        else:
            flavor={"morango":"ninho-morango","kinder":"kinder-bueno","chocotone":"ninho-nutella-chocotone"}[key]
            name="images/cascao-trufado-"+flavor
            # Full photo remains authentic in detail views. Card crops frame upper
            # product at the same visual scale as the three original flavors.
            card=image.crop((236,85,886,898))
            photos[name+"-20261112-v44.webp"]=webp(image,1122,1402,88)
            photos[name+"-20261112-v44-360.webp"]=webp(image,360,450,84)
            photos[name+"-card-20261112-v44.webp"]=webp(card,600,750,89)
    assert len(photos)==11
    return photos

def main():
    a=argparse.ArgumentParser()
    for field in ("base","previous","morango","kinder","chocotone","trio","output"):
        a.add_argument("--"+field,type=Path,required=True)
    x=a.parse_args()
    if any(x.output.resolve()==p.resolve() for p in [x.base,x.previous]):
        raise SystemExit("Output must not replace input")
    if sha(x.previous.read_bytes())!=PRIOR_SHA:
        raise SystemExit("Old V4.3 package has unexpected SHA256")
    photos=new_images({k:getattr(x,k) for k in INPUT_SHA})
    with ZipFile(x.base) as build, ZipFile(x.previous) as previous:
        base_names=build.namelist()
        if build.testzip() or len(base_names)!=len(set(base_names)):
            raise SystemExit("Corrupt build")
        if not {"index.html","admin/index.html","pedido/index.html","404.html","_worker.js","_routes.json","_headers"}.issubset(base_names):
            raise SystemExit("Cloudflare package is missing required files")
        prior_names=[n for n in previous.namelist() if n.startswith("images/cascao-trufado-") and n.endswith(".webp")]
        if len(prior_names)!=9:
            raise SystemExit("V4.3 photo set incomplete")
        if set(base_names)&(set(photos)|set(prior_names)):
            raise SystemExit("Unexpected duplicate image in compiled build")
        for path,expected in NATAL_SHA.items():
            if path not in base_names or sha(build.read(path))!=expected:
                raise SystemExit("Approved Christmas asset changed: "+path)
        scripts="\n".join(build.read(n).decode("utf8","replace") for n in base_names if n.startswith("assets/") and n.endswith(".js"))
        required=["cascao-trufado-trio-home-20261112-v44.webp"]+[p for p in photos if not p.endswith("-360.webp")]
        for value in required:
            if value not in scripts:
                raise SystemExit("Compiled build is not V4.4: "+value)
        if "Cascão Trufado" not in scripts or "Fatias de Chocottone" not in scripts:
            raise SystemExit("Commercial product names missing from build")
        x.output.parent.mkdir(parents=True,exist_ok=True)
        with ZipFile(x.output,"w") as out:
            for member in build.infolist():
                out.writestr(member, build.read(member.filename))
            for n in sorted(prior_names):
                out.writestr(n, previous.read(n), compress_type=ZIP_DEFLATED,compresslevel=8)
            for n,blob in sorted(photos.items()):
                out.writestr(n,blob,compress_type=ZIP_DEFLATED,compresslevel=8)
    with ZipFile(x.output) as result, ZipFile(x.base) as original, ZipFile(x.previous) as prior:
        names=result.namelist()
        if result.testzip() or len(names)!=len(set(names)) or len(names)!=len(original.namelist())+20:
            raise SystemExit("Final ZIP corrupted or unexpected file count")
        for name in original.namelist():
            if result.read(name)!=original.read(name): raise SystemExit("Changed compiled file: "+name)
        for name in prior_names:
            if result.read(name)!=prior.read(name): raise SystemExit("Changed V4.3 original: "+name)
        for name,blob in photos.items():
            if result.read(name)!=blob:raise SystemExit("New photo mismatch: "+name)
        if any(n.startswith((".env","supabase/","node_modules/")) for n in names):
            raise SystemExit("Unsafe deployment content")
    print("V4.4 READY",len(names),"files",x.output.stat().st_size,"bytes",sha(x.output.read_bytes()))
if __name__=="__main__": main()
