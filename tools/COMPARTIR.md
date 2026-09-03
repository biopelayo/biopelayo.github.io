# Publicar en el carrusel de LinkedIn de la web

## Lo que LinkedIn deja hacer y lo que no

LinkedIn no publica la actividad de un perfil hacia fuera. No hay RSS desde 2013,
y leer tu propio feed por API necesita el permiso `r_member_social`, que solo se
concede a partners aprobados del Marketing Developer Platform. Los servicios que
prometen «tu feed de LinkedIn en tu web» lo hacen raspando la página, contra sus
condiciones y con la cuenta en riesgo.

Así que la web no puede tirar sola de tu actividad. Lo que sí puede es publicarse
en dos toques desde donde estés, sin abrir el portátil.

## Desde el móvil o desde cualquier navegador

1. Abre <https://github.com/biopelayo/biopelayo.github.io/issues/new?template=linkedin.yml>
2. Pega el enlace, elige el tipo y envía.

El resto es automático: una GitHub Action limpia los parámetros de seguimiento,
lee el título y la descripción públicos de esa página si no escribes texto,
añade la entrada a `data/linkedin.json`, hace commit y cierra el issue con el
enlace a la sección publicada. Tarda menos de un minuto en verse en la web.

Guarda ese enlace en la pantalla de inicio del móvil y es un icono más.

## Desde el escritorio, en un clic

Marcador con esta dirección, estando en el post que quieras compartir:

```
javascript:(function(){var u=encodeURIComponent(location.href),s=encodeURIComponent((''+window.getSelection()).slice(0,400));window.open('https://github.com/biopelayo/biopelayo.github.io/issues/new?template=linkedin.yml&link='+u+'&what-you-want-to-say='+s,'_blank');})();
```

Coge la URL de la página y, si has seleccionado texto, lo lleva al campo del
comentario.

## Desde el portátil con el repo clonado

```bash
python tools/linkedin_add.py <url> --type repost --text "..."
```

Hace lo mismo y además el push, sin pasar por GitHub.

## Detalles

- **Campos.** Solo el enlace es obligatorio. Sin texto, se usa la descripción
  pública de la página. Sin fecha, la de hoy. El tipo cambia la etiqueta de la
  tarjeta: post, repost, comment, like o follow.
- **Duplicados.** Un enlace que ya esté en el carrusel no se añade otra vez; el
  issue te lo dice y queda abierto.
- **Tamaño.** El carrusel guarda las 12 entradas más recientes. La 13.ª empuja
  a la más antigua fuera.
- **Texto.** Se recorta a 460 caracteres para que las tarjetas no descuadren.
- **La sección se oculta sola** si `data/linkedin.json` se queda sin entradas.

## Dos requisitos, una sola vez

**1. Instalar la Action.** El workflow vive en `tools/github-workflow-linkedin.yml`
y hay que moverlo a su sitio. Un token OAuth no puede crear ficheros bajo
`.github/workflows/`, así que este paso lo tienes que dar tú:

```bash
mkdir -p .github/workflows && git mv tools/github-workflow-linkedin.yml .github/workflows/linkedin.yml && git commit -m "LinkedIn: instala la Action" && git push
```

Si el push también te lo rechaza, crea el fichero desde github.com (Add file →
Create new file, ruta `.github/workflows/linkedin.yml`) y pega ahí el contenido:
la web sí tiene permiso.

**2. Dar permiso de escritura.** En **Settings → Actions → General → Workflow
permissions** del repositorio, marcar **Read and write permissions**. Sin eso la
Action lee pero no puede escribir el commit, y el issue se queda sin publicar.
