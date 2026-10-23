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
    
    // Carga directa del archivo SVG de tu carpeta cartas/
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

let evaluandoVuelta = false;
let timerBot = null;

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
    envidoFinalizado,
    historialEnvido,
    nivelTruco,
    quienPoseeElQuiero,
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
    envidoFinalizado = st.envidoFinalizado;
    historialEnvido = st.historialEnvido || [];
    nivelTruco = st.nivelTruco || 0;
    quienPoseeElQuiero = st.quienPoseeElQuiero;

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

function reiniciarPartidoCompleto() {
  if (confirm("¿Deseas reiniciar todo el partido a 0 y repartir una nueva mano?")) {
    if (timerBot) clearTimeout(timerBot);
    localStorage.removeItem("truco_estado_partido");

    scoreJugador = 0;
    scoreBot = 0;
    numeroMano = 0;
    manoInicialEsJugador = false;
    listaBitacoraEl.innerHTML = "";
    contadorJugadas = 0;
    totalEntradasEl.innerText = "0 jugadas";

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

  if (scoreJugador >= 30) {
    log("🏆 ¡GANASTE EL PARTIDO A 30 PUNTOS!");
    registrarBitacora("CAMPEÓN", "<strong>🎉 ¡Ganaste el partido!</strong> Has alcanzado 30 puntos.", "tag-gana");
    terminarMano();
    btnSiguiente.classList.add("hidden");
  } else if (scoreBot >= 30) {
    log("💀 El rival ganó el partido.");
    registrarBitacora("DERROTA", "<strong>💀 El rival alcanzó los 30 puntos</strong> y ganó el partido.", "tag-pierde");
    terminarMano();
    btnSiguiente.classList.add("hidden");
  }
}

// ========================================================
// CONTROL DE MANOS Y REANUDACIÓN
// ========================================================

function iniciarNuevaMano(forzarNueva = false) {
  if (scoreJugador >= 30 || scoreBot >= 30) return;

  if (timerBot) {
    clearTimeout(timerBot);
    timerBot = null;
  }

  btnSiguiente.classList.add("hidden");

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

  limpiarMesa();
  actualizarMarcador();

  panelRespuesta.classList.add("hidden");
  panelAcciones.classList.remove("hidden");

  habilitarBotonesEnvido(true);
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
    timerBot = setTimeout(turnoDelBot, 1100);
  }
}

