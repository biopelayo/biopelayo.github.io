# Publicar contenido en la web

Tres secciones se alimentan de un JSON y se actualizan abriendo un issue:
**LinkedIn**, **Manuscritos** e **Informes**. Cada una se oculta sola mientras su
JSON esté vacío, así que puedes dejarlas montadas y llenarlas cuando toque.

## Desde el móvil o desde cualquier navegador

| Sección | Enlace |
|---|---|
| LinkedIn | [abrir formulario](https://github.com/biopelayo/biopelayo.github.io/issues/new?template=linkedin.yml) |
| Manuscritos | [abrir formulario](https://github.com/biopelayo/biopelayo.github.io/issues/new?template=manuscript.yml) |
| Informes | [abrir formulario](https://github.com/biopelayo/biopelayo.github.io/issues/new?template=report.yml) |

Rellenas y envías. Una GitHub Action limpia los parámetros de seguimiento, añade
la entrada al JSON que toque, hace commit y cierra el issue con el enlace a lo
publicado. Menos de un minuto hasta verse.

Guarda los tres enlaces en la pantalla de inicio del móvil y son tres iconos.

## Qué pide cada sección

**Manuscritos.** Solo lo ya público: publicado, en revisión con DOI, o preprint
subido. **Con el DOI basta**: el título, la revista, los autores y el año salen
de Crossref. Sin DOI hace falta el título a mano.

**Informes.** Título, tipo (auditoría, benchmark, validación o informe técnico),
resumen y enlace. La fecha por defecto es el mes actual.

**LinkedIn.** Solo el enlace es obligatorio. Sin texto se usa la descripción
pública de la página.

## Desde el escritorio, en un clic

Marcador con esta dirección, estando en la página que quieras compartir:

```
javascript:(function(){var u=encodeURIComponent(location.href),s=encodeURIComponent((''+window.getSelection()).slice(0,400));window.open('https://github.com/biopelayo/biopelayo.github.io/issues/new?template=linkedin.yml&link='+u+'&what-you-want-to-say='+s,'_blank');})();
```

Coge la URL y, si has seleccionado texto, lo lleva al campo del comentario.

## Desde el portátil con el repo clonado

```bash
python tools/add_from_issue.py --tipo manuscript --body-file cuerpo.md --dry-run
```

O el de LinkedIn de siempre, que además hace el push:

```bash
python tools/linkedin_add.py <url> --type repost --text "..."
```

## Detalles

- **Duplicados.** Un DOI o un enlace que ya esté no se añade otra vez; el issue
  te lo dice y queda abierto.
- **Tamaño.** LinkedIn guarda 12 entradas; manuscritos e informes, 24.
- **Texto.** Los resúmenes se recortan a 460 caracteres para que las tarjetas no
  descuadren.
- **Sin datos, sin sección.** Si un JSON se queda sin entradas, esa sección
  desaparece de la página en vez de dejar un hueco.

## Dos requisitos, una sola vez

**1. Instalar la Action.** El workflow vive en `tools/github-workflow-contenido.yml`
y hay que moverlo a su sitio. Un token OAuth no puede crear ficheros bajo
`.github/workflows/`, así que este paso lo tienes que dar tú:

```bash
mkdir -p .github/workflows && git mv tools/github-workflow-contenido.yml .github/workflows/contenido.yml && git commit -m "Web: instala la Action de contenido" && git push
```

Si el push también te lo rechaza, crea el fichero desde github.com (Add file →
Create new file, ruta `.github/workflows/contenido.yml`) y pega ahí el contenido:
la web sí tiene permiso.

**2. Dar permiso de escritura.** En **Settings → Actions → General → Workflow
permissions** del repositorio, marcar **Read and write permissions**. Sin eso la
Action lee pero no puede escribir el commit.
