#!/usr/bin/env python3
"""Помощник классической версии сайта a-nas.ru/sasha2.

images — скачивает исходники графики из _src/sasha2/images.json (Higgsfield) и кладёт сжатые копии
         в _src/sasha2/g/<name>-<ширина>.webp (сборщик копирует их в assets/g/). Готовые файлы не трогает.
ping   — сообщает Яндексу и Bing (IndexNow) адреса из карты сайта sasha2.
"""
import io, json, pathlib, re, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
SRC = ROOT / "_src" / "sasha2"
OUT = ROOT / "a-nas.ru" / "sasha2"


def images():
    from PIL import Image
    out = SRC / "g"
    out.mkdir(parents=True, exist_ok=True)
    for it in json.loads((SRC / "images.json").read_text(encoding="utf-8")):
        todo = [w for w in it["widths"] if not (out / f"{it['name']}-{w}.webp").exists()]
        if not todo or not it.get("url"):
            continue
        try:
            req = urllib.request.Request(it["url"], headers={"User-Agent": "sasha2-images"})
            src = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=120).read())).convert("RGB")
        except Exception as e:
            print(f"skip {it['name']}: {e}")
            continue
        for w in todo:
            im = src.resize((w, round(src.height * w / src.width)), Image.LANCZOS) if src.width > w else src
            t = out / f"{it['name']}-{w}.webp"
            im.save(t, "WEBP", quality=78, method=6)
            print(f"{t.name}: {t.stat().st_size // 1024} КБ")


def ping():
    key = (SRC / "indexnow-key.txt").read_text().strip()
    sm = (OUT / "sitemap.xml").read_text(encoding="utf-8")
    urls = re.findall(r"<loc>(https://a-nas\.ru/sasha2/[^<]*)</loc>", sm)
    if not urls:
        print("нет адресов"); return
    body = json.dumps({"host": "a-nas.ru", "key": key, "keyLocation": f"https://a-nas.ru/sasha2/{key}.txt", "urlList": urls}).encode()
    for api in ("https://yandex.com/indexnow", "https://www.bing.com/indexnow"):
        try:
            req = urllib.request.Request(api, data=body, headers={"Content-Type": "application/json; charset=utf-8"})
            print(api, urllib.request.urlopen(req, timeout=60).status, len(urls))
        except Exception as e:
            print(api, "ошибка:", e)


if __name__ == "__main__":
    {"images": images, "ping": ping}[sys.argv[1]]()