function reanudarManoExistente() {
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

  if (manoTerminada) {
    terminarMano();
  } else {
    habilitarBotonesEnvido(!envidoFinalizado && vueltaActual === 1);
    btnIrse.disabled = false;
    actualizarBotonTruco();
    renderizarCartas();

    if (manoActualDe === "bot" && !evaluandoVuelta) {
      log("Turno del rival. Aguardá su jugada...");
      timerBot = setTimeout(turnoDelBot, 1000);
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
  const puedoJugar = (manoActualDe === "jugador") && !manoTerminada && !esperandoRespuesta && !evaluandoVuelta;

  manoJugador.forEach((carta, index) => {
    const el = carta.crearElemento(true, puedoJugar, () => jugarCartaJugador(index));
    cartasJugadorEl.appendChild(el);
  });
}

function habilitarBotonesEnvido(habilitar) {
  btnEnvido.disabled = !habilitar;
  btnRealEnvido.disabled = !habilitar;
  btnFaltaEnvido.disabled = !habilitar;
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
  if (envidoFinalizado || vueltaActual > 1 || evaluandoVuelta) return;
  habilitarBotonesEnvido(false);
  historialEnvido.push(tipo);

  const nombres = { "envido": "¡ENVIDO!", "real-envido": "¡REAL ENVIDO!", "falta-envido": "¡FALTA ENVIDO!" };
  const grito = nombres[tipo];

  if (quien === "jugador") {
    log(`Gritaste: ${grito}`);
    registrarBitacora("CANTO", `<strong>Tú</strong> cantaste <strong>${grito}</strong>`, "tag-envido");
    botStatusEl.innerText = "Pensando...";
    timerBot = setTimeout(() => botEvaluaRespuestaEnvido(tipo), 900);
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
  const probMentir = Math.random();

  if (ultimoCanto === "envido" && tantoB >= 29 && probMentir > 0.4) {
    cantarEnvido("real-envido", "bot");
    return;
  }
  if ((ultimoCanto === "envido" || ultimoCanto === "real-envido") && tantoB >= 31 && probMentir > 0.5) {
    cantarEnvido("falta-envido", "bot");
    return;
  }

  let acepta = false;
  if (ultimoCanto === "falta-envido") {
    acepta = tantoB >= 30 || (tantoB >= 28 && probMentir > 0.7);
  } else if (ultimoCanto === "real-envido") {
    acepta = tantoB >= 27 || (tantoB >= 24 && probMentir > 0.6);
  } else {
    acepta = tantoB >= 25 || probMentir > 0.65;
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
      puntos = ganador === "jugador" ? (30 - scoreBot) : (30 - scoreJugador);
    }

    if (ganador === "jugador") {
      scoreJugador += puntos;
      log(`¡Quiero aceptado! Tenés ${tantoJ} vs ${tantoB}. Ganaste el Envido (+${puntos} pts).`);
      registrarBitacora("ENVIDO", `<strong>Ganaste el envido</strong>: Tus ${tantoJ} vs ${tantoB} del rival. (+${puntos} pts)`, "tag-gana");
    } else {
      scoreBot += puntos;
      log(`¡Quiero aceptado! El rival tiene ${tantoB} vs tus ${tantoJ}. Rival gana el Envido (+${puntos} pts).`);
      registrarBitacora("ENVIDO", `<strong>Rival gana el envido</strong>: Sus ${tantoB} vs tus ${tantoJ}. (+${puntos} pts)`, "tag-pierde");
    }
  } else {
    const puntos = puntosEnvidoNoQuerido(historialEnvido);
    if (quienRespondio === "bot") {
      scoreJugador += puntos;
      botStatusEl.innerText = "NO QUIERO";
      log(`El rival dijo ¡No quiero! Te llevás ${puntos} pt${puntos > 1 ? 's' : ''}.`);
      registrarBitacora("ENVIDO", `Rival dijo <strong>¡No quiero!</strong> Te llevas +${puntos} pt(s).`, "tag-gana");
    } else {
      scoreBot += puntos;
      log(`Dijiste ¡No quiero! El rival suma ${puntos} pt${puntos > 1 ? 's' : ''}.`);
      registrarBitacora("ENVIDO", `Dijiste <strong>¡No quiero!</strong> El rival suma +${puntos} pt(s).`, "tag-pierde");
    }
  }

  actualizarMarcador();
  actualizarBotonTruco();
  renderizarCartas();
  guardarEstadoCompleto();

  if (!cartaMesaBot && manoActualDe === "bot" && !manoTerminada) {
    timerBot = setTimeout(ejecutarTiradaBot, 900);
  }
}

// ========================================================
// TRUCO / RETRUCO / VALE 4
// ========================================================

function cantarAccionTruco() {
  if (manoTerminada || evaluandoVuelta) return;

  const nuevoNivel = nivelTruco + 1;
  const textos = ["", "¡TRUCO!", "¡RETRUCO!", "¡VALE CUATRO!"];
  log(`Gritaste: ${textos[nuevoNivel]}`);
  registrarBitacora("CANTO", `<strong>Tú</strong> cantaste <strong>${textos[nuevoNivel]}</strong>`, "tag-truco");
  btnCantoTruco.disabled = true;

  botStatusEl.innerText = "Pensando...";
  guardarEstadoCompleto();
  timerBot = setTimeout(() => botEvaluaTruco(nuevoNivel), 900);
}

function botEvaluaTruco(nuevoNivel) {
  const maxPoder = Math.max(...manoBot.map(c => c.poder));
  const bluff = Math.random();

  if (nuevoNivel === 1 && (maxPoder >= 11 || (maxPoder >= 9 && bluff > 0.6))) {
    botCantaTruco(2);
    return;
  }
  if (nuevoNivel === 2 && (maxPoder >= 12 || (maxPoder >= 10 && bluff > 0.7))) {
    botCantaTruco(3);
    return;
  }

  let acepta = false;
  if (nuevoNivel === 1) acepta = maxPoder >= 8 || bluff > 0.5;
  else if (nuevoNivel === 2) acepta = maxPoder >= 9 || bluff > 0.6;
  else if (nuevoNivel === 3) acepta = maxPoder >= 10 || bluff > 0.75;

  if (acepta) {
    nivelTruco = nuevoNivel;
    quienPoseeElQuiero = "bot";
    botStatusEl.innerText = "¡QUIERO!";
    const pts = puntosPorNivelTruco(nivelTruco);

    registrarBitacora("TRUCO", `Rival dijo <strong>¡QUIERO!</strong> En juego por <strong>${pts} puntos</strong>.`, "tag-truco");
    actualizarBotonTruco();
    renderizarCartas();
    guardarEstadoCompleto();

    if (manoActualDe === "bot") {
      log(`El rival dijo ¡QUIERO! (Por ${pts} pts). Tira su carta...`);
      timerBot = setTimeout(ejecutarTiradaBot, 900);
    } else {
      log(`El rival dijo ¡QUIERO! (Por ${pts} pts). Es tu turno.`);
    }
  } else {
    const puntosOtorgados = nivelTruco === 0 ? 1 : puntosPorNivelTruco(nivelTruco);
    scoreJugador += puntosOtorgados;
    botStatusEl.innerText = "NO QUIERO";
    log(`El rival dijo ¡NO QUIERO! Te llevás ${puntosOtorgados} pt${puntosOtorgados > 1 ? 's' : ''}.`);
    registrarBitacora("TRUCO", `Rival dijo <strong>¡NO QUIERO!</strong> Te llevas <strong>+${puntosOtorgados} pt(s)</strong>.`, "tag-gana");
    actualizarMarcador();
    terminarMano();
  }
}

function botCantaTruco(nuevoNivel) {
  esperandoRespuesta = true;
  const nombres = ["", "¡TRUCO!", "¡RETRUCO!", "¡VALE CUATRO!"];
  const grito = nombres[nuevoNivel];
  botStatusEl.innerText = grito;
  log(`El rival cantó: ${grito}`);
  registrarBitacora("CANTO", `<strong>Rival</strong> cantó <strong>${grito}</strong>`, "tag-truco");

  panelAcciones.classList.add("hidden");
  panelRespuesta.classList.remove("hidden");
  respuestaPreguntaEl.innerText = `Rival canta: ${grito}`;
  botonesRespuestaEl.innerHTML = "";

  const bQuiero = document.createElement("button");
  bQuiero.type = "button";
  bQuiero.className = "action-btn success";
  bQuiero.innerText = "¡QUIERO!";
  bQuiero.onclick = () => {
    esperandoRespuesta = false;
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
      timerBot = setTimeout(ejecutarTiradaBot, 900);
    }
  };
  botonesRespuestaEl.appendChild(bQuiero);

  const bNoQuiero = document.createElement("button");
  bNoQuiero.type = "button";
  bNoQuiero.className = "action-btn danger";
  bNoQuiero.innerText = "¡NO QUIERO!";
  bNoQuiero.onclick = () => {
    esperandoRespuesta = false;
    panelRespuesta.classList.add("hidden");
    panelAcciones.classList.remove("hidden");
    const puntosOtorgados = nivelTruco === 0 ? 1 : puntosPorNivelTruco(nivelTruco);
    scoreBot += puntosOtorgados;
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
      panelRespuesta.classList.add("hidden");
      panelAcciones.classList.remove("hidden");
      nivelTruco = 2;
      cantarAccionTruco();
    };
    botonesRespuestaEl.appendChild(bVale4);
  }
  renderizarCartas();
  guardarEstadoCompleto();
}

