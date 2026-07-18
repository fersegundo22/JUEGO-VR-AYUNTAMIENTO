/* ================================================================
   LoGICA DEL JUEGO
   "Las Mujeres en la Administracion Publica Municipal" — VR A-Frame
   ----------------------------------------------------------------
   Responsabilidades de este archivo:
   1. Datos de las 5 misiones (problema + 3 opciones + retro).
   2. Construccion dinámica de las estaciones 3D en la escena.
   3. Narracion por voz (Web Speech API, sin archivos externos).
   4. Sonidos de acierto/error (Web Audio API, sin archivos externos).
   5. Puntuacion, barra de progreso (HUD 2D y HUD dentro del visor VR).
   6. Pantalla final con diploma personalizado.
   ================================================================ */

(function () {
  "use strict";

  /* ==============================================================
     1. DATOS DE LAS MISIONES
     Cada mision: título, problema, 3 opciones, índice de la
     respuesta correcta y una retroalimentacion educativa.
     ============================================================== */
  const MISIONES = [
    {
      titulo: "Mision 1: La Presidenta Municipal",
      problema:
        "El municipio necesita definir quien encabeza el gobierno local. " +
        "¿Que cargo puede ocupar una mujer como maxima autoridad del Ayuntamiento?",
      opciones: [
        "Presidenta Municipal",
        "Solo secretaria del alcalde",
        "Ninguno, es un cargo exclusivo para hombres",
      ],
      correcta: 0,
      retro:
        "¡Correcto! Las mujeres pueden ser Presidentas Municipales y dirigir el Ayuntamiento con plenos derechos.",
    },
    {
      titulo: "Mision 2: Paridad de genero",
      problema:
        "Se integrara el nuevo Cabildo. Segun el principio constitucional de " +
        "paridad de genero, ¿como deben conformarse las candidaturas?",
      opciones: [
        "Solo con hombres experimentados",
        "50% mujeres y 50% hombres",
        "Con quien decida el partido, sin reglas",
      ],
      correcta: 1,
      retro:
        "¡Muy bien! La paridad de genero exige igual numero de mujeres y hombres en las candidaturas y organos de gobierno.",
    },
    {
      titulo: "Mision 3: Las Regidoras",
      problema:
        "Una regidora propone mejorar el alumbrado publico. " +
        "¿Cual es la funcion principal de una regidora en el Cabildo?",
      opciones: [
        "Organizar unicamente eventos sociales",
        "Obedecer todas las decisiones sin opinar",
        "Vigilar, proponer y votar acuerdos para el municipio",
      ],
      correcta: 2,
      retro:
        "¡Exacto! Las regidoras analizan, proponen y votan los acuerdos que benefician a la comunidad.",
    },
    {
      titulo: "Mision 4: La Sindica Municipal",
      problema:
        "El Ayuntamiento enfrenta un asunto legal sobre un terreno publico. " +
        "¿Que papel juega la Sindica Municipal?",
      opciones: [
        "Representar legalmente al municipio y cuidar su patrimonio",
        "Cobrar los impuestos casa por casa",
        "Dirigir la policia municipal",
      ],
      correcta: 0,
      retro:
        "¡Correcto! La Sindica es la representante legal del Ayuntamiento y protege el patrimonio municipal.",
    },
    {
      titulo: "Mision 5: Participacion ciudadana",
      problema:
        "Una joven quiere participar en las decisiones de su comunidad. " +
        "¿Cual es el mejor camino para lograrlo?",
      opciones: [
        "Esperar a que otros decidan por ella",
        "Participar en consultas, comites y postularse a cargos publicos",
        "No involucrarse, la politica no es para mujeres",
      ],
      correcta: 1,
      retro:
        "¡Asi es! La participacion activa de las mujeres fortalece la democracia y la administracion municipal.",
    },
  ];

  const PUNTOS_POR_MISION = 20; // 5 misiones x 20 = 100 puntos
  const TOTAL_MISIONES = MISIONES.length;

  /* ==============================================================
     2. ESTADO DEL JUEGO
     ============================================================== */
  const estado = {
    nombre: "Participante",
    puntos: 0,
    completadas: 0,               // misiones ya respondidas
    respondida: new Array(TOTAL_MISIONES).fill(false),
    iniciado: false,
  };

  /* ==============================================================
     3. REFERENCIAS AL DOM (interfaz 2D)
     ============================================================== */
  const $ = (sel) => document.querySelector(sel);

  const ui = {
    intro: $("#pantalla-intro"),
    final: $("#pantalla-final"),
    hud: $("#hud"),
    puntosTexto: $("#puntos-texto"),
    barra: $("#barra-progreso"),
    barraEtiqueta: $("#barra-etiqueta"),
    btnComenzar: $("#btn-comenzar"),
    btnReiniciar: $("#btn-reiniciar"),
    inputNombre: $("#nombre-jugador"),
    diplomaNombre: $("#diploma-nombre"),
    diplomaPuntaje: $("#diploma-puntaje"),
    diplomaMensaje: $("#diploma-mensaje"),
    diplomaFecha: $("#diploma-fecha"),
  };

  /* ==============================================================
     4. NARRACIoN POR VOZ (Web Speech API)
     No requiere archivos de audio: usa la voz del sistema.
     ============================================================== */
  function narrar(texto) {
    if (!("speechSynthesis" in window)) return; // navegador sin soporte
    window.speechSynthesis.cancel(); // corta narraciones anteriores
    const voz = new SpeechSynthesisUtterance(texto);
    voz.lang = "es-MX";
    voz.rate = 0.95;
    voz.pitch = 1.05;
    window.speechSynthesis.speak(voz);
  }

  const TEXTO_INTRO =
    "Bienvenida y bienvenido al Ayuntamiento virtual. " +
    "En esta experiencia conoceras el papel de las mujeres en la administracion publica municipal. " +
    "Recorre la plaza, acercate a las cinco estaciones moradas y responde cada mision. " +
    "Cada respuesta correcta vale veinte puntos. " +
    "En computadora, camina con las teclas W A S D y elige las respuestas con doble clic. " +
    "En celular, toca dos veces la opcion que quieras elegir. " +
    "Con visor de realidad virtual, coloca el circulo amarillo sobre la respuesta y manten la mirada fija durante tres segundos. " +
    "Marlene Pineda García te desea ¡Mucho exito!, al final obtendras un diploma personalizado. ";

  /* ==============================================================
     5. EFECTOS DE SONIDO (Web Audio API)
     Genera tonos de acierto/error sin archivos externos.
     ============================================================== */
  let audioCtx = null;

  function tono(frecuencia, duracion, tipo, retardo) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gan = audioCtx.createGain();
      osc.type = tipo;
      osc.frequency.value = frecuencia;
      gan.gain.setValueAtTime(0.18, audioCtx.currentTime + retardo);
      gan.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + retardo + duracion);
      osc.connect(gan).connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + retardo);
      osc.stop(audioCtx.currentTime + retardo + duracion);
    } catch (e) {
      /* audio no disponible: continuar en silencio */
    }
  }

  const sonidoAcierto = () => { tono(523, 0.15, "sine", 0); tono(659, 0.15, "sine", 0.12); tono(784, 0.25, "sine", 0.24); };
  const sonidoError = () => { tono(220, 0.25, "sawtooth", 0); tono(180, 0.3, "sawtooth", 0.2); };

  /* ==============================================================
     6. CONSTRUCCIoN DE LAS ESTACIONES 3D
     Cada estacion <a-entity class="estacion"> del HTML se llena
     aquí con: pedestal, marcador flotante y panel de pregunta.
     ============================================================== */
  function crearEstaciones() {
    document.querySelectorAll(".estacion").forEach((estacion) => {
      const idx = parseInt(estacion.dataset.mision, 10);
      const mision = MISIONES[idx];

      /* ---- Círculo en el piso ---- */
      const circulo = document.createElement("a-ring");
      circulo.setAttribute("rotation", "-90 0 0");
      circulo.setAttribute("position", "0 0.02 0");
      circulo.setAttribute("radius-inner", "0.55");
      circulo.setAttribute("radius-outer", "0.7");
      circulo.setAttribute("color", "#7a1f9e");
      estacion.appendChild(circulo);

      /* ---- Marcador flotante con numero de mision ---- */
      const marcador = document.createElement("a-octahedron");
      marcador.setAttribute("position", "0 7 0");
      marcador.setAttribute("radius", "0.35");
      marcador.setAttribute("color", "#ffcc00");
      marcador.setAttribute(
        "animation",
        "property: rotation; to: 0 360 0; loop: true; dur: 4000; easing: linear"
      );
      marcador.classList.add("marcador");
      estacion.appendChild(marcador);

      const numero = document.createElement("a-text");
      numero.setAttribute("value", "Mision " + (idx + 1));
      numero.setAttribute("position", "0 7.7 0");
      numero.setAttribute("align", "center");
      numero.setAttribute("width", "6");
      numero.setAttribute("color", "#1c3f66");
      estacion.appendChild(numero);

      /* ---- Panel de la pregunta (oculto hasta acercarse) ---- */
      const panel = document.createElement("a-entity");
      panel.setAttribute("position", "0 3 -0.2");
      panel.setAttribute("visible", "false");
      panel.classList.add("panel");

      // Fondo del panel
      const fondo = document.createElement("a-plane");
      fondo.setAttribute("width", "10");
      fondo.setAttribute("height", "6.5");
      fondo.setAttribute("color", "#0d1526");
      fondo.setAttribute("opacity", "0.92");
      panel.appendChild(fondo);

      // Título de la mision
      const titulo = document.createElement("a-text");
      titulo.setAttribute("value", mision.titulo);
      titulo.setAttribute("position", "0 2.65 0.01");
      titulo.setAttribute("align", "center");
      titulo.setAttribute("width", "9");
      titulo.setAttribute("color", "#ffcc00");
      panel.appendChild(titulo);

      // Texto del problema
      const problema = document.createElement("a-text");
      problema.setAttribute("value", mision.problema);
      problema.setAttribute("position", "0 1.45 0.01");
      problema.setAttribute("align", "center");
      problema.setAttribute("width", "9");
      problema.setAttribute("wrap-count", "48");
      problema.setAttribute("color", "#ffffff");
      panel.appendChild(problema);

      // Las 3 opciones de respuesta (clicables por mirada o clic)
      mision.opciones.forEach((textoOpcion, i) => {
        const opcion = document.createElement("a-entity");
        opcion.setAttribute("mixin", "mixin-opcion");
        opcion.setAttribute("position", "0 " + (0.2 - i * 1.1) + " 0.02");
        opcion.setAttribute("text", "value", String.fromCharCode(65 + i) + ") " + textoOpcion);
        opcion.classList.add("clicable");
        opcion.dataset.mision = idx;
        opcion.dataset.opcion = i;

        // Resaltado al pasar la mirada / mouse
        opcion.addEventListener("mouseenter", function () {
          if (!estado.respondida[idx]) this.setAttribute("material", "color", "#3e7cb1");
        });
        opcion.addEventListener("mouseleave", function () {
          if (!estado.respondida[idx]) this.setAttribute("material", "color", "#1c3f66");
        });

        // Seleccion de respuesta (doble clic o cursor "fuse" de Cardboard)
        opcion.addEventListener("dblclick", function () {
          responder(idx, i, this, panel);
        });
        opcion.addEventListener("click", function () {
          responder(idx, i, this, panel);
        });

        panel.appendChild(opcion);
      });

      // Texto de retroalimentacion (se muestra tras responder)
      const retro = document.createElement("a-text");
      retro.setAttribute("value", "");
      retro.setAttribute("position", "0 -3.2 0.01");
      retro.setAttribute("align", "center");
      retro.setAttribute("width", "9");
      retro.setAttribute("wrap-count", "55");
      retro.setAttribute("color", "#7ee8a5");
      retro.classList.add("retro");
      panel.appendChild(retro);

      estacion.appendChild(panel);
    });
  }

  /* ==============================================================
     7. MOSTRAR PANELES POR PROXIMIDAD
     Comprueba cada 300 ms la distancia jugador-estacion:
     el panel solo aparece si el jugador está cerca (< 6 m).
     ============================================================== */
  function vigilarProximidad() {
    const rig = document.querySelector("#rig");
    setInterval(function () {
      if (!estado.iniciado) return;
      const posJugador = rig.object3D.position;

      document.querySelectorAll(".estacion").forEach(function (estacion) {
        const panel = estacion.querySelector(".panel");
        const posEstacion = estacion.object3D.position;
        const dx = posJugador.x - posEstacion.x;
        const dz = posJugador.z - posEstacion.z;
        const distancia = Math.sqrt(dx * dx + dz * dz);
        panel.setAttribute("visible", distancia < 6);
      });
    }, 300);
  }

  /* ==============================================================
     8. LoGICA DE RESPUESTA
     ============================================================== */
  function responder(idxMision, idxOpcion, elemOpcion, panel) {
    if (!estado.iniciado) return;
    if (estado.respondida[idxMision]) return; // ya contestada: ignorar

    const mision = MISIONES[idxMision];
    const esCorrecta = idxOpcion === mision.correcta;
    estado.respondida[idxMision] = true;
    estado.completadas++;

    const retro = panel.querySelector(".retro");

    if (esCorrecta) {
      // ---- ACIERTO: sumar puntos, sonido y retro positiva ----
      estado.puntos += PUNTOS_POR_MISION;
      elemOpcion.setAttribute("material", "color", "#28c76f");
      retro.setAttribute("color", "#7ee8a5");
      retro.setAttribute("value", "✔ +" + PUNTOS_POR_MISION + " puntos. " + mision.retro);
      sonidoAcierto();
      narrar("¡Correcto! " + mision.retro);
    } else {
      // ---- ERROR: marcar en rojo, mostrar la correcta ----
      elemOpcion.setAttribute("material", "color", "#d9534f");
      const correctaTexto = mision.opciones[mision.correcta];
      retro.setAttribute("color", "#ffb3ae");
      retro.setAttribute(
        "value",
        "✘ Incorrecto. La respuesta era: " + correctaTexto + ". " + mision.retro
      );
      sonidoError();
      narrar("Incorrecto. La respuesta correcta era: " + correctaTexto);

      // Resaltar en verde la opcion correcta
      panel.querySelectorAll(".clicable").forEach(function (op) {
        if (parseInt(op.dataset.opcion, 10) === mision.correcta) {
          op.setAttribute("material", "color", "#28c76f");
        }
      });
    }

    // Desactivar todas las opciones de esta mision
    panel.querySelectorAll(".clicable").forEach(function (op) {
      op.classList.remove("clicable");
    });

    // Apagar el marcador flotante (mision completada)
    const marcador = elemOpcion.closest(".estacion").querySelector(".marcador");
    if (marcador) marcador.setAttribute("color", "#888888");

    actualizarHUD();

    // ¿Se completaron las 5 misiones? -> pantalla final
    if (estado.completadas === TOTAL_MISIONES) {
      setTimeout(mostrarFinal, 4000); // pausa para leer la retro
    }
  }

  /* ==============================================================
     9. HUD: PUNTOS + BARRA DE PROGRESO (2D y dentro del visor)
     ============================================================== */
  function actualizarHUD() {
    const progreso = estado.completadas / TOTAL_MISIONES; // 0 → 1

    // HUD 2D (fuera del visor)
    ui.puntosTexto.textContent = estado.puntos;
    ui.barra.style.width = progreso * 100 + "%";
    ui.barraEtiqueta.textContent = "Mision " + estado.completadas + " / " + TOTAL_MISIONES;

    // HUD 3D (dentro del visor VR): barra crece de izquierda a derecha
    const barraVR = document.querySelector("#hud-vr-barra");
    const textoVR = document.querySelector("#hud-vr-texto");
    if (barraVR) {
      const ancho = 1.3 * progreso;
      const posX = -0.65 + ancho / 2;
      barraVR.setAttribute("width", ancho || 0.01);
      barraVR.setAttribute("position", posX + " 0 0.01");
    }
    if (textoVR) {
      textoVR.setAttribute(
        "value",
        "Puntos: " + estado.puntos + "  |  Mision " + estado.completadas + "/" + TOTAL_MISIONES
      );
    }
  }

  /* ==============================================================
     10. PANTALLA FINAL + DIPLOMA
     ============================================================== */
  function mostrarFinal() {
    // Salir del modo VR para poder ver el overlay 2D del diploma
    const escena = document.querySelector("#escena");
    if (escena && escena.is("vr-mode")) escena.exitVR();

    ui.diplomaNombre.textContent = estado.nombre;
    ui.diplomaPuntaje.textContent =
      "Puntuacion final: " + estado.puntos + " / " + TOTAL_MISIONES * PUNTOS_POR_MISION;

    // Mensaje segun desempeño
    let mensaje;
    if (estado.puntos === 100) mensaje = "¡Excelente! Dominas el tema a la perfeccion. 🏆";
    else if (estado.puntos >= 60) mensaje = "¡Muy buen trabajo! Sigue aprendiendo. 🌟";
    else mensaje = "¡Buen intento! Vuelve a jugar para mejorar tu puntuacion. 💪";
    ui.diplomaMensaje.textContent = mensaje;

    // Fecha del diploma
    ui.diplomaFecha.textContent =
      "Otorgado el " +
      new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

    ui.hud.classList.add("oculto");
    ui.final.classList.remove("oculto");

    narrar(
      "¡Felicidades " + estado.nombre + "! Has completado la experiencia con " +
      estado.puntos + " puntos. " + mensaje
    );
  }

  /* ==============================================================
     11. INICIO Y REINICIO
     ============================================================== */
  function comenzar() {
    const nombre = ui.inputNombre.value.trim();
    estado.nombre = nombre !== "" ? nombre : "Participante";
    estado.iniciado = true;

    ui.intro.classList.add("oculto");
    ui.hud.classList.remove("oculto");

    actualizarHUD();
    narrar(TEXTO_INTRO); // introduccion narrada
  }

  function reiniciar() {
    // Recarga la página: la forma más simple y segura de reiniciar la escena
    window.location.reload();
  }

  /* ==============================================================
     12. ARRANQUE
     ============================================================== */
  function iniciarJuego() {
    crearEstaciones();
    vigilarProximidad();
    ui.btnComenzar.addEventListener("click", comenzar);
    ui.btnReiniciar.addEventListener("click", reiniciar);
  }

  // Esperar a que la escena A-Frame este lista antes de construir
  const escena = document.querySelector("#escena");
  if (escena.hasLoaded) {
    iniciarJuego();
  } else {
    escena.addEventListener("loaded", iniciarJuego);
  }
})();
