# -*- coding: utf-8 -*-
"""Convierte un issue de GitHub en una entrada de la web.

Sirve a las tres secciones que se alimentan de un JSON: el carrusel de LinkedIn,
los manuscritos y los informes. La etiqueta del issue decide cual.

El cuerpo llega como markdown del formulario de issue, con un encabezado por
campo. Lo ejecuta .github/workflows/contenido.yml.

Uso:
  python tools/add_from_issue.py --tipo manuscript --body-file cuerpo.md
                                 [--dry-run] [--max 24]
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
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
VACIO = ("_no response_", "_sin respuesta_", "")

# tipo -> (fichero, campo de clasificacion, valores validos, cuantas guarda)
SECCIONES = {
    "linkedin":   ("data/linkedin.json",    "type",
                   ("post", "repost", "comment", "like", "follow"), 12),
    "manuscript": ("data/manuscripts.json", "status",
                   ("preprint", "review", "published"), 24),
    "report":     ("data/reports.json",     "kind",
                   ("audit", "benchmark", "validation", "technical"), 24),
}


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
       sesion. Si falla, el texto se escribe a mano y ya esta."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA,
                                                   "Accept-Language": "es,en"})
        with urllib.request.urlopen(req, timeout=12) as r:
            raw = r.read(400000).decode("utf-8", errors="replace")
    except Exception:
        return None, None

    def og(prop):
        pats = [r'<meta[^>]+property=["\']og:%s["\'][^>]+content=["\']([^"\']*)["\']' % prop,
                r'<meta[^>]+content=["\']([^"\']*)["\'][^>]+property=["\']og:%s["\']' % prop]
        if prop == "description":
            pats.append(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)["\']')
        for p in pats:
            m = re.search(p, raw, re.I)
            if m:
                return html.unescape(m.group(1)).strip()
        return None
    return og("title"), og("description")


def doi_meta(doi):
    """Titulo, revista, autores y ano desde Crossref. Sin clave ni registro."""
    doi = re.sub(r"^https?://(dx\.)?doi\.org/", "", (doi or "").strip())
    if not doi:
        return {}
    try:
        req = urllib.request.Request("https://api.crossref.org/works/" + doi,
                                     headers={"User-Agent": UA + " (mailto:bio.pelayo@gmail.com)"})
        with urllib.request.urlopen(req, timeout=15) as r:
            m = json.load(r)["message"]
    except Exception:
        return {"doi": doi}
    autores = []
    for a in (m.get("author") or [])[:3]:
        nombre = (a.get("given", "")[:1] + ". " if a.get("given") else "") + a.get("family", "")
        if nombre.strip():
            autores.append(nombre.strip())
    if len(m.get("author") or []) > 3:
        autores.append("et al.")
    fecha = (m.get("issued", {}).get("date-parts") or [[None]])[0]
    return {
        "doi": doi,
        "title": (m.get("title") or [""])[0],
        "venue": (m.get("container-title") or [""])[0] or m.get("publisher", ""),
        "authors": ", ".join(autores),
        "year": str(fecha[0]) if fecha and fecha[0] else "",
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tipo", required=True, choices=sorted(SECCIONES))
    ap.add_argument("--body-file", required=True)
    ap.add_argument("--max", type=int, default=0)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    fichero, campo_clase, validos, tope = SECCIONES[a.tipo]
    fichero = os.path.join(REPO, fichero)
    if a.max:
        tope = a.max

    c = campos_del_issue(io.open(a.body_file, encoding="utf-8").read())
    url = limpia_url(c.get("link") or c.get("url") or c.get("enlace") or "")
    doi = (c.get("doi") or "").strip()
    if not url and not doi:
        print("::error::el issue no trae ni enlace ni DOI")
        return 2

    clase = (c.get(campo_clase) or c.get("type") or c.get("kind") or
             c.get("status") or "").strip().lower()
    clase = clase if clase in validos else validos[0]

    titulo = c.get("title") or c.get("titulo") or ""
    texto = (c.get("what you want to say") or c.get("summary") or
             c.get("comment") or c.get("texto") or "")
    autor = c.get("author") or c.get("authors") or c.get("autor") or ""
    venue = c.get("venue") or c.get("journal") or ""
    fecha = (c.get("date") or "").strip()

    # Un DOI trae sus metadatos: no hace falta teclearlos
    if doi:
        m = doi_meta(doi)
        doi = m.get("doi", doi)
        titulo = titulo or m.get("title", "")
        venue = venue or m.get("venue", "")
        autor = autor or m.get("authors", "")
        fecha = fecha or m.get("year", "")

    if not texto and url:
        t, d = lee_og(url)
        texto = (d or t or "").strip()
        if not titulo and t:
            titulo = t.strip()
        # el og:title solo vale como autor si es corto; si no es el titular entero
        if not autor and t and d and len(t) <= 70 and a.tipo == "linkedin":
            autor = t.strip()

    if a.tipo == "linkedin" and not texto:
        print("::error::sin texto y la pagina no expone og:description; escribelo en el issue")
        return 3
    if a.tipo != "linkedin" and not titulo:
        print("::error::hace falta un titulo, o un DOI del que sacarlo")
        return 3

    if texto and len(texto) > 460:
        texto = texto[:457].rstrip() + "..."

    datos = {"updated": "", "items": []}
    if os.path.isfile(fichero):
        datos = json.load(io.open(fichero, encoding="utf-8"))
    items = datos.get("items", [])

    clave = doi or url
    if any((it.get("doi") or it.get("id") or it.get("url")) == clave for it in items):
        print("ya estaba: " + clave)
        return 0

    if a.tipo == "linkedin":
        nuevo = {"id": url, "type": clase,
                 "date": fecha or datetime.date.today().isoformat(),
                 "text": texto, "url": url, "author": autor}
    else:
        nuevo = {"title": titulo, campo_clase: clase,
                 "date": fecha or datetime.date.today().strftime("%Y-%m"),
                 "summary": texto, "venue": venue, "authors": autor}
        if doi:
            nuevo["doi"] = doi
        if url:
            nuevo["url"] = url
        nuevo = {k: v for k, v in nuevo.items() if v}

    items.insert(0, nuevo)
    datos["items"] = items[:tope]
    datos["updated"] = datetime.datetime.now(datetime.timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ")

    salida = json.dumps(datos, ensure_ascii=False, indent=2) + "\n"
    if a.dry_run:
        print(salida)
        return 0
    io.open(fichero, "w", encoding="utf-8", newline="\n").write(salida)
    print("anadido a %s (%s): %s" % (os.path.basename(fichero), clase, titulo or url))
    print("total en la seccion: %d" % len(datos["items"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