// ========================================================
// JUGADA DE CARTAS Y VUELTAS
// ========================================================

function turnoDelBot() {
  if (manoTerminada || manoActualDe !== "bot" || esperandoRespuesta || evaluandoVuelta) return;

  botStatusEl.innerText = "Pensando...";

  if (!envidoFinalizado && vueltaActual === 1) {
    const tantoBot = calcularTanto(originalesBot);
    const miente = Math.random() < 0.22;
    if (tantoBot >= 27 || miente) {
      cantarEnvido(tantoBot >= 31 ? "real-envido" : "envido", "bot");
      return;
    }
  }

  if (nivelTruco === 0) {
    const maxPoder = Math.max(...manoBot.map(c => c.poder));
    const mienteTruco = Math.random() < 0.20;
    if (maxPoder >= 10 || (vueltaActual >= 2 && maxPoder >= 8) || mienteTruco) {
      botCantaTruco(1);
      return;
    }
  }

  ejecutarTiradaBot();
}

function ejecutarTiradaBot() {
  if (manoTerminada || evaluandoVuelta) return;

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
  if (manoActualDe !== "jugador" || manoTerminada || esperandoRespuesta || evaluandoVuelta) return;
  if (!manoJugador[indice]) return;

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
    timerBot = setTimeout(turnoDelBot, 800);
  }
}

