/* Capa de video del fondo.

   Elige el peso segun la pantalla, respeta a quien pide menos movimiento o
   ahorro de datos, y deja de reproducir cuando la pestana no se ve. */
(function () {
  'use strict';
  var v = document.getElementById('cell-video');
  if (!v) return;

  var quieto = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var con = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var ahorro = !!(con && (con.saveData || /^([23]g|slow-2g)$/.test(con.effectiveType || '')));

  /* Con movimiento reducido o conexion limitada se queda el poster, que ya es
     un fotograma del bucle: se ve lo mismo sin descargar el video. */
  if (quieto || ahorro) return;

  function arranca() {
    var ancho = window.innerWidth || document.documentElement.clientWidth;
    v.src = ancho < 900 ? 'video/cell-720.mp4' : 'video/cell-1080.mp4';
    v.load();
    var intento = v.play();
    /* Si el navegador bloquea el autoplay, el poster se queda puesto. */
    if (intento && intento.catch) intento.catch(function () {});
  }

  /* Son 2,4 MB: van despues de lo que hace falta para leer la pagina. */
  if (document.readyState === 'complete') arranca();
  else window.addEventListener('load', arranca, {once: true});

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) v.pause();
    else v.play().catch(function () {});
  });
})();
