# -*- coding: utf-8 -*-
"""Convierte un issue de GitHub en una entrada del carrusel de LinkedIn.

Lo ejecuta .github/workflows/linkedin.yml cuando se abre un issue etiquetado
como linkedin. El cuerpo llega como markdown del formulario de issue, con un
encabezado por campo.

LinkedIn no publica la actividad de un perfil: no hay RSS y leer el propio feed
por API exige ser partner aprobado. Asi que la fuente es el propio Pelayo
compartiendo el enlace, y esto solo se encarga de que llegue a la web sin tener
que abrir el portatil.

Uso:
  python tools/li_from_issue.py --body-file cuerpo.md [--json data/linkedin.json]
                                [--max 12] [--dry-run]
"""
import argparse
import datetime
import html
import io
import json
import os
import re
import sys
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_JSON = os.path.join(REPO, "data", "linkedin.json")
TIPOS = ("post", "repost", "comment", "like", "follow")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
VACIO = ("_no response_", "_sin respuesta_", "")


def campos_del_issue(body):
    """El formulario de issue rinde '### Etiqueta' seguido del valor."""
    out, clave, buf = {}, None, []
    for linea in body.replace("\r\n", "\n").split("\n"):
        m = re.match(r"^###\s+(.+?)\s*$", linea)
        if m:
            if clave:
                out[clave] = "\n".join(buf).strip()
            clave, buf = m.group(1).strip().lower(), []
        elif clave:
            buf.append(linea)
    if clave:
        out[clave] = "\n".join(buf).strip()
    return {k: ("" if v.strip().lower() in VACIO else v.strip()) for k, v in out.items()}


def limpia_url(url):
    """Fuera los parametros de seguimiento; queda la URL del contenido."""
    url = (url or "").strip()
    m = re.search(r"https?://\S+", url)
    url = m.group(0) if m else url
    url = re.sub(r"[?&](utm_[^=&]+|rcm|trk|midToken|midSig|trkEmail|lipi|licu|"
                 r"originalSubdomain|refId|trackingId)=[^&]*", "", url)
    return url.rstrip("?&.,)")


def lee_og(url):
    """Titulo y descripcion publicos de la pagina. Una peticion anonima, sin
       sesion. Si falla, no pasa nada: el texto se escribe a mano."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA,
                                                   "Accept-Language": "es,en"})
        with urllib.request.urlopen(req, timeout=12) as r:
            raw = r.read(400000).decode("utf-8", errors="replace")
    except Exception:
        return None, None

    def og(prop):
        pat = [r'<meta[^>]+property=["\']og:%s["\'][^>]+content=["\']([^"\']*)["\']' % prop,
               r'<meta[^>]+content=["\']([^"\']*)["\'][^>]+property=["\']og:%s["\']' % prop,
               r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)["\']']
        for p in pat[:2] if prop != "description" else pat:
            m = re.search(p, raw, re.I)
            if m:
                return html.unescape(m.group(1)).strip()
        return None
    return og("title"), og("description")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--body-file", required=True)
    ap.add_argument("--json", default=DEFAULT_JSON)
    ap.add_argument("--max", type=int, default=12)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    body = io.open(a.body_file, encoding="utf-8").read()
    c = campos_del_issue(body)
    # el formulario esta en ingles para que las etiquetas casen con GitHub
    url = limpia_url(c.get("link") or c.get("enlace") or "")
    if not url.startswith("http"):
        print("::error::el issue no trae un enlace valido")
        return 2

    tipo = (c.get("type") or c.get("tipo") or "post").strip().lower()
    tipo = tipo if tipo in TIPOS else "post"
    texto = c.get("what you want to say") or c.get("comment") or c.get("texto") or ""
    autor = c.get("author") or c.get("autor") or ""

    if not texto:
        t, d = lee_og(url)
        texto = (d or t or "").strip()
        # el og:title solo vale como autor si es corto; si no, es el titular
        # entero del articulo y queda ridiculo en la tarjeta
        if not autor and t and d and len(t) <= 70:
            autor = t.strip()
    if not texto:
        print("::error::sin texto y la pagina no expone og:description; escribelo en el issue")
        return 3

    if len(texto) > 460:
        texto = texto[:457].rstrip() + "..."

    datos = {"updated": "", "profile": "https://www.linkedin.com/in/biopelayo/", "items": []}
    if os.path.isfile(a.json):
        datos = json.load(io.open(a.json, encoding="utf-8"))
    items = datos.get("items", [])

    if any((it.get("id") or it.get("url")) == url for it in items):
        print("ya estaba: " + url)
        return 0

    items.insert(0, {
        "id": url, "type": tipo,
        "date": (c.get("date") or "").strip() or datetime.date.today().isoformat(),
        "text": texto, "url": url, "author": autor,
    })
    datos["items"] = items[:a.max]
    datos["updated"] = datetime.datetime.now(datetime.timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ")

    salida = json.dumps(datos, ensure_ascii=False, indent=2) + "\n"
    if a.dry_run:
        print(salida)
        return 0
    io.open(a.json, "w", encoding="utf-8", newline="\n").write(salida)
    print("anadido (%s): %s" % (tipo, url))
    print("total en el carrusel: %d" % len(datos["items"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