function evaluarVuelta() {
  evaluandoVuelta = true;
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

  timerBot = setTimeout(() => {
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
        log("El rival ganó la vuelta y sale jugando primero...");
        timerBot = setTimeout(turnoDelBot, 900);
      } else {
        log("Ganaste la vuelta. ¡Salís jugando vos!");
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
    scoreJugador += pts;
    log(`🎉 ¡Ganaste la mano! (+${pts} pt${pts > 1 ? 's' : ''}). Pulsa "Siguiente Mano".`);
    registrarBitacora("MANO", `<strong>🎉 Te llevaste la mano</strong> (+${pts} pt${pts > 1 ? 's' : ''}). Marcador: Tú <strong>${scoreJugador}</strong> - Rival <strong>${scoreBot}</strong>.`, "tag-gana");
  } else {
    scoreBot += pts;
    log(`💀 El rival ganó la mano (+${pts} pt${pts > 1 ? 's' : ''}). Pulsa "Siguiente Mano".`);
    registrarBitacora("MANO", `<strong>💀 El rival ganó la mano</strong> (+${pts} pt${pts > 1 ? 's' : ''}). Marcador: Tú <strong>${scoreJugador}</strong> - Rival <strong>${scoreBot}</strong>.`, "tag-pierde");
  }
  actualizarMarcador();
}

function irseAlMazo() {
  if (manoTerminada || evaluandoVuelta) return;
  const pts = puntosPorNivelTruco(nivelTruco);
  scoreBot += pts;
  log(`Te fuiste al mazo. El rival suma ${pts} pt${pts > 1 ? 's' : ''}. Pulsa "Siguiente Mano".`);
  registrarBitacora("AL MAZO", `Te fuiste al mazo. Rival suma <strong>+${pts} pt(s)</strong>. Marcador: Tú <strong>${scoreJugador}</strong> - Rival <strong>${scoreBot}</strong>.`, "tag-pierde");
  actualizarMarcador();
  terminarMano();
}

function terminarMano() {
  manoTerminada = true;
  manoActualDe = null;
  evaluandoVuelta = false;
  habilitarBotonesEnvido(false);
  btnCantoTruco.disabled = true;
  btnIrse.disabled = true;
  btnSiguiente.classList.remove("hidden");
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