// ========================================================
// CONTROL DEL TEMA (MODO CLARO / OSCURO)
// ========================================================

function alternarTema() {
  const esClaro = document.body.classList.toggle("light-mode");
  localStorage.setItem("truco_tema", esClaro ? "light" : "dark");
  actualizarControlesTema(esClaro);
}

function actualizarControlesTema(esClaro) {
  const iconEl = document.getElementById("theme-icon");
  const textEl = document.getElementById("theme-text");
  if (iconEl && textEl) {
    if (esClaro) {
      iconEl.innerText = "🌙";
      textEl.innerText = "Modo Oscuro";
    } else {
      iconEl.innerText = "☀️";
      textEl.innerText = "Modo Claro";
    }
  }
}

function cargarTema() {
  const tema = localStorage.getItem("truco_tema");
  if (tema === "light") {
    document.body.classList.add("light-mode");
    actualizarControlesTema(true);
  } else {
    document.body.classList.remove("light-mode");
    actualizarControlesTema(false);
  }
}



// ========================================================
// REGLAS Y JERARQUÍA DEL TRUCO CRIOLLO
// ========================================================
const PALOS = ["Espada", "Basto", "Oro", "Copa"];
const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

function calcularPoder(numero, palo) {
  if (numero === 1 && palo === "Espada") return 14;
  if (numero === 1 && palo === "Basto") return 13;
  if (numero === 7 && palo === "Espada") return 12;
  if (numero === 7 && palo === "Oro") return 11;
  if (numero === 3) return 10;
  if (numero === 2) return 9;
  if (numero === 1 && (palo === "Copa" || palo === "Oro")) return 8;
  if (numero === 12) return 7;
  if (numero === 11) return 6;
  if (numero === 10) return 5;
  if (numero === 7 && (palo === "Copa" || palo === "Basto")) return 4;
  if (numero === 6) return 3;
  if (numero === 5) return 2;
  if (numero === 4) return 1;
  return 0;
}

function valorEnvido(numero) {
  return numero >= 10 ? 0 : numero;
}

function calcularTanto(cartas) {
  const grupos = { Espada: [], Basto: [], Oro: [], Copa: [] };
  cartas.forEach(c => grupos[c.palo].push(c));

  let maxTanto = 0;
  for (const p in grupos) {
    const arr = grupos[p];
    if (arr.length >= 2) {
      arr.sort((a, b) => valorEnvido(b.numero) - valorEnvido(a.numero));
      const tanto = 20 + valorEnvido(arr[0].numero) + valorEnvido(arr[1].numero);
      if (tanto > maxTanto) maxTanto = tanto;
    }
  }
  if (maxTanto === 0) {
    maxTanto = Math.max(...cartas.map(c => valorEnvido(c.numero)));
  }
  return maxTanto;
}

class Carta {
  constructor(numero, palo) {
    this.numero = numero;
    this.palo = palo;
    this.poder = calcularPoder(numero, palo);
    this.nombre = `${numero} de ${palo}`;
    // Archivo con extensión .svg en minúsculas (ej: 1_espada.svg)
    this.archivo = `${numero}_${palo.toLowerCase()}.svg`;
  }

  crearElemento(revelada = true, interactiva = false, onClick = null) {
    const wrapper = document.createElement("div");
    wrapper.className = `card-wrapper ${!interactiva ? 'disabled' : ''}`;

    const img = document.createElement("img");
    img.className = "card-img";
    img.alt = revelada ? this.nombre : "Dorso";
    img.src = revelada ? `cartas/${this.archivo}` : `cartas/dorso.svg`;

    wrapper.appendChild(img);

    if (interactiva && onClick) {
      wrapper.onclick = onClick;
    }
    return wrapper;
  }
}

// ========================================================
// ESTADO Y PERSISTENCIA (LOCALSTORAGE)
// ========================================================
let scoreJugador = 0;
let scoreBot = 0;
let numeroMano = 0;
let manoInicialEsJugador = false;
let manoActualDe = "jugador";
let primerTiradorDeVuelta = "jugador";

let manoJugador = [];
let manoBot = [];
let originalesJugador = [];
let originalesBot = [];

let vueltaActual = 1;
let resultadosVueltas = [];
let cartasMesaHistorial = [];
let cartaMesaJugador = null;
let cartaMesaBot = null;
let manoTerminada = false;

let envidoFinalizado = false;
let historialEnvido = [];
let nivelTruco = 0;
let quienPoseeElQuiero = null;
let esperandoRespuesta = false;
let trucoPendiente = null;

let evaluandoVuelta = false;
let timerBot = null;
let partidoTerminado = false;

function programarTimerBot(callback, delay) {
  cancelarTimerBot();
  timerBot = setTimeout(() => {
    timerBot = null;
    callback();
  }, delay);
}

function cancelarTimerBot() {
  if (timerBot) {
    clearTimeout(timerBot);
    timerBot = null;
  }
}

// Elementos UI
const scoreJugadorEl = document.getElementById("score-jugador");
const scoreBotEl = document.getElementById("score-bot");
const etapaJugadorEl = document.getElementById("etapa-jugador");
const etapaBotEl = document.getElementById("etapa-bot");
const infoManoEl = document.getElementById("info-mano");
const cartasJugadorEl = document.getElementById("cartas-jugador");
const cartasBotEl = document.getElementById("cartas-bot");
const slotJugadorEl = document.getElementById("slot-jugador");
const slotBotEl = document.getElementById("slot-bot");
const dialogEl = document.getElementById("game-dialog");
const botStatusEl = document.getElementById("bot-status");
const tantoInfoEl = document.getElementById("tanto-info");

const panelAcciones = document.getElementById("panel-acciones");
const panelRespuesta = document.getElementById("panel-respuesta");
const respuestaPreguntaEl = document.getElementById("respuesta-pregunta");
const botonesRespuestaEl = document.getElementById("botones-respuesta");

const btnEnvido = document.getElementById("btn-envido");
const btnRealEnvido = document.getElementById("btn-real-envido");
const btnFaltaEnvido = document.getElementById("btn-falta-envido");
const btnCantoTruco = document.getElementById("btn-canto-truco");
const btnIrse = document.getElementById("btn-irse");
const btnSiguiente = document.getElementById("btn-siguiente");
const btnNuevaPartida = document.getElementById("btn-nueva-partida");

const listaBitacoraEl = document.getElementById("lista-bitacora");
const totalEntradasEl = document.getElementById("total-entradas");
let contadorJugadas = 0;

// Guarda el estado completo de la partida y de la mano actual
function guardarEstadoCompleto() {
  const estado = {
    scoreJugador,
    scoreBot,
    numeroMano,
    manoInicialEsJugador,
    manoActualDe,
    primerTiradorDeVuelta,
    vueltaActual,
    resultadosVueltas,
    manoTerminada,
    partidoTerminado,
    envidoFinalizado,
    historialEnvido,
    nivelTruco,
    quienPoseeElQuiero,
    trucoPendiente,
    cartasMesaHistorial: cartasMesaHistorial.map(c => ({
      quien: c.quien,
      vuelta: c.vuelta,
      numero: c.carta.numero,
      palo: c.carta.palo
    })),
    manoJugador: manoJugador.map(c => ({ numero: c.numero, palo: c.palo })),
    manoBot: manoBot.map(c => ({ numero: c.numero, palo: c.palo })),
    originalesJugador: originalesJugador.map(c => ({ numero: c.numero, palo: c.palo })),
    originalesBot: originalesBot.map(c => ({ numero: c.numero, palo: c.palo })),
    cartaMesaJugador: cartaMesaJugador ? { numero: cartaMesaJugador.numero, palo: cartaMesaJugador.palo } : null,
    cartaMesaBot: cartaMesaBot ? { numero: cartaMesaBot.numero, palo: cartaMesaBot.palo } : null,
    bitacoraHTML: listaBitacoraEl.innerHTML,
    contadorJugadas,
    mensajeDialogo: dialogEl.innerText
  };

  localStorage.setItem("truco_estado_partido", JSON.stringify(estado));
}

// Recupera la mano exacta al recargar
function recuperarEstadoCompleto() {
  const guardado = localStorage.getItem("truco_estado_partido");
  if (!guardado) return false;

  try {
    const st = JSON.parse(guardado);
    if (!st.manoJugador || st.manoJugador.length === 0) return false;

    scoreJugador = st.scoreJugador || 0;
    scoreBot = st.scoreBot || 0;
    numeroMano = st.numeroMano || 0;
    manoInicialEsJugador = st.manoInicialEsJugador;
    manoActualDe = st.manoActualDe;
    primerTiradorDeVuelta = st.primerTiradorDeVuelta;
    vueltaActual = st.vueltaActual;
    resultadosVueltas = st.resultadosVueltas || [];
    manoTerminada = st.manoTerminada;
    partidoTerminado = st.partidoTerminado || (scoreJugador >= 30 || scoreBot >= 30);
    envidoFinalizado = st.envidoFinalizado;
    historialEnvido = st.historialEnvido || [];
    nivelTruco = st.nivelTruco || 0;
    quienPoseeElQuiero = st.quienPoseeElQuiero;
    trucoPendiente = st.trucoPendiente || null;

    manoJugador = st.manoJugador.map(c => new Carta(c.numero, c.palo));
    manoBot = st.manoBot.map(c => new Carta(c.numero, c.palo));
    originalesJugador = st.originalesJugador.map(c => new Carta(c.numero, c.palo));
    originalesBot = st.originalesBot.map(c => new Carta(c.numero, c.palo));

    cartaMesaJugador = st.cartaMesaJugador ? new Carta(st.cartaMesaJugador.numero, st.cartaMesaJugador.palo) : null;
    cartaMesaBot = st.cartaMesaBot ? new Carta(st.cartaMesaBot.numero, st.cartaMesaBot.palo) : null;

    cartasMesaHistorial = (st.cartasMesaHistorial || []).map(item => ({
      quien: item.quien,
      vuelta: item.vuelta,
      carta: new Carta(item.numero, item.palo)
    }));

    contadorJugadas = st.contadorJugadas || 0;
    totalEntradasEl.innerText = `${contadorJugadas} jugada${contadorJugadas > 1 ? 's' : ''}`;
    listaBitacoraEl.innerHTML = st.bitacoraHTML || "";
    dialogEl.innerText = st.mensajeDialogo || "¡Partida reanudada!";

    return true;
  } catch (e) {
    console.error("Error al restaurar partida guardada", e);
    return false;
  }
}

function reiniciarPartidoCompleto(sinConfirmar = false) {
  if (sinConfirmar || confirm("¿Deseas reiniciar todo el partido a 0 y repartir una nueva mano?")) {
    cancelarTimerBot();
    localStorage.removeItem("truco_estado_partido");

    scoreJugador = 0;
    scoreBot = 0;
    numeroMano = 0;
    manoInicialEsJugador = false;
    partidoTerminado = false;
    trucoPendiente = null;
    listaBitacoraEl.innerHTML = "";
    contadorJugadas = 0;
    totalEntradasEl.innerText = "0 jugadas";

    if (btnNuevaPartida) btnNuevaPartida.classList.add("hidden");
    iniciarNuevaMano(true);
  }
}

