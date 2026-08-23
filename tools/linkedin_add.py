# -*- coding: utf-8 -*-
"""Añade una entrada de LinkedIn al carrusel de la web (data/linkedin.json).

Flujo manual asistido, cero automatismo sobre LinkedIn: tú pegas la URL de lo
que quieras destacar (un post tuyo, algo que compartes o comentas) y el script:
  1. intenta leer el título/descripción públicos de esa URL (og:tags, una sola
     petición anónima, sin sesión ni login);
  2. te deja poner o corregir el texto a mano;
  3. lo añade al principio de data/linkedin.json (sin duplicados);
  4. hace commit y push para que aparezca en biopelayo.github.io.

Uso:
  python tools/linkedin_add.py <url> [--type post|repost|comment|like|follow]
                               [--text "..."] [--author "..."] [--date AAAA-MM-DD]
                               [--no-push] [--file RUTA_JSON]
"""
import argparse
import datetime
import html
import io
import json
import os
import re
import subprocess
import sys
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_JSON = os.path.join(REPO, "data", "linkedin.json")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")


def clean_url(url):
    """Quita parámetros de tracking; conserva la URL canónica del contenido."""
    url = url.strip()
    url = re.sub(r"[?&](utm_[^=&]+|rcm|trk|midToken|midSig|trkEmail|lipi|licu)=[^&]*", "", url)
    return url.rstrip("?&")


def fetch_og(url):
    """Intenta leer og:title / og:description de la página pública. Devuelve (titulo, descripcion) o (None, None)."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "es,en"})
        with urllib.request.urlopen(req, timeout=12) as r:
            raw = r.read(400_000).decode("utf-8", errors="replace")
    except Exception as e:
        print(f"  (no se pudo leer la página pública: {e})")
        return None, None
    def og(prop):
        m = re.search(r'<meta[^>]+property="og:%s"[^>]+content="([^"]*)"' % prop, raw)
        if not m:
            m = re.search(r'<meta[^>]+content="([^"]*)"[^>]+property="og:%s"' % prop, raw)
        return html.unescape(m.group(1)).strip() if m else None
    return og("title"), og("description")


def main():
    ap = argparse.ArgumentParser(description="Añade una entrada de LinkedIn al carrusel de la web.")
    ap.add_argument("url", help="URL del post/actividad de LinkedIn")
    ap.add_argument("--type", choices=["post", "repost", "comment", "like", "follow"], default="post")
    ap.add_argument("--text", default=None, help="Texto de la tarjeta (si no, se intenta extraer y confirmar)")
    ap.add_argument("--author", default=None, help="Autor original (para reposts/likes de contenido ajeno)")
    ap.add_argument("--date", default=None, help="Fecha AAAA-MM-DD (por defecto, hoy)")
    ap.add_argument("--no-push", action="store_true", help="No hacer commit ni push (solo escribir el JSON)")
    ap.add_argument("--file", default=DEFAULT_JSON, help="Ruta del JSON (por defecto data/linkedin.json)")
    args = ap.parse_args()

    url = clean_url(args.url)
    if "linkedin.com" not in url:
        print("Aviso: la URL no parece de LinkedIn. Se añade igualmente.")

    with io.open(args.file, encoding="utf-8") as f:
        data = json.load(f)
    items = data.get("items", [])

    if any(clean_url(i.get("url", "")) == url for i in items):
        print("Esa URL ya está en el carrusel. Nada que hacer.")
        return 0

    text = args.text
    author = args.author
    if text is None:
        print("Leyendo la página pública…")
        title, desc = fetch_og(url)
        candidate = desc or title
        if candidate:
            print(f"\nTexto extraído:\n  «{candidate[:300]}»\n")
            keep = input("¿Usarlo? [S/n o escribe otro texto]: ").strip()
            if keep.lower() in ("", "s", "si", "sí", "y", "yes"):
                text = candidate[:400]
            elif keep.lower() in ("n", "no"):
                text = input("Texto de la tarjeta: ").strip()
            else:
                text = keep
        else:
            text = input("No se pudo extraer nada. Texto de la tarjeta: ").strip()
        if author is None and title and " on LinkedIn" in title:
            guess = title.split(" on LinkedIn")[0].strip()
            if guess and guess.lower() not in ("linkedin",):
                author = guess

    item = {
        "id": url,
        "type": args.type,
        "date": args.date or datetime.date.today().isoformat(),
        "text": text,
        "url": url,
    }
    if author:
        item["author"] = author

    items.insert(0, item)
    data["items"] = items
    data["updated"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with io.open(args.file, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Añadido ({item['type']}, {item['date']}): {text[:80]}…" if len(text) > 80 else f"Añadido ({item['type']}, {item['date']}): {text}")

    if args.no_push:
        print("(--no-push: sin commit; recuerda publicar cuando quieras)")
        return 0

    rel = os.path.relpath(args.file, REPO)
    try:
        subprocess.run(["git", "add", rel], cwd=REPO, check=True)
        subprocess.run(["git", "commit", "-q", "-m", f"LinkedIn: nueva entrada ({item['type']} {item['date']})"], cwd=REPO, check=True)
        subprocess.run(["git", "push", "origin", "main"], cwd=REPO, check=True)
        print("Publicado. En ~1 minuto estará en biopelayo.github.io")
    except subprocess.CalledProcessError as e:
        print(f"El commit/push falló ({e}). El JSON queda guardado; publica a mano con git push.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