function registrarBitacora(tag, texto, claseTag = "tag-mano") {
  contadorJugadas++;
  totalEntradasEl.innerText = `${contadorJugadas} jugada${contadorJugadas > 1 ? 's' : ''}`;

  const ahora = new Date();
  const timeStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:${String(ahora.getSeconds()).padStart(2, '0')}`;

  const entry = document.createElement("div");
  entry.className = "b-entry";
  entry.innerHTML = `
    <span class="b-tag ${claseTag}">${tag}</span>
    <span class="b-text">${texto}</span>
    <span class="b-time">${timeStr}</span>
  `;

  listaBitacoraEl.appendChild(entry);
  listaBitacoraEl.scrollTop = listaBitacoraEl.scrollHeight;
  guardarEstadoCompleto();
}

function log(msg) { 
  dialogEl.innerText = msg; 
  guardarEstadoCompleto();
}

function crearMazo() {
  const mazo = [];
  for (const p of PALOS) {
    for (const n of NUMEROS) mazo.push(new Carta(n, p));
  }
  return mazo.sort(() => Math.random() - 0.5);
}

function actualizarMarcador() {
  scoreJugadorEl.innerText = scoreJugador;
  scoreBotEl.innerText = scoreBot;

  etapaJugadorEl.innerText = scoreJugador < 15 ? "Malas" : "Buenas";
  etapaBotEl.innerText = scoreBot < 15 ? "Malas" : "Buenas";

  guardarEstadoCompleto();

  if (scoreJugador >= 30 && !partidoTerminado) {
    partidoTerminado = true;
    log("🏆 ¡GANASTE EL PARTIDO A 30 PUNTOS!");
    registrarBitacora("CAMPEÓN", "<strong>🎉 ¡Ganaste el partido!</strong> Has alcanzado 30 puntos.", "tag-gana");
    terminarMano();
  } else if (scoreBot >= 30 && !partidoTerminado) {
    partidoTerminado = true;
    log("💀 El rival ganó el partido.");
    registrarBitacora("DERROTA", "<strong>💀 El rival alcanzó los 30 puntos</strong> y ganó el partido.", "tag-pierde");
    terminarMano();
  }
}

// ========================================================
// CONTROL DE MANOS Y REANUDACIÓN
// ========================================================

function iniciarNuevaMano(forzarNueva = false) {
  if (scoreJugador >= 30 || scoreBot >= 30) {
    partidoTerminado = true;
    terminarMano();
    return;
  }

  cancelarTimerBot();

  btnSiguiente.classList.add("hidden");
  if (btnNuevaPartida) btnNuevaPartida.classList.add("hidden");

  numeroMano++;
  manoInicialEsJugador = !manoInicialEsJugador;
  manoActualDe = manoInicialEsJugador ? "jugador" : "bot";
  primerTiradorDeVuelta = manoActualDe;

  const quienSale = manoInicialEsJugador ? "Tú eres mano (sales primero)" : "Rival es mano (sale primero)";
  infoManoEl.innerText = `Mano ${numeroMano}: ${quienSale}`;

  const mazo = crearMazo();
  manoJugador = [mazo.pop(), mazo.pop(), mazo.pop()];
  manoBot = [mazo.pop(), mazo.pop(), mazo.pop()];
  originalesJugador = [...manoJugador];
  originalesBot = [...manoBot];

  vueltaActual = 1;
  resultadosVueltas = [];
  cartasMesaHistorial = [];
  cartaMesaJugador = null;
  cartaMesaBot = null;
  manoTerminada = false;
  evaluandoVuelta = false;

  envidoFinalizado = false;
  historialEnvido = [];

  nivelTruco = 0;
  quienPoseeElQuiero = null;
  esperandoRespuesta = false;
  trucoPendiente = null;

  limpiarMesa();
  actualizarMarcador();

  panelRespuesta.classList.add("hidden");
  panelAcciones.classList.remove("hidden");

  actualizarBotonesEnvido();
  btnIrse.disabled = false;
  actualizarBotonTruco();

  const miTanto = calcularTanto(manoJugador);
  tantoInfoEl.innerText = `Tu Tanto: ${miTanto}`;
  botStatusEl.innerText = "Esperando...";
  renderizarCartas();

  registrarBitacora(
    `MANO ${numeroMano}`,
    `Nueva mano repartida. ${quienSale}. Tu tanto: <strong>${miTanto}</strong>. Marcador: Tú <strong>${scoreJugador}</strong> - Rival <strong>${scoreBot}</strong>.`,
    "tag-mano"
  );

  guardarEstadoCompleto();

  if (manoActualDe === "jugador") {
    log("¡Sos mano! Podés cantar Envido o jugar tu carta.");
  } else {
    log("El rival es mano. Aguardá su jugada...");
    programarTimerBot(turnoDelBot, 1100);
  }
}

function reanudarManoExistente() {
  cancelarTimerBot();

  const quienSale = manoInicialEsJugador ? "Tú eres mano" : "Rival es mano";
  infoManoEl.innerText = `Mano ${numeroMano}: ${quienSale}`;

  actualizarMarcador();

  limpiarMesa();
  cartasMesaHistorial.forEach(item => {
    const slot = item.quien === "jugador" ? slotJugadorEl : slotBotEl;
    colocarCartaEnMesaVisual(item.carta, slot, item.vuelta);
  });

  const miTanto = calcularTanto(originalesJugador);
  tantoInfoEl.innerText = `Tu Tanto: ${miTanto}`;

  if (scoreJugador >= 30 || scoreBot >= 30) {
    partidoTerminado = true;
    terminarMano();
  } else if (manoTerminada) {
    terminarMano();
  } else {
    actualizarBotonesEnvido();
    btnIrse.disabled = false;
    actualizarBotonTruco();
    renderizarCartas();

    if (manoActualDe === "bot" && !evaluandoVuelta) {
      log("Turno del rival. Aguardá su jugada...");
      programarTimerBot(turnoDelBot, 1000);
    } else {
      renderizarCartas();
    }
  }
}

function limpiarMesa() {
  slotJugadorEl.innerHTML = '<span class="slot-placeholder">Tu Carta</span>';
  slotBotEl.innerHTML = '<span class="slot-placeholder">Carta Rival</span>';
}

function colocarCartaEnMesaVisual(carta, slotEl, numVuelta) {
  const placeholder = slotEl.querySelector(".slot-placeholder");
  if (placeholder) placeholder.remove();

  const el = carta.crearElemento(true, false);
  el.classList.add("table-card", `table-card-v${numVuelta}`);
  slotEl.appendChild(el);
}

function colocarCartaEnMesa(carta, slotEl, numVuelta, quien) {
  colocarCartaEnMesaVisual(carta, slotEl, numVuelta);
  cartasMesaHistorial.push({ quien, carta, vuelta: numVuelta });
  guardarEstadoCompleto();
}

function renderizarCartas() {
  cartasBotEl.innerHTML = "";
  manoBot.forEach(() => {
    cartasBotEl.appendChild(new Carta(1, "Oro").crearElemento(false));
  });

  cartasJugadorEl.innerHTML = "";
  const puedoJugar = (manoActualDe === "jugador") && !manoTerminada && !esperandoRespuesta && !evaluandoVuelta && !partidoTerminado;

  manoJugador.forEach((carta, index) => {
    const el = carta.crearElemento(true, puedoJugar, () => jugarCartaJugador(index));
    cartasJugadorEl.appendChild(el);
  });

  actualizarBotonesEnvido();
}

function actualizarBotonesEnvido() {
  const puedeCantar = !envidoFinalizado &&
    vueltaActual === 1 &&
    !manoTerminada &&
    !partidoTerminado &&
    !esperandoRespuesta &&
    !evaluandoVuelta &&
    nivelTruco === 0 &&
    manoJugador.length === 3 &&
    (manoActualDe === "jugador" || cartaMesaBot !== null);

  btnEnvido.disabled = !puedeCantar;
  btnRealEnvido.disabled = !puedeCantar;
  btnFaltaEnvido.disabled = !puedeCantar;
}

function habilitarBotonesEnvido(habilitar) {
  if (!habilitar) {
    btnEnvido.disabled = true;
    btnRealEnvido.disabled = true;
    btnFaltaEnvido.disabled = true;
  } else {
    actualizarBotonesEnvido();
  }
}

function actualizarBotonTruco() {
  if (manoTerminada || esperandoRespuesta || evaluandoVuelta) {
    btnCantoTruco.disabled = true;
    return;
  }

  const esMiTurno = (manoActualDe === "jugador");

  if (nivelTruco === 0) {
    btnCantoTruco.innerText = "Truco";
    btnCantoTruco.disabled = !esMiTurno;
  } else if (nivelTruco === 1) {
    btnCantoTruco.innerText = "Retruco";
    btnCantoTruco.disabled = !esMiTurno || (quienPoseeElQuiero !== "jugador");
  } else if (nivelTruco === 2) {
    btnCantoTruco.innerText = "Vale 4";
    btnCantoTruco.disabled = !esMiTurno || (quienPoseeElQuiero !== "jugador");
  } else {
    btnCantoTruco.innerText = "Vale 4";
    btnCantoTruco.disabled = true;
  }
}

function puntosPorNivelTruco(nivel) {
  if (nivel === 1) return 2;
  if (nivel === 2) return 3;
  if (nivel === 3) return 4;
  return 1;
}

// ========================================================
// ENVIDO / REAL ENVIDO / FALTA ENVIDO
// ========================================================

function puntosEnvidoQuerido(historial) {
  let puntos = 0;
  for (const c of historial) {
    if (c === "envido") puntos += 2;
    else if (c === "real-envido") puntos += 3;
    else if (c === "falta-envido") return "falta";
  }
  return puntos;
}

function puntosEnvidoNoQuerido(historial) {
  if (historial.length === 1) return 1;
  const sinUltimo = historial.slice(0, -1);
  return puntosEnvidoQuerido(sinUltimo);
}

function cantarEnvido(tipo, quien = "jugador") {
  if (envidoFinalizado || vueltaActual > 1 || evaluandoVuelta || manoTerminada || partidoTerminado || (nivelTruco > 0 && !trucoPendiente)) return;
  if (quien === "jugador") {
    if (manoJugador.length < 3) return;
    if (!trucoPendiente && manoActualDe === "bot" && !cartaMesaBot) return;
  }

  cancelarTimerBot();
  habilitarBotonesEnvido(false);
  historialEnvido.push(tipo);

  const nombres = { "envido": "¡ENVIDO!", "real-envido": "¡REAL ENVIDO!", "falta-envido": "¡FALTA ENVIDO!" };
  const grito = nombres[tipo] || tipo;

  if (quien === "jugador") {
    const esRespuestaTruco = (trucoPendiente && trucoPendiente.quienCanto === "bot");
    if (!esRespuestaTruco) {
      log(`Gritaste: ${grito}`);
      registrarBitacora("CANTO", `<strong>Tú</strong> cantaste <strong>${grito}</strong>`, "tag-envido");
    }
    botStatusEl.innerText = "Pensando...";
    programarTimerBot(() => botEvaluaRespuestaEnvido(tipo), 900);
  } else {
    botStatusEl.innerText = grito;
    log(`El rival gritó: ${grito}`);
    registrarBitacora("CANTO", `<strong>Rival</strong> cantó <strong>${grito}</strong>`, "tag-envido");
    mostrarDialogoRespuestaEnvido(tipo);
  }
  guardarEstadoCompleto();
}

function mostrarDialogoRespuestaEnvido(ultimoCanto) {
  esperandoRespuesta = true;
  panelAcciones.classList.add("hidden");
  panelRespuesta.classList.remove("hidden");
  respuestaPreguntaEl.innerText = `Rival canta: ${ultimoCanto.toUpperCase().replace("-", " ")}`;
  botonesRespuestaEl.innerHTML = "";

  const bQuiero = document.createElement("button");
  bQuiero.type = "button";
  bQuiero.className = "action-btn success";
  bQuiero.innerText = "¡QUIERO!";
  bQuiero.onclick = () => resolverEnvidoFinal(true, "jugador");
  botonesRespuestaEl.appendChild(bQuiero);

  const bNoQuiero = document.createElement("button");
  bNoQuiero.type = "button";
  bNoQuiero.className = "action-btn danger";
  bNoQuiero.innerText = "¡NO QUIERO!";
  bNoQuiero.onclick = () => resolverEnvidoFinal(false, "jugador");
  botonesRespuestaEl.appendChild(bNoQuiero);

  if (ultimoCanto === "envido") {
    const bReal = document.createElement("button");
    bReal.type = "button";
    bReal.className = "action-btn raise";
    bReal.innerText = "¡Real Envido!";
    bReal.onclick = () => { panelRespuesta.classList.add("hidden"); cantarEnvido("real-envido", "jugador"); };
    botonesRespuestaEl.appendChild(bReal);
  }

  if (ultimoCanto === "envido" || ultimoCanto === "real-envido") {
    const bFalta = document.createElement("button");
    bFalta.type = "button";
    bFalta.className = "action-btn raise";
    bFalta.innerText = "¡Falta Envido!";
    bFalta.onclick = () => { panelRespuesta.classList.add("hidden"); cantarEnvido("falta-envido", "jugador"); };
    botonesRespuestaEl.appendChild(bFalta);
  }
  renderizarCartas();
  guardarEstadoCompleto();
}

function botEvaluaRespuestaEnvido(ultimoCanto) {
  const tantoB = calcularTanto(originalesBot);
  const prob = Math.random();
  const soyMano = (manoInicialEsJugador === false);

  // Redoblar apuesta con Real Envido o Falta Envido
  if (ultimoCanto === "envido") {
    if (tantoB >= 31 && prob < 0.70) {
      cantarEnvido("falta-envido", "bot");
      return;
    }
    if (tantoB >= 29 && prob < 0.55) {
      cantarEnvido("real-envido", "bot");
      return;
    }
    // Farol ocasional de subida
    if (tantoB < 25 && prob < 0.07) {
      cantarEnvido("real-envido", "bot");
      return;
    }
  } else if (ultimoCanto === "real-envido") {
    if (tantoB >= 31 && prob < 0.60) {
      cantarEnvido("falta-envido", "bot");
      return;
    }
  }

  // Aceptar o Rechazar el Envido
  let acepta = false;
  if (ultimoCanto === "falta-envido") {
    acepta = tantoB >= 31 || (tantoB >= 30 && soyMano) || (tantoB >= 29 && prob < 0.10);
  } else if (ultimoCanto === "real-envido") {
    acepta = tantoB >= 29 || (tantoB >= 28 && soyMano) || (tantoB >= 26 && prob < 0.18);
  } else {
    acepta = tantoB >= 27 || (tantoB >= 26 && soyMano) || (tantoB >= 24 && prob < 0.15);
  }

  resolverEnvidoFinal(acepta, "bot");
}

function resolverEnvidoFinal(acepta, quienRespondio) {
  esperandoRespuesta = false;
  panelRespuesta.classList.add("hidden");
  panelAcciones.classList.remove("hidden");
  envidoFinalizado = true;

  if (acepta) {
    const tantoJ = calcularTanto(originalesJugador);
    const tantoB = calcularTanto(originalesBot);
    let ganador = "";

    if (tantoJ > tantoB) ganador = "jugador";
    else if (tantoB > tantoJ) ganador = "bot";
    else ganador = manoInicialEsJugador ? "jugador" : "bot";

    let puntos = puntosEnvidoQuerido(historialEnvido);
    if (puntos === "falta") {
      const enBuenas = scoreJugador >= 15 || scoreBot >= 15;
      const maxScore = Math.max(scoreJugador, scoreBot);
      puntos = enBuenas ? Math.max(1, 30 - maxScore) : Math.max(1, 15 - maxScore);
    }

    if (ganador === "jugador") {
      scoreJugador = Math.min(30, scoreJugador + puntos);
      log(`¡Quiero aceptado! Tenés ${tantoJ} vs ${tantoB}. Ganaste el Envido (+${puntos} pts).`);
      registrarBitacora("ENVIDO", `<strong>Ganaste el envido</strong>: Tus ${tantoJ} vs ${tantoB} del rival. (+${puntos} pts)`, "tag-gana");
    } else {
      scoreBot = Math.min(30, scoreBot + puntos);
      log(`¡Quiero aceptado! El rival tiene ${tantoB} vs tus ${tantoJ}. Rival gana el Envido (+${puntos} pts).`);
      registrarBitacora("ENVIDO", `<strong>Rival gana el envido</strong>: Sus ${tantoB} vs tus ${tantoJ}. (+${puntos} pts)`, "tag-pierde");
    }
  } else {
    const puntos = puntosEnvidoNoQuerido(historialEnvido);
    if (quienRespondio === "bot") {
      scoreJugador = Math.min(30, scoreJugador + puntos);
      botStatusEl.innerText = "NO QUIERO";
      log(`El rival dijo ¡No quiero! Te llevás ${puntos} pt${puntos > 1 ? 's' : ''}.`);
      registrarBitacora("ENVIDO", `Rival dijo <strong>¡No quiero!</strong> Te llevas +${puntos} pt(s).`, "tag-gana");
    } else {
      scoreBot = Math.min(30, scoreBot + puntos);
      log(`Dijiste ¡No quiero! El rival suma ${puntos} pt${puntos > 1 ? 's' : ''}.`);
      registrarBitacora("ENVIDO", `Dijiste <strong>¡No quiero!</strong> El rival suma +${puntos} pt(s).`, "tag-pierde");
    }
  }

  actualizarMarcador();
  if (scoreJugador >= 30 || scoreBot >= 30) {
    trucoPendiente = null;
    return;
  }

  // Si había un Truco pendiente porque se cantó "El envido está primero"
  if (trucoPendiente) {
    const pend = trucoPendiente;
    trucoPendiente = null;
    envidoFinalizado = true;

    if (pend.quienCanto === "bot") {
      panelAcciones.classList.add("hidden");
      log("Envido resuelto. Ahora debes responder al TRUCO del rival...");
      programarTimerBot(() => {
        botCantaTruco(pend.nivel, true);
      }, 1000);
      return;
    } else if (pend.quienCanto === "jugador") {
      log("Envido resuelto. El rival ahora evalúa tu TRUCO...");
      programarTimerBot(() => {
        botEvaluaTruco(pend.nivel);
      }, 1000);
      return;
    }
  }

  actualizarBotonTruco();
  actualizarBotonesEnvido();
  renderizarCartas();
  guardarEstadoCompleto();

  if (!cartaMesaBot && manoActualDe === "bot" && !manoTerminada) {
    programarTimerBot(ejecutarTiradaBot, 900);
  }
}

// ========================================================
// TRUCO / RETRUCO / VALE 4
// ========================================================

function cantarAccionTruco() {
  if (manoTerminada || evaluandoVuelta || esperandoRespuesta || partidoTerminado) return;
  cancelarTimerBot();

  habilitarBotonesEnvido(false);

  const nuevoNivel = nivelTruco + 1;
  const textos = ["", "¡TRUCO!", "¡RETRUCO!", "¡VALE CUATRO!"];
  log(`Gritaste: ${textos[nuevoNivel]}`);
  registrarBitacora("CANTO", `<strong>Tú</strong> cantaste <strong>${textos[nuevoNivel]}</strong>`, "tag-truco");
  btnCantoTruco.disabled = true;

  botStatusEl.innerText = "Pensando...";
  guardarEstadoCompleto();
  programarTimerBot(() => botEvaluaTruco(nuevoNivel), 900);
}

function botEvaluaTruco(nuevoNivel) {
  const poderes = manoBot.map(c => c.poder).sort((a, b) => b - a);
  const maxPoder = poderes[0] || 0;
  const segundoPoder = poderes[1] || 0;
  const bluff = Math.random();

  // 1. Si es Truco (nivel 1), en primera vuelta, antes de tirar carta y sin haber jugado envido:
  // El rival tiene derecho a cantar "¡El envido está primero!" si tiene buen tanto
  if (nuevoNivel === 1 && !envidoFinalizado && vueltaActual === 1 && manoBot.length === 3) {
    const tantoB = calcularTanto(originalesBot);
    if (tantoB >= 26 || (tantoB >= 23 && bluff > 0.65)) {
      trucoPendiente = { nivel: nuevoNivel, quienCanto: "jugador" };
      log("El rival responde: ¡El envido está primero!");
      registrarBitacora("CANTO", "Rival dijo: <strong>¡El envido está primero!</strong>", "tag-envido");
      cantarEnvido(tantoB >= 31 ? "real-envido" : "envido", "bot");
      return;
    }
  }

  // 2. Redoblar con Retruco o Vale 4
  if (nuevoNivel === 1) {
    const tieneMonstruo = maxPoder >= 13 || (maxPoder >= 11 && segundoPoder >= 9);
    if (tieneMonstruo && bluff < 0.60) {
      nivelTruco = 1;
      botCantaTruco(2);
      return;
    }
    // Bluff ocasional de Retruco
    if (maxPoder >= 9 && bluff < 0.12) {
      nivelTruco = 1;
      botCantaTruco(2);
      return;
    }
  } else if (nuevoNivel === 2) {
    if (maxPoder >= 13 || (maxPoder >= 12 && vueltaActual === 3)) {
      nivelTruco = 2;
      botCantaTruco(3);
      return;
    }
  }

  // 3. Aceptar o Rechazar
  let acepta = false;
  if (nuevoNivel === 1) {
    if (vueltaActual === 1) {
      // En vuelta 1: acepta con carta fuerte (>= 10) o dos medianas (>= 8), o bluff medido (18%)
      acepta = maxPoder >= 10 || (maxPoder >= 8 && segundoPoder >= 7) || bluff < 0.18;
    } else {
      const ganoPrimera = resultadosVueltas[0] === "bot";
      if (ganoPrimera) {
        acepta = maxPoder >= 7 || bluff < 0.22;
      } else {
        acepta = maxPoder >= 10 || bluff < 0.10;
      }
    }
  } else if (nuevoNivel === 2) {
    acepta = maxPoder >= 11 || (maxPoder >= 9 && vueltaActual === 3) || bluff < 0.14;
  } else if (nuevoNivel === 3) {
    acepta = maxPoder >= 12 || bluff < 0.08;
  }

  if (acepta) {
    nivelTruco = nuevoNivel;
    quienPoseeElQuiero = "bot";
    envidoFinalizado = true;
    habilitarBotonesEnvido(false);
    botStatusEl.innerText = "¡QUIERO!";
    const pts = puntosPorNivelTruco(nivelTruco);

    registrarBitacora("TRUCO", `Rival dijo <strong>¡QUIERO!</strong> En juego por <strong>${pts} puntos</strong>.`, "tag-truco");
    actualizarBotonTruco();
    renderizarCartas();
    guardarEstadoCompleto();

    if (manoActualDe === "bot") {
      log(`El rival dijo ¡QUIERO! (Por ${pts} pts). Tira su carta...`);
      programarTimerBot(ejecutarTiradaBot, 900);
    } else {
      log(`El rival dijo ¡QUIERO! (Por ${pts} pts). Es tu turno.`);
    }
  } else {
    envidoFinalizado = true;
    const puntosOtorgados = nivelTruco === 0 ? 1 : puntosPorNivelTruco(nivelTruco);
    scoreJugador = Math.min(30, scoreJugador + puntosOtorgados);
    botStatusEl.innerText = "NO QUIERO";
    log(`El rival dijo ¡NO QUIERO! Te llevás ${puntosOtorgados} pt${puntosOtorgados > 1 ? 's' : ''}.`);
    registrarBitacora("TRUCO", `Rival dijo <strong>¡NO QUIERO!</strong> Te llevas <strong>+${puntosOtorgados} pt(s)</strong>.`, "tag-gana");
    actualizarMarcador();
    terminarMano();
  }
}

function botCantaTruco(nuevoNivel, esReanudacion = false) {
  cancelarTimerBot();
  esperandoRespuesta = true;
  habilitarBotonesEnvido(false);

  const puedeCantarEnvidoPrimero = (nuevoNivel === 1 && !envidoFinalizado && vueltaActual === 1 && manoJugador.length === 3);

  const nombres = ["", "¡TRUCO!", "¡RETRUCO!", "¡VALE CUATRO!"];
  const grito = nombres[nuevoNivel] || "¡TRUCO!";
  botStatusEl.innerText = grito;

  if (esReanudacion) {
    log(`Ahora debes responder al ${grito} del rival.`);
  } else {
    log(`El rival cantó: ${grito}`);
    registrarBitacora("CANTO", `<strong>Rival</strong> cantó <strong>${grito}</strong>`, "tag-truco");
  }

  panelAcciones.classList.add("hidden");
  panelRespuesta.classList.remove("hidden");
  respuestaPreguntaEl.innerText = esReanudacion ? `Responde al: ${grito}` : `Rival canta: ${grito}`;
  botonesRespuestaEl.innerHTML = "";

  const bQuiero = document.createElement("button");
  bQuiero.type = "button";
  bQuiero.className = "action-btn success";
  bQuiero.innerText = "¡QUIERO!";
  bQuiero.onclick = () => {
    esperandoRespuesta = false;
    envidoFinalizado = true;
    panelRespuesta.classList.add("hidden");
    panelAcciones.classList.remove("hidden");
    nivelTruco = nuevoNivel;
    quienPoseeElQuiero = "jugador";
    const pts = puntosPorNivelTruco(nivelTruco);
    log(`Aceptaste el ${grito}. En juego por ${pts} puntos.`);
    registrarBitacora("TRUCO", `Aceptaste el <strong>${grito}</strong> por <strong>${pts} puntos</strong>.`, "tag-truco");
    actualizarBotonTruco();
    renderizarCartas();
    guardarEstadoCompleto();

    if (manoActualDe === "bot" && !cartaMesaBot) {
      programarTimerBot(ejecutarTiradaBot, 900);
    }
  };
  botonesRespuestaEl.appendChild(bQuiero);

  const bNoQuiero = document.createElement("button");
  bNoQuiero.type = "button";
  bNoQuiero.className = "action-btn danger";
  bNoQuiero.innerText = "¡NO QUIERO!";
  bNoQuiero.onclick = () => {
    esperandoRespuesta = false;
    envidoFinalizado = true;
    panelRespuesta.classList.add("hidden");
    panelAcciones.classList.remove("hidden");
    const puntosOtorgados = nivelTruco === 0 ? 1 : puntosPorNivelTruco(nivelTruco);
    scoreBot = Math.min(30, scoreBot + puntosOtorgados);
    log(`Dijiste ¡No quiero! El rival suma ${puntosOtorgados} pt${puntosOtorgados > 1 ? 's' : ''}.`);
    registrarBitacora("TRUCO", `Dijiste <strong>¡No quiero!</strong> Rival suma <strong>+${puntosOtorgados} pt(s)</strong>.`, "tag-pierde");
    actualizarMarcador();
    terminarMano();
  };
  botonesRespuestaEl.appendChild(bNoQuiero);

  if (nuevoNivel === 1) {
    const bRetruco = document.createElement("button");
    bRetruco.type = "button";
    bRetruco.className = "action-btn raise";
    bRetruco.innerText = "¡Retruco!";
    bRetruco.onclick = () => {
      esperandoRespuesta = false;
      envidoFinalizado = true;
      panelRespuesta.classList.add("hidden");
      panelAcciones.classList.remove("hidden");
      nivelTruco = 1;
      cantarAccionTruco();
    };
    botonesRespuestaEl.appendChild(bRetruco);
  } else if (nuevoNivel === 2) {
    const bVale4 = document.createElement("button");
    bVale4.type = "button";
    bVale4.className = "action-btn raise";
    bVale4.innerText = "¡Vale Cuatro!";
    bVale4.onclick = () => {
      esperandoRespuesta = false;
      envidoFinalizado = true;
      panelRespuesta.classList.add("hidden");
      panelAcciones.classList.remove("hidden");
      nivelTruco = 2;
      cantarAccionTruco();
    };
    botonesRespuestaEl.appendChild(bVale4);
  }

  // Si el rival cantó Truco en Vuelta 1 antes de jugar cartas y no se cantó envido aún:
  if (puedeCantarEnvidoPrimero) {
    const bEnvidoPrimero = document.createElement("button");
    bEnvidoPrimero.type = "button";
    bEnvidoPrimero.className = "action-btn envido";
    bEnvidoPrimero.innerText = "¡El Envido está primero!";
    bEnvidoPrimero.onclick = () => {
      trucoPendiente = { nivel: nuevoNivel, quienCanto: "bot" };
      esperandoRespuesta = false;
      panelRespuesta.classList.add("hidden");
      log("Dijiste: ¡El envido está primero!");
      registrarBitacora("CANTO", "Dijiste: <strong>¡El envido está primero!</strong>", "tag-envido");
      cantarEnvido("envido", "jugador");
    };
    botonesRespuestaEl.appendChild(bEnvidoPrimero);

    const bRealPrimero = document.createElement("button");
    bRealPrimero.type = "button";
    bRealPrimero.className = "action-btn envido";
    bRealPrimero.innerText = "¡Real Envido primero!";
    bRealPrimero.onclick = () => {
      trucoPendiente = { nivel: nuevoNivel, quienCanto: "bot" };
      esperandoRespuesta = false;
      panelRespuesta.classList.add("hidden");
      log("Dijiste: ¡Real Envido primero!");
      registrarBitacora("CANTO", "Dijiste: <strong>¡Real Envido primero!</strong>", "tag-envido");
      cantarEnvido("real-envido", "jugador");
    };
    botonesRespuestaEl.appendChild(bRealPrimero);

    const bFaltaPrimero = document.createElement("button");
    bFaltaPrimero.type = "button";
    bFaltaPrimero.className = "action-btn envido";
    bFaltaPrimero.innerText = "¡Falta Envido primero!";
    bFaltaPrimero.onclick = () => {
      trucoPendiente = { nivel: nuevoNivel, quienCanto: "bot" };
      esperandoRespuesta = false;
      panelRespuesta.classList.add("hidden");
      log("Dijiste: ¡Falta Envido primero!");
      registrarBitacora("CANTO", "Dijiste: <strong>¡Falta Envido primero!</strong>", "tag-envido");
      cantarEnvido("falta-envido", "jugador");
    };
    botonesRespuestaEl.appendChild(bFaltaPrimero);
  }

  renderizarCartas();
  guardarEstadoCompleto();
}

// ========================================================
// INTELIGENCIA ARTIFICIAL (TOMA DE DECISIONES)
// ========================================================

function botEvaluaCantarEnvidoInicial() {
  if (envidoFinalizado || vueltaActual !== 1 || nivelTruco > 0) return null;

  const tanto = calcularTanto(originalesBot);
  const soyMano = (manoInicialEsJugador === false);
  const azar = Math.random();

  // Con tanto altísimo (31 a 33):
  if (tanto >= 31) {
    if (azar < 0.60) return "envido";
    if (azar < 0.85) return "real-envido";
    return null; // Espera para sorprender con contra-apuesta
  }

  // Con tanto muy bueno (29 o 30):
  if (tanto >= 29) {
    if (soyMano) {
      if (azar < 0.65) return "envido";
      if (azar < 0.80) return "real-envido";
    } else {
      if (azar < 0.45) return "envido";
    }
    return null;
  }

  // Con tanto bueno (27 o 28):
  if (tanto >= 27) {
    if (soyMano && azar < 0.35) return "envido";
    if (!soyMano && azar < 0.15) return "envido";
    return null;
  }

  // Farol / Bluff ocasional con tanto bajo (< 25):
  // 6% de probabilidad de cantar envido mintiendo
  if (tanto < 25 && azar < 0.06) {
    return azar < 0.02 ? "real-envido" : "envido";
  }

  return null;
}

function botEvaluaCantarTrucoInicial() {
  if (nivelTruco !== 0 || manoTerminada || evaluandoVuelta) return false;

  const poderes = manoBot.map(c => c.poder).sort((a, b) => b - a);
  const maxPoder = poderes[0] || 0;
  const segundoPoder = poderes[1] || 0;
  const azar = Math.random();

  // VUELTA 1:
  if (vueltaActual === 1) {
    // Si tiene cartas descomunales (Ancho de Espada/Basto + carta buena):
    // Prefiere NO cantar en primera para no espantar al jugador y atraparlo en 2da o con retruco
    if (maxPoder >= 13 && segundoPoder >= 9) {
      return azar < 0.15; // 85% de las veces se hace el dormido
    }

    // Mano buena equilibrada:
    if (maxPoder >= 11 && segundoPoder >= 8) {
      return azar < 0.20;
    }

    // Carta solitaria respetable (un 3 o 2): rara vez canta de una (5%), juega callado
    if (maxPoder >= 9) {
      return azar < 0.05;
    }

    // Farol con cartas débiles (< 8): 7% de probabilidad de bluffear de entrada
    if (maxPoder < 8 && azar < 0.07) {
      return true;
    }

    return false;
  }

  // VUELTA 2:
  if (vueltaActual === 2) {
    const ganoPrimera = resultadosVueltas[0] === "bot";
    const perdioPrimera = resultadosVueltas[0] === "jugador";
    const primeraParda = resultadosVueltas[0] === "parda";

    if (ganoPrimera) {
      // Tiene primera ganada: posición ideal para presionar
      if (maxPoder >= 9) return azar < 0.65;
      if (maxPoder >= 6) return azar < 0.35;
      return azar < 0.15; // bluff habiendo ganado primera
    }

    if (primeraParda) {
      // La segunda vuelta define la mano:
      if (maxPoder >= 10) return azar < 0.70;
      if (maxPoder >= 8) return azar < 0.40;
      return azar < 0.10; // bluff
    }

    if (perdioPrimera) {
      // Perdió primera, está en riesgo:
      if (maxPoder >= 12) return azar < 0.50;
      return azar < 0.05; // bluff desesperado
    }
  }

  // VUELTA 3:
  if (vueltaActual === 3) {
    if (maxPoder >= 10) return azar < 0.85; // con un 3 o mejor canta casi seguro
    if (maxPoder >= 8) return azar < 0.40;  // con un 2 o ancho falso
    if (maxPoder < 7) return azar < 0.08;   // bluff última carta
  }

  return false;
}

// ========================================================
// JUGADA DE CARTAS Y VUELTAS
// ========================================================

function turnoDelBot() {
  if (manoTerminada || manoActualDe !== "bot" || esperandoRespuesta || evaluandoVuelta || partidoTerminado) return;

  botStatusEl.innerText = "Pensando...";

  // 1. Evalúa si cantar Envido
  if (!envidoFinalizado && vueltaActual === 1 && nivelTruco === 0) {
    const cantoEnvido = botEvaluaCantarEnvidoInicial();
    if (cantoEnvido) {
      cantarEnvido(cantoEnvido, "bot");
      return;
    }
  }

  // 2. Evalúa si cantar Truco / Retruco / Vale 4
  const poderes = manoBot.map(c => c.poder).sort((a, b) => b - a);
  const maxPoder = poderes[0] || 0;
  const azar = Math.random();

  if (nivelTruco === 0) {
    if (botEvaluaCantarTrucoInicial()) {
      botCantaTruco(1);
      return;
    }
  } else if (nivelTruco === 1 && quienPoseeElQuiero === "bot") {
    // Para cantar RETRUCO en su turno:
    if (maxPoder >= 11 || (vueltaActual === 3 && maxPoder >= 9) || (azar < 0.10)) {
      botCantaTruco(2);
      return;
    }
  } else if (nivelTruco === 2 && quienPoseeElQuiero === "bot") {
    // Para cantar VALE 4 en su turno:
    if (maxPoder >= 13 || (vueltaActual === 3 && maxPoder >= 11)) {
      botCantaTruco(3);
      return;
    }
  }

  ejecutarTiradaBot();
}

function ejecutarTiradaBot() {
  if (manoTerminada || evaluandoVuelta || partidoTerminado) return;

  manoBot.sort((a, b) => a.poder - b.poder);
  let elegida = null;

  if (cartaMesaJugador) {
    elegida = manoBot.find(c => c.poder > cartaMesaJugador.poder);
    if (!elegida) elegida = manoBot[0];
  } else {
    elegida = (vueltaActual === 1 && manoBot.length === 3) ? manoBot[1] : manoBot[manoBot.length - 1];
  }

  manoBot = manoBot.filter(c => c !== elegida);
  cartaMesaBot = elegida;

  colocarCartaEnMesa(elegida, slotBotEl, vueltaActual, "bot");

  botStatusEl.innerText = `Jugó ${elegida.nombre}`;
  actualizarBotonTruco();
  renderizarCartas();
  guardarEstadoCompleto();

  if (cartaMesaJugador) {
    evaluarVuelta();
  } else {
    manoActualDe = "jugador";
    log(`El rival jugó ${elegida.nombre}. Es tu turno.`);
    actualizarBotonTruco();
    renderizarCartas();
    guardarEstadoCompleto();
  }
}

function jugarCartaJugador(indice) {
  if (manoActualDe !== "jugador" || manoTerminada || esperandoRespuesta || evaluandoVuelta || partidoTerminado) return;
  if (!manoJugador[indice]) return;

  cancelarTimerBot();
  habilitarBotonesEnvido(false);
  const carta = manoJugador.splice(indice, 1)[0];
  cartaMesaJugador = carta;

  colocarCartaEnMesa(carta, slotJugadorEl, vueltaActual, "jugador");

  actualizarBotonTruco();
  renderizarCartas();
  guardarEstadoCompleto();

  if (cartaMesaBot) {
    evaluarVuelta();
  } else {
    manoActualDe = "bot";
    log(`Tiraste ${carta.nombre}. Le toca al rival responder...`);
    actualizarBotonTruco();
    renderizarCartas();
    guardarEstadoCompleto();
    programarTimerBot(turnoDelBot, 800);
  }
}

function evaluarVuelta() {
  evaluandoVuelta = true;
  cancelarTimerBot();
  let ganadorVuelta = null;
  const numV = vueltaActual;

  if (cartaMesaJugador.poder > cartaMesaBot.poder) {
    ganadorVuelta = "jugador";
    log(`¡Ganaste la vuelta ${numV}! (${cartaMesaJugador.nombre} mata a ${cartaMesaBot.nombre})`);
    registrarBitacora(`VUELTA ${numV}`, `Ganaste con <strong>${cartaMesaJugador.nombre}</strong> sobre <strong>${cartaMesaBot.nombre}</strong>.`, "tag-gana");
  } else if (cartaMesaBot.poder > cartaMesaJugador.poder) {
    ganadorVuelta = "bot";
    log(`El rival mató tu carta y ganó la vuelta ${numV} (${cartaMesaBot.nombre} mata a ${cartaMesaJugador.nombre})`);
    registrarBitacora(`VUELTA ${numV}`, `Rival ganó con <strong>${cartaMesaBot.nombre}</strong> sobre tu <strong>${cartaMesaJugador.nombre}</strong>.`, "tag-pierde");
  } else {
    ganadorVuelta = "parda";
    log(`¡Parda en la vuelta ${numV}!`);
    registrarBitacora(`VUELTA ${numV}`, `¡Parda! <strong>${cartaMesaJugador.nombre}</strong> empardó con <strong>${cartaMesaBot.nombre}</strong>.`, "tag-parda");
  }

  resultadosVueltas.push(ganadorVuelta);

  if (ganadorVuelta === "jugador") primerTiradorDeVuelta = "jugador";
  else if (ganadorVuelta === "bot") primerTiradorDeVuelta = "bot";

  vueltaActual++;
  guardarEstadoCompleto();

  programarTimerBot(() => {
    evaluandoVuelta = false;
    const fin = resolverGanadorDeMano();

    if (fin) {
      asignarPuntosTruco(fin);
      terminarMano();
    } else {
      cartaMesaJugador = null;
      cartaMesaBot = null;
      manoActualDe = primerTiradorDeVuelta;

      actualizarBotonTruco();
      renderizarCartas();
      guardarEstadoCompleto();

      if (manoActualDe === "bot") {
        if (ganadorVuelta === "parda") {
          log("¡Parda! El rival sale jugando por ser mano...");
        } else {
          log("El rival ganó la vuelta y sale jugando primero...");
        }
        programarTimerBot(turnoDelBot, 900);
      } else {
        if (ganadorVuelta === "parda") {
          log("¡Parda! Salís jugando vos por ser mano.");
        } else {
          log("Ganaste la vuelta. ¡Salís jugando vos!");
        }
      }
    }
  }, 1200);
}

function resolverGanadorDeMano() {
  const r = resultadosVueltas;

  if (r.length === 2) {
    if (r[0] === "jugador" && r[1] === "jugador") return "jugador";
    if (r[0] === "bot" && r[1] === "bot") return "bot";
    if (r[0] === "parda" && r[1] !== "parda") return r[1];
    if (r[0] !== "parda" && r[1] === "parda") return r[0];
  }

  if (r.length === 3) {
    if (r[0] === "parda" && r[1] === "parda" && r[2] === "parda") {
      return manoInicialEsJugador ? "jugador" : "bot";
    }
    const victoriasJ = r.filter(x => x === "jugador").length;
    const victoriasB = r.filter(x => x === "bot").length;
    if (victoriasJ > victoriasB) return "jugador";
    if (victoriasB > victoriasJ) return "bot";
    if (r[2] === "parda") return r[0];
  }

  return null;
}

function asignarPuntosTruco(ganador) {
  const pts = puntosPorNivelTruco(nivelTruco);
  if (ganador === "jugador") {
    scoreJugador = Math.min(30, scoreJugador + pts);
    log(`🎉 ¡Ganaste la mano! (+${pts} pt${pts > 1 ? 's' : ''}). Pulsa "Siguiente Mano".`);
    registrarBitacora("MANO", `<strong>🎉 Te llevaste la mano</strong> (+${pts} pt${pts > 1 ? 's' : ''}). Marcador: Tú <strong>${scoreJugador}</strong> - Rival <strong>${scoreBot}</strong>.`, "tag-gana");
  } else {
    scoreBot = Math.min(30, scoreBot + pts);
    log(`💀 El rival ganó la mano (+${pts} pt${pts > 1 ? 's' : ''}). Pulsa "Siguiente Mano".`);
    registrarBitacora("MANO", `<strong>💀 El rival ganó la mano</strong> (+${pts} pt${pts > 1 ? 's' : ''}). Marcador: Tú <strong>${scoreJugador}</strong> - Rival <strong>${scoreBot}</strong>.`, "tag-pierde");
  }
  actualizarMarcador();
}

function irseAlMazo() {
  if (manoTerminada || evaluandoVuelta || esperandoRespuesta || partidoTerminado) return;
  cancelarTimerBot();
  const pts = puntosPorNivelTruco(nivelTruco);
  scoreBot = Math.min(30, scoreBot + pts);
  log(`Te fuiste al mazo. El rival suma ${pts} pt${pts > 1 ? 's' : ''}. Pulsa "Siguiente Mano".`);
  registrarBitacora("AL MAZO", `Te fuiste al mazo. Rival suma <strong>+${pts} pt(s)</strong>. Marcador: Tú <strong>${scoreJugador}</strong> - Rival <strong>${scoreBot}</strong>.`, "tag-pierde");
  actualizarMarcador();
  terminarMano();
}

function terminarMano() {
  cancelarTimerBot();
  manoTerminada = true;
  manoActualDe = null;
  evaluandoVuelta = false;
  habilitarBotonesEnvido(false);
  btnCantoTruco.disabled = true;
  btnIrse.disabled = true;

  if (scoreJugador >= 30 || scoreBot >= 30) {
    partidoTerminado = true;
    btnSiguiente.classList.add("hidden");
    if (btnNuevaPartida) btnNuevaPartida.classList.remove("hidden");
  } else {
    btnSiguiente.classList.remove("hidden");
    if (btnNuevaPartida) btnNuevaPartida.classList.add("hidden");
  }

  renderizarCartas();
  guardarEstadoCompleto();
}

// ========================================================
// INICIALIZACIÓN
// ========================================================
cargarTema();

if (recuperarEstadoCompleto()) {
  reanudarManoExistente();
} else {
  iniciarNuevaMano(true);
}