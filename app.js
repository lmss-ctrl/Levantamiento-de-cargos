const WEBHOOK_URL   = "https://n8n.lmsmartsolutions.com/webhook/levantamiento-cargos";
const WEBHOOK_AUTH  = "https://n8n.lmsmartsolutions.com/webhook/levantamiento-cargos-auth";
const WEBHOOK_ADMIN = "https://n8n.lmsmartsolutions.com/webhook/levantamiento-cargos-admin";
const WEBHOOK_ENTREGABLES = "https://n8n.lmsmartsolutions.com/webhook/generar-entregables-piloto";
const WEBHOOK_ENTREGABLE_CONSULTA = "https://n8n.lmsmartsolutions.com/webhook/rrhh-entregable-consulta";
const ENTREGABLE_EXPORT_HTML_URL      = "https://n8n.lmsmartsolutions.com/webhook/rrhh-entregable-export-html";
const ENTREGABLE_EXPORT_HTML_V24B_URL = "https://n8n.lmsmartsolutions.com/webhook/rrhh-entregable-export-html-v24b";
const DATABASE_ID_ENTREGABLES_QA = "35343c8107928084a4dbe48c77dac6e3";

const PHASES = [
  { label:"Datos básicos",          range:[1,9],   eta:"~3 min" },
  { label:"Objetivo del cargo",     range:[10,12], eta:"~2 min" },
  { label:"Funciones",              range:[13,18], eta:"~3 min" },
  { label:"Tiempos y carga",        range:[19,27], eta:"~4 min" },
  { label:"Responsabilidades",      range:[28,31], eta:"~2 min" },
  { label:"Relaciones",             range:[32,37], eta:"~2 min" },
  { label:"Autoridad",              range:[38,41], eta:"~2 min" },
  { label:"Perfil",                 range:[42,46], eta:"~2 min" },
  { label:"Competencias",           range:[47,50], eta:"~2 min" },
  { label:"Indicadores",            range:[51,53], eta:"~2 min" },
  { label:"Dificultades y mejoras", range:[54,59], eta:"~3 min" },
  { label:"Cierre",                 range:[60,61], eta:"~1 min" },
];

const appState = {
  rol:"", tokenSesion:"",
  identificadorColaborador:"", codigoExpediente:"",
  preguntaActualId:"", preguntaActualTexto:"",
  preguntaAyuda:"", preguntaTipo:"Texto largo", preguntaOpciones:[],
  progreso:0, estadoExpediente:"", resumenIA:"",
  cargo:"", area:"", jefeInmediato:"", nombreEntrevistado:"", nombreJefeInmediato:"",
  entregableId:"", entregableVersionId:"", idEntregablePg:"", versionAgente:"", estadoGeneracion:"",
  _intentoPreguntaActual: 1,
  _respuestaAnteriorActual: ""
};

function repairPossibleMojibake(value) {
  const text = String(value == null ? "" : value);
  // Fix CJK: caracteres chinos generados por conversión incorrecta anterior
  const CJK_MAP = {'贸':'ó','茅':'é','铆':'í','谩':'á','煤':'ú','卤':'ñ','邊':'á','芬':'é'};
  let result = text;
  if (/[一-鿿]/.test(result)) {
    result = result.replace(/[一-鿿]/g, function(ch) { return CJK_MAP[ch] || ch; });
  }
  if (!/[ÂÃâ][-¿]/.test(result)) return result;
  try {
    const bytes = Uint8Array.from(result, function(ch) {
      return ch.charCodeAt(0) & 0xFF;
    });
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return repaired || result;
  } catch {
    return result;
  }
}

function normalizeQuestionOptions(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map(function(item) { return repairPossibleMojibake(item).trim(); })
      .filter(Boolean);
  }

  if (raw == null) return [];

  return repairPossibleMojibake(raw)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(function(item) { return item.trim(); })
    .filter(Boolean);
}

function normalizeComparableValue(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function getAuxQuestionConfig(questionId) {
  const map = {
    P02: {
      mode: "other_only",
      auxInputId: "txtCargoActualOtro",
      auxPayloadKey: "cargo_actual_otro",
      selectPayloadKey: "cargo_actual_select",
      auxLabel: "Si elegiste Otro, escribe tu cargo actual",
      auxPlaceholder: "Ej. Coordinador de bodega"
    },
    P04: {
      mode: "other_only",
      auxInputId: "txtDepartamentoOtro",
      auxPayloadKey: "departamento_otro",
      selectPayloadKey: "departamento_select",
      auxLabel: "Si elegiste Otro, escribe el departamento",
      auxPlaceholder: "Ej. Planeación estratégica"
    },
    P05: {
      mode: "boss_name",
      auxInputId: "txtNombreJefeInmediato",
      auxPayloadKey: "nombre_jefe_inmediato",
      selectPayloadKey: "jefe_inmediato_select",
      auxLabel: "Nombre del jefe inmediato",
      auxPlaceholder: "Ej. Juan Pérez"
    }
  };
  return map[questionId] || null;
}

function ensureAuxFieldsContainer() {
  let container = document.getElementById("answerAuxFields");
  if (container) return container;

  const anchor = document.getElementById("answerButtons") || document.getElementById("answerTextarea");
  if (!anchor || !anchor.parentNode) return null;

  container = document.createElement("div");
  container.id = "answerAuxFields";
  container.className = "hidden mt-3 space-y-3";
  anchor.parentNode.insertBefore(container, anchor.nextSibling);
  return container;
}

function getCurrentAuxValues() {
  return {
    cargo_actual_otro: document.getElementById("txtCargoActualOtro")?.value?.trim() || "",
    departamento_otro: document.getElementById("txtDepartamentoOtro")?.value?.trim() || "",
    nombre_jefe_inmediato: document.getElementById("txtNombreJefeInmediato")?.value?.trim() || ""
  };
}

function syncSelectedAnswerButton() {
  const selectedValue = document.getElementById("txtRespuesta")?.value?.trim() || "";
  document.querySelectorAll(".answer-btn").forEach(function(btn) {
    const active = btn.textContent.trim() === selectedValue;
    btn.classList.toggle("selected", active);
  });
}

function renderAuxiliaryAnswerFields() {
  const container = ensureAuxFieldsContainer();
  if (!container) return;

  const cfg = getAuxQuestionConfig(appState.preguntaActualId);
  if (!cfg) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  const selectedValue = document.getElementById("txtRespuesta")?.value?.trim() || "";
  const selectedIsOther = normalizeComparableValue(selectedValue) === "otro";
  const shouldShow = cfg.mode === "boss_name" || selectedIsOther;

  if (!shouldShow) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  const auxValues = getCurrentAuxValues();
  const presetValue = cfg.auxPayloadKey === "nombre_jefe_inmediato"
    ? (auxValues.nombre_jefe_inmediato || appState.nombreJefeInmediato || "")
    : (auxValues[cfg.auxPayloadKey] || "");

  container.innerHTML = `
    <div>
      <label class="form-label">${cfg.auxLabel}</label>
      <input
        id="${cfg.auxInputId}"
        type="text"
        class="input-light"
        placeholder="${cfg.auxPlaceholder}"
        value="${presetValue.replace(/"/g, "&quot;")}"
      />
    </div>
  `;
  container.classList.remove("hidden");

  const auxInput = document.getElementById(cfg.auxInputId);
  if (auxInput) {
    auxInput.addEventListener("input", function() {
      if (cfg.auxPayloadKey === "nombre_jefe_inmediato") {
        appState.nombreJefeInmediato = this.value.trim();
      }
      saveDraft();
    });
  }
}

function buildAnswerSubmission() {
  const respuestaBase = document.getElementById("txtRespuesta")?.value?.trim() || "";
  const cfg = getAuxQuestionConfig(appState.preguntaActualId);
  const payload = { respuesta: respuestaBase };

  if (!cfg) return payload;

  const auxValues = getCurrentAuxValues();

  if (cfg.selectPayloadKey) payload[cfg.selectPayloadKey] = respuestaBase;

  if (cfg.mode === "other_only" && normalizeComparableValue(respuestaBase) === "otro") {
    const detalle = auxValues[cfg.auxPayloadKey];
    if (!detalle) throw new Error("Completa el detalle de la opción Otro antes de continuar.");
    payload[cfg.auxPayloadKey] = detalle;
    payload.respuesta = `Otro - ${detalle}`;
  }

  if (cfg.mode === "boss_name") {
    const nombreJefe = auxValues.nombre_jefe_inmediato;
    if (!respuestaBase) throw new Error("Selecciona el cargo o tipo de jefe inmediato.");
    if (!nombreJefe) throw new Error("Escribe el nombre del jefe inmediato.");
    payload.nombre_jefe_inmediato = nombreJefe;
    payload.respuesta = `${respuestaBase} - ${nombreJefe}`;
  }

  return payload;
}

applyState = function(data) {
  renderMessage("boxMessage", "", "");
  const prevQuestionId = appState.preguntaActualId || "";

  appState.codigoExpediente = data.codigo_expediente ?? "";
  appState.preguntaActualId = data.pregunta_actual_id ?? "";
  appState.preguntaActualTexto = repairPossibleMojibake(data.pregunta_actual ?? "");
  appState.preguntaAyuda = repairPossibleMojibake(data.ayuda ?? "");
  appState.identificadorColaborador =
    data.identificador_colaborador || appState.identificadorColaborador || "";
  appState.preguntaTipo = data.tipo_respuesta || "Texto largo";
  appState.preguntaOpciones = normalizeQuestionOptions(data.opciones);
  appState.progreso = Number(data.progreso || 0);
  appState.estadoExpediente = data.estado_expediente || appState.estadoExpediente || "En curso";
  appState.cargo = repairPossibleMojibake(data.cargo_actual || appState.cargo || "Levantamiento de cargos");
  appState.area = repairPossibleMojibake(data.departamento || data.area || appState.area || "");
  appState.jefeInmediato = repairPossibleMojibake(data.jefe_inmediato || appState.jefeInmediato || "");
  appState.nombreEntrevistado = repairPossibleMojibake(data.nombre_colaborador || appState.nombreEntrevistado || "");
  appState.nombreJefeInmediato = repairPossibleMojibake(data.nombre_jefe_inmediato || appState.nombreJefeInmediato || "");
  appState.resumenIA = repairPossibleMojibake(data.ultima_respuesta_resumida || data.resumen_ia || "");

if (prevQuestionId && appState.preguntaActualId && prevQuestionId !== appState.preguntaActualId) {
  appState._intentoPreguntaActual   = 1;
  appState._respuestaAnteriorActual = "";
  clearDraft();
}

  persistSession();
};

renderAnswerInput = function() {
  const tipo = appState.preguntaTipo;
  const ta = document.getElementById("answerTextarea");
  const btns = document.getElementById("answerButtons");
  const txt = document.getElementById("txtRespuesta");

  if (txt) txt.value = "";

  const FALLBACK_OPTIONS = {
    P07: ["Si", "No"],
    P09: ["Estratégico", "Táctico", "Operativo", "Administrativo"],
    P41: ["Alto", "Medio", "Bajo"]
  };
  const dynamicOps = normalizeQuestionOptions(appState.preguntaOpciones);
  const fallbackOps = FALLBACK_OPTIONS[appState.preguntaActualId] || [];
  const ops = dynamicOps.length ? dynamicOps : fallbackOps;
  const isSelection = tipo === "Si/No" || tipo === "Seleccion unica";

  btns.innerHTML = "";

  if (isSelection || ops.length) {
    ta.classList.add("hidden");
    btns.classList.remove("hidden");
    btns.innerHTML = ops.map(function(opt, i) {
      return `<button class="answer-btn" data-idx="${i}">${opt}</button>`;
    }).join("");

    btns.querySelectorAll(".answer-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        selectOpt(this, this.textContent);
      });
    });
  } else {
    btns.classList.add("hidden");
    ta.classList.remove("hidden");
    setTimeout(function() {
      const input = document.getElementById("txtRespuesta");
      if (input) input.focus();
    }, 80);
  }

  renderAuxiliaryAnswerFields();
  restoreDraft();
};

window.addEventListener("load", function() {
  const persisted = loadPersistedSession();
  if (!persisted) return;
  if (persisted.rol === "admin" || persisted.rol === "consultor") return;
  if (!persisted.identificadorColaborador) return;

  selectRole("colaborador");
  renderMessage("boxLoginMessage", "info", "Se encontro una sesion reciente. Retomando entrevista...");
  setTimeout(function() {
    loginColaborador();
  }, 0);
});

const SESSION_KEY = "levantamiento_cargos_front_session_v1";
const DRAFT_KEY = "levantamiento_cargos_front_draft_v1";
let isSubmittingAnswer = false;

function getStorageTargets() {
  var stores = [];
  try { if (window.sessionStorage) stores.push(window.sessionStorage); } catch {}
  try { if (window.localStorage) stores.push(window.localStorage); } catch {}
  return stores;
}

function persistSession() {
  var payload = JSON.stringify({
    rol: appState.rol || "",
    tokenSesion: appState.tokenSesion || "",
    identificadorColaborador: appState.identificadorColaborador || "",
    codigoExpediente: appState.codigoExpediente || "",
    preguntaActualId: appState.preguntaActualId || "",
    entregableId: appState.entregableId || "",
    entregableVersionId: appState.entregableVersionId || "",
    idEntregablePg: appState.idEntregablePg || "",
    versionAgente: appState.versionAgente || "",
    estadoGeneracion: appState.estadoGeneracion || ""
  });
  try {
    getStorageTargets().forEach(function(store) {
      store.setItem(SESSION_KEY, payload);
    });
  } catch {}
}

function clearSession() {
  try {
    getStorageTargets().forEach(function(store) {
      store.removeItem(SESSION_KEY);
      store.removeItem(DRAFT_KEY);
    });
  } catch {}
}

function loadPersistedSession() {
  for (const store of getStorageTargets()) {
    try {
      const raw = store.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return null;
}

function ensureAdminToken() {
  if (appState.tokenSesion) return true;
  const persisted = loadPersistedSession();
  if (persisted && persisted.tokenSesion) {
    appState.tokenSesion = persisted.tokenSesion;
    if (!appState.rol && persisted.rol) appState.rol = persisted.rol;
    return true;
  }
  return false;
}

// ── Normalizar código de expediente (EXP-...) desde cualquier fuente ──────────
function normalizarCodigo(exp) {
  if (!exp) return "";
  var raw = "";
  if (typeof exp === "string") {
    raw = exp;
  } else if (typeof exp === "object") {
    raw = exp.codigo_expediente || exp.codigoExpediente
       || exp["Código expediente"] || exp["Código expediente  (Auto)"]
       || exp["Codigo expediente"]  || exp["Codigo expediente  (Auto)"]
       || exp.codigo || "";
  }
  var str = String(raw || "").trim();
  var compact = str.replace(/\s+/g, "");
  var match = compact.match(/EXP-\d+/i);
  return match ? match[0].toUpperCase() : str;
}

function extraerCodigoRespuesta(data) {
  if (!data) return "";
  var exp = data.expediente || data.expediente_qa || data;
  if (typeof exp === "string") return exp;
  if (typeof exp !== "object") return "";
  return exp.codigo_expediente || exp.codigoExpediente
    || exp["Código expediente"] || exp["Código expediente  (Auto)"]
    || exp["Codigo expediente"]  || exp["Codigo expediente  (Auto)"]
    || exp.codigo || "";
}

function buscarFilaAdminPorCodigo(codigo) {
  var codigoNorm = normalizarCodigo(codigo);
  var rows = Array.isArray(appState.expedientesAdmin) ? appState.expedientesAdmin : [];
  for (var i = 0; i < rows.length; i++) {
    if (normalizarCodigo(rows[i]) === codigoNorm || normalizarCodigo(rows[i].codigo || "") === codigoNorm) {
      return rows[i];
    }
  }
  return null;
}

function logSyncDebugBeforeSend(rowCodigoVisible, codigoPayload, rowCompleta, botonOrigen) {
  console.log("[SYNC DEBUG BEFORE SEND]", {
    rowCodigoVisible: rowCodigoVisible,
    codigoPayload: codigoPayload,
    rowCompleta: rowCompleta || null,
    botonOrigen: botonOrigen || ""
  });
}

function logSyncDebugAfterResponse(rowCodigoVisible, codigoPayload, responseCodigo, responseCompleta, botonOrigen) {
  console.log("[SYNC DEBUG AFTER RESPONSE]", {
    rowCodigoVisible: rowCodigoVisible,
    codigoPayload: codigoPayload,
    responseCodigo: responseCodigo,
    responseCompleta: responseCompleta || null,
    normalizadoRow: normalizarCodigo(rowCodigoVisible),
    normalizadoResponse: normalizarCodigo(responseCodigo),
    botonOrigen: botonOrigen || ""
  });
}

// ── Limpiar token de sesión expirada ─────────────────────────────────────────
function handleSesionExpirada() {
  appState.tokenSesion = "";
  for (var _s of getStorageTargets()) {
    try { _s.removeItem(SESSION_KEY); } catch(e) {}
  }
}

// ── Detectar si una respuesta ok:false indica sesión expirada ────────────────
function esSesionExpirada(data) {
  var msg = String((data && (data.mensaje || data.message)) || "").toLowerCase();
  return !data.ok && (
    msg.includes("sesion expiro") ||
    msg.includes("sesión expiró") ||
    msg.includes("sesion invalida") ||
    msg.includes("token") ||
    msg.includes("no autorizado")
  );
}

function saveDraft() {
  try {
    const answerEl = document.getElementById("txtRespuesta");
    const value = answerEl ? answerEl.value : "";
    const auxValues = getCurrentAuxValues();
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
      codigoExpediente: appState.codigoExpediente || "",
      preguntaActualId: appState.preguntaActualId || "",
      value: value || "",
      cargo_actual_otro: auxValues.cargo_actual_otro || "",
      departamento_otro: auxValues.departamento_otro || "",
      nombre_jefe_inmediato: auxValues.nombre_jefe_inmediato || ""
    }));
  } catch {}
}

function restoreDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    const answerEl = document.getElementById("txtRespuesta");
    if (!answerEl) return;
    if (draft.codigoExpediente === (appState.codigoExpediente || "") &&
        draft.preguntaActualId === (appState.preguntaActualId || "")) {
      answerEl.value = draft.value || "";
      syncSelectedAnswerButton();
      renderAuxiliaryAnswerFields();
      if (draft.cargo_actual_otro && document.getElementById("txtCargoActualOtro")) {
        document.getElementById("txtCargoActualOtro").value = draft.cargo_actual_otro;
      }
      if (draft.departamento_otro && document.getElementById("txtDepartamentoOtro")) {
        document.getElementById("txtDepartamentoOtro").value = draft.departamento_otro;
      }
      if (draft.nombre_jefe_inmediato && document.getElementById("txtNombreJefeInmediato")) {
        document.getElementById("txtNombreJefeInmediato").value = draft.nombre_jefe_inmediato;
      }
    }
  } catch {}
}

function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
}

/* ── Screens ── */
const SCREENS = ["Login","Interview","Final","Admin"];
function showScreen(name) {
  SCREENS.forEach(s => {
    const el = document.getElementById("screen"+s);
    if (el) el.classList.add("hidden");
  });
  document.getElementById("screen"+name).classList.remove("hidden");
}

/* ── Messages ── */
function renderMessage(boxId, type, text) {
  const box = document.getElementById(boxId);
  if (!box) return;
  if (!text) { box.className = "hidden"; box.textContent = ""; return; }
  box.className = "msg-" + type;
  box.textContent = text;
  box.classList.remove("hidden");
}

/* ── HTTP ── */
function waitMs(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function postJson(url, payload, retries) {
  if (retries == null) retries = 1;
  const headers = {"Content-Type":"application/json"};
  if (url === WEBHOOK_ADMIN) ensureAdminToken();
  if (appState.tokenSesion) headers["X-Session-Token"] = appState.tokenSesion;
  const res = await fetch(url, {
    method:"POST",
    headers,
    body:JSON.stringify(payload),
    cache:"no-store"
  });
  const text = await res.text();
  if (!text) {
    if (retries > 0) {
      await waitMs(350);
      return postJson(url, payload, retries - 1);
    }
    throw new Error("Respuesta vacia del servidor");
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const normalized = String(text || "").trim();
    try {
      data = JSON.parse(normalized);
      if (typeof data === "string") {
        data = JSON.parse(data);
      }
    } catch {
      throw new Error("Respuesta no valida del servidor");
    }
  }
  if (typeof data === "string") {
    data = JSON.parse(data);
  }
  if (!res.ok) {
    throw new Error(data?.mensaje || ("Error HTTP " + res.status));
  }
  return data;
}

function getEntregableErrorMessage(error) {
  const map = {
    entregable_version_id_requerido: "El entregable aun no esta disponible para consulta.",
    entregable_version_id_invalido: "El ID de version del entregable no es valido.",
    entregable_no_encontrado: "No se encontro el entregable generado en PostgreSQL."
  };
  return map[error] || "No fue posible consultar el entregable en este momento.";
}

function getDocumentalErrorMessage(error) {
  const map = {
    entregable_version_id_requerido: "El entregable aun no esta disponible para exportacion documental.",
    entregable_version_id_invalido:  "El ID de version del entregable no es valido.",
    entregable_no_encontrado:        "No existe una version documental para el ID solicitado."
  };
  return map[error] || "No fue posible cargar la version documental. Intente nuevamente o revise auditoria.";
}

function getAuditadoErrorMessage(error) {
  const map = {
    entregable_version_id_requerido: "El entregable aun no esta disponible para la version auditada.",
    entregable_version_id_invalido:  "El ID de version del entregable no es valido.",
    entregable_no_encontrado:        "No existe una version auditada para el ID solicitado."
  };
  return map[error] || "No fue posible cargar la version auditada. Intente nuevamente o revise auditoria.";
}

function extractEntregableInfo(data) {
  const ent = data?.entregables || {};
  const entregableVersionId = String(
    ent.entregable_version_id ||
    ent.id_entregable_pg ||
    data?.entregable_version_id ||
    data?.id_entregable_pg ||
    ""
  ).trim();
  const entregableId = String(
    ent.entregable_id || data?.entregable_id || ""
  ).trim();
  return {
    entregableId,
    entregableVersionId,
    idEntregablePg: String(ent.id_entregable_pg || entregableVersionId || "").trim(),
    versionAgente: String(ent.version_agente || data?.version_agente || "").trim(),
    estadoGeneracion: String(ent.estado_generacion || data?.estado_generacion || "").trim(),
    ok: !!(ent.ok === true || ent.ok === "true" || entregableVersionId)
  };
}

function storeEntregableInfo(data) {
  const info = extractEntregableInfo(data);
  appState.entregableId = info.entregableId;
  appState.entregableVersionId = info.entregableVersionId;
  appState.idEntregablePg = info.idEntregablePg;
  appState.versionAgente = info.versionAgente;
  appState.estadoGeneracion = info.estadoGeneracion;
  persistSession();
  renderEntregableActions(info);
  return info;
}

function renderEntregableActions(info) {
  const box = document.getElementById("boxEntregableConsulta");
  if (!box) return;
  const data = info || {
    entregableId: appState.entregableId,
    entregableVersionId: appState.entregableVersionId,
    idEntregablePg: appState.idEntregablePg,
    versionAgente: appState.versionAgente,
    estadoGeneracion: appState.estadoGeneracion || ""
  };
  const hasVersion = !!data.entregableVersionId;
  box.classList.toggle("hidden", !hasVersion);
  setText("lblEntregableVersionId", data.entregableVersionId || "-");
  setText("lblEntregableId", data.entregableId || "-");
  setText("lblEntregableVersionAgente", data.versionAgente || "-");
  setText("lblEntregableEstado", data.estadoGeneracion || "-");
  const btnVer        = document.getElementById("btnVerEntregable");
  const btnCopy       = document.getElementById("btnCopiarEntregableId");
  const btnDocumental = document.getElementById("btnDocumental");
  if (btnVer)        btnVer.disabled        = !hasVersion;
  if (btnCopy)       btnCopy.disabled       = !hasVersion;
  if (btnDocumental) btnDocumental.disabled = !hasVersion;
}

function closeEntregablePreview() {
  const box = document.getElementById("boxEntregablePreview");
  const iframe = document.getElementById("iframeEntregablePreview");
  if (iframe) iframe.removeAttribute("srcdoc");
  if (box) box.classList.add("hidden");
  setText("lblVistaActual", "Vista previa del entregable");
  renderMessage("boxEntregableMessage", "", "");
}

function resetEntregableConsulta() {
  appState.entregableId = "";
  appState.entregableVersionId = "";
  appState.idEntregablePg = "";
  appState.versionAgente = "";
  appState.estadoGeneracion = "";
  closeEntregablePreview();
  const box = document.getElementById("boxEntregableConsulta");
  if (box) box.classList.add("hidden");
}

async function copyEntregableVersionId() {
  const id = appState.entregableVersionId || appState.idEntregablePg || "";
  if (!id) {
    renderMessage("boxEntregableMessage", "warning", "El entregable aun no esta disponible para consulta.");
    return;
  }
  try {
    await navigator.clipboard.writeText(id);
    renderMessage("boxEntregableMessage", "success", "ID de version copiado.");
  } catch {
    renderMessage("boxEntregableMessage", "info", "ID de version: " + id);
  }
}

async function consultarEntregable() {
  const id = appState.entregableVersionId || appState.idEntregablePg || "";
  if (!id) {
    renderMessage("boxEntregableMessage", "warning", "El entregable aun no esta disponible para consulta.");
    return;
  }
  const btn = document.getElementById("btnVerEntregable");
  if (btn) { btn.disabled = true; btn.textContent = "Consultando..."; }
  closeEntregablePreview();
  renderMessage("boxEntregableMessage", "info", "Consultando entregable...");
  try {
    const data = await postJson(WEBHOOK_ENTREGABLE_CONSULTA, {
      entregable_version_id: isNaN(Number(id)) ? id : Number(id),
      modo: "QA"
    }, 0);
    if (!data.ok) {
      renderMessage("boxEntregableMessage", "warning", getEntregableErrorMessage(data.error));
      return;
    }
    const iframe = document.getElementById("iframeEntregablePreview");
    const box = document.getElementById("boxEntregablePreview");
    if (!data.html_preview || !iframe || !box) {
      renderMessage("boxEntregableMessage", "warning", "El entregable no trae vista previa disponible.");
      return;
    }
    iframe.setAttribute("srcdoc", data.html_preview);
    box.classList.remove("hidden");
    setText("lblVistaActual", "Vista previa del entregable");
    renderMessage("boxEntregableMessage", "success", "Entregable consultado correctamente.");
  } catch (e) {
    renderMessage("boxEntregableMessage", "error", "Error tecnico consultando entregable: " + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Ver entregable"; }
  }
}

async function consultarEntregableDocumental() {
  const id = appState.entregableVersionId || appState.idEntregablePg || "";
  if (!id) {
    renderMessage("boxEntregableMessage", "warning", "El entregable aun no esta disponible para exportacion documental.");
    return;
  }
  const btn = document.getElementById("btnDocumental");
  if (btn) { btn.disabled = true; btn.textContent = "Generando..."; }
  closeEntregablePreview();
  renderMessage("boxEntregableMessage", "info", "Generando version documental…");
  console.log("Consultando version documental", { entregableVersionId: id });
  try {
    const numId = isNaN(Number(id)) ? id : Number(id);
    const data = await postJson(ENTREGABLE_EXPORT_HTML_URL, {
      entregable_version_id: numId,
      modo: "QA"
    }, 0);
    console.log("Respuesta version documental", data);
    if (!data.ok) {
      renderMessage("boxEntregableMessage", "warning", getDocumentalErrorMessage(data.error));
      return;
    }
    const iframe = document.getElementById("iframeEntregablePreview");
    const box    = document.getElementById("boxEntregablePreview");
    if (!data.html_export || !iframe || !box) {
      renderMessage("boxEntregableMessage", "warning", "La version documental no trajo contenido disponible.");
      return;
    }
    iframe.setAttribute("srcdoc", data.html_export);
    iframe.setAttribute("sandbox", "");
    iframe.style.minHeight = "800px";
    box.classList.remove("hidden");
    setText("lblVistaActual", "Versión documental imprimible");
    const filenameInfo = data.filename ? " — " + data.filename : "";
    renderMessage("boxEntregableMessage", "success", "Versión documental cargada correctamente." + filenameInfo);
  } catch (e) {
    console.log("Respuesta version documental", { error: e.message });
    renderMessage("boxEntregableMessage", "error", "No fue posible cargar la version documental. Intente nuevamente o revise auditoria.");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Versión documental"; }
  }
}

/* ── Role selection ── */
function selectRole(rol) {
  appState.rol = rol;
  persistSession();
  document.querySelectorAll(".role-card").forEach(c => c.classList.remove("selected"));
  document.querySelector(`[data-role="${rol}"]`)?.classList.add("selected");
  document.getElementById("loginColaborador").classList.add("hidden");
  document.getElementById("loginPassword").classList.add("hidden");
  renderMessage("boxLoginMessage","","");
  if (rol === "colaborador") {
    document.getElementById("loginColaborador").classList.remove("hidden");
    document.getElementById("txtLoginCedula").focus();
  } else {
    document.getElementById("loginPassword").classList.remove("hidden");
    document.getElementById("txtLoginPassword").focus();
  }
}

/* ── Login colaborador ── */
async function loginColaborador() {
  const cedula = document.getElementById("txtLoginCedula").value.trim();
  if (!cedula) { renderMessage("boxLoginMessage","warning","Ingresa tu número de identificación."); return; }
  if (!/^\d{4,15}$/.test(cedula)) { renderMessage("boxLoginMessage","warning","El número de identificación debe contener solo dígitos (4 a 15)."); return; }
  appState.identificadorColaborador = cedula;
  renderMessage("boxLoginMessage","info","Consultando entrevista...");
  try {
    const data = await postJson(WEBHOOK_URL, {accion:"iniciar_o_retomar", identificador_colaborador:cedula});
    if (!data.ok) { renderMessage("boxLoginMessage","error", data.mensaje||"No se pudo iniciar la entrevista."); return; }
    applyState(data);
    renderInterviewView();
    persistSession();
    showScreen("Interview");
  } catch(e) { renderMessage("boxLoginMessage","error","Error de conexión: "+e.message); }
}

/* ── Login con contraseña ── */
async function loginConPassword() {
  const pwd = document.getElementById("txtLoginPassword").value;
  if (!pwd) { renderMessage("boxLoginMessage","warning","Ingresa la contraseña."); return; }

  // ── Bypass QA: acceso directo a sección Entregables sin llamar WEBHOOK_AUTH ──
  // Usar cuando WEBHOOK_AUTH no está disponible o la contraseña no se conoce.
  // No persiste sesión ni habilita funciones admin; solo habilita la consulta de entregables.
  if (pwd === "LMSS-QA") {
    document.getElementById("adminRolLabel").textContent = "QA · Entregables";
    document.querySelectorAll(".admin-only").forEach(function(el) { el.style.display = "none"; });
    showScreen("Admin");
    showAdminSection("Entregables");
    return;
  }
  // ── Fin bypass QA ──

  renderMessage("boxLoginMessage","info","Verificando...");
  try {
    const data = await postJson(WEBHOOK_AUTH, {rol:appState.rol, password:pwd});
    if (!data.ok) { renderMessage("boxLoginMessage","error", data.mensaje||"Contraseña incorrecta."); return; }
    appState.tokenSesion = data.token_sesion || data.token || "";
    if (!appState.tokenSesion) {
      renderMessage("boxLoginMessage","error","No se recibió un token de sesión válido.");
      return;
    }
    persistSession();
    document.getElementById("adminRolLabel").textContent =
      appState.rol === "admin" ? "Administrador" : "Consultor LMSS";
    document.querySelectorAll(".admin-only").forEach(el =>
      el.style.display = appState.rol === "admin" ? "" : "none");
    showScreen("Admin");
    showAdminSection("Dashboard");
    loadDashboard();
  } catch(e) { renderMessage("boxLoginMessage","error","Error: "+e.message); }
}

/* ── Admin sections ── */
const SECTIONS = ["Dashboard","Expedientes","Empresa","Accesos","Entregables"];
function showAdminSection(name) {
  SECTIONS.forEach(s => {
    const sec = document.getElementById("section"+s);
    const nav = document.getElementById("nav"+s);
    if (sec) sec.classList.add("hidden");
    if (nav) nav.classList.remove("active");
  });
  const sec = document.getElementById("section"+name);
  const nav = document.getElementById("nav"+name);
  if (sec) sec.classList.remove("hidden");
  if (nav) nav.classList.add("active");
  if (name==="Empresa")     loadEmpresaConfig();
  if (name==="Expedientes") loadExpedientes();
}

async function loadDashboard() {
  try {
    const [stats, cfg] = await Promise.all([
      postJson(WEBHOOK_ADMIN, {accion:"stats"}),
      postJson(WEBHOOK_ADMIN, {accion:"get_configuracion_empresa"})
    ]);
    if (stats.ok) {
      document.getElementById("statActivos").textContent     = stats.activos     ?? "—";
      document.getElementById("statCompletados").textContent = stats.completados ?? "—";
    }
    const empresa = cfg?.empresa?.nombre || stats.empresa || "";
    document.getElementById("statEmpresa").textContent = empresa || "Sin configurar";
  } catch {}
}

async function loadExpedientes() {
  const tbody = document.getElementById("tblExpedientes");
  tbody.innerHTML = `<tr><td colspan="9" class="px-5 py-10 text-center text-sm text-zinc-400">
    <span class="pulse inline-block w-2 h-2 rounded-full bg-zinc-300 mr-2"></span>Cargando...</td></tr>`;
  try {
    const data = await postJson(WEBHOOK_ADMIN, {accion:"listar_expedientes"});
    if (!data.ok || !data.expedientes?.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="px-5 py-10 text-center text-sm text-zinc-400">No hay expedientes registrados.</td></tr>`;
      appState.expedientesAdmin = [];
      return;
    }
    appState.expedientesAdmin = data.expedientes;
    tbody.innerHTML = data.expedientes.map(exp => {
      const quality = deriveQualityMetrics(exp);
      const rowValuePct = typeof exp.valor_pct === "number" ? clampPercent(exp.valor_pct) : quality.valuePct;
      const rowSource = typeof exp.valor_pct === "number" ? "backend" : quality.source;
      const rowConfidence = exp.confianza_entregable
        ? (/alta/i.test(exp.confianza_entregable) ? getConfidenceMeta(85) : /media/i.test(exp.confianza_entregable) ? getConfidenceMeta(65) : getConfidenceMeta(35))
        : quality.confidence;
      const cls = exp.estado==="Cerrado"   ? "color:#166534;background:#f0fdf4;border:1px solid #bbf7d0" :
                  exp.estado==="En curso"  ? "color:#92400e;background:#fffbeb;border:1px solid #fde68a" :
                                             "color:#52525b;background:#f4f4f6;border:1px solid #e4e4e7";
      return `<tr class="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
        <td class="px-5 py-3 mono text-xs text-zinc-400">${exp.codigo||"—"}</td>
        <td class="px-5 py-3 text-sm font-medium text-zinc-800">${exp.nombre||"—"}</td>
        <td class="px-5 py-3 text-sm text-zinc-600">${exp.cargo||"—"}</td>
        <td class="px-5 py-3">${renderMetricBar(exp.progreso, "linear-gradient(90deg,#9333ea,#ec4899)")}</td>
        <td class="px-5 py-3">
          ${renderMetricBar(rowValuePct, "linear-gradient(90deg,#0f766e,#14b8a6)")}
          <div class="mt-1 text-[11px] text-zinc-400">${rowSource === "backend" ? "dato calculado" : "estimado visual"}</div>
        </td>
        <td class="px-5 py-3">${buildPill(rowConfidence.label, rowConfidence.colors)}</td>
        <td class="px-5 py-3">
          <span class="tag px-2 py-1 rounded-lg" style="${cls}">${exp.estado||"—"}</span>
        </td>
        <td class="px-5 py-3 text-xs text-zinc-400">${exp.ultima_interaccion||"—"}</td>
      
        <td class="px-5 py-3">${exp.estado==="Cerrado"?'<button data-codigo="'+exp.codigo+'" onclick="generarEntregableExpediente(this.dataset.codigo, this)" style="background:#166534;color:#fff;border:none;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600">Gen.</button> <button data-codigo="'+exp.codigo+'" onclick="exportarExpediente(this.dataset.codigo, this)" style="background:#9333ea;color:#fff;border:none;cursor:pointer;padding:5px 12px;border-radius:8px;font-size:12px;font-weight:600">&#8595; PDF</button> <button data-codigo=\"'+exp.codigo+'\" onclick=\"exportarCSV(this.dataset.codigo, this)\" style=\"background:#0891b2;color:#fff;border:none;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600\">&#8595; CSV</button>':'&mdash;'}</td></tr>`;
    }).join("");
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="9" class="px-5 py-8 text-center text-sm text-red-400">Error: ${e.message}</td></tr>`;
  }
}

async function loadEmpresaConfig() {
  renderMessage("boxEmpresaMessage","info","Cargando configuración...");
  try {
    const data = await postJson(WEBHOOK_ADMIN, {accion:"get_configuracion_empresa"});
    if (data.ok && data.empresa) {
      document.getElementById("cfgEmpresaNombre").value   = data.empresa.nombre   || "";
      document.getElementById("cfgEmpresaSector").value   = data.empresa.sector   || "";
      document.getElementById("cfgEmpresaTamano").value   = data.empresa.tamano   || "";
      document.getElementById("cfgEmpresaContexto").value = data.empresa.contexto || "";
      document.getElementById("cfgAdminNombre").value     = data.empresa.admin    || "";
      renderMessage("boxEmpresaMessage","success","Configuración cargada.");
    } else {
      renderMessage("boxEmpresaMessage","info","Sin configuración guardada. Completa el formulario.");
    }
  } catch(e) { renderMessage("boxEmpresaMessage","error","Error: "+e.message); }
}

async function saveEmpresaConfig() {
  const nombre   = document.getElementById("cfgEmpresaNombre").value.trim();
  const sector   = document.getElementById("cfgEmpresaSector").value;
  const tamano   = document.getElementById("cfgEmpresaTamano").value;
  const contexto = document.getElementById("cfgEmpresaContexto").value.trim();
  const admin    = document.getElementById("cfgAdminNombre").value.trim();
  if (!nombre||!sector||!tamano||!contexto) {
    renderMessage("boxEmpresaMessage","warning","Completa todos los campos obligatorios."); return;
  }
  renderMessage("boxEmpresaMessage","info","Guardando...");
  try {
    const data = await postJson(WEBHOOK_ADMIN, {
      accion:"guardar_configuracion_empresa",
      empresa:{nombre,sector,tamano,contexto,admin}
    });
    if (data.ok) renderMessage("boxEmpresaMessage","success","Guardado correctamente.");
    else renderMessage("boxEmpresaMessage","error", data.mensaje||"No se pudo guardar.");
  } catch(e) { renderMessage("boxEmpresaMessage","error","Error: "+e.message); }
}

async function saveAccesos() {
  renderMessage("boxAccesosMessage","info","La rotacion de contraseÃ±as fue deshabilitada en esta version por seguridad. Actualiza LEVANTAMIENTO_ADMIN_PASSWORD y LEVANTAMIENTO_CONSULTOR_PASSWORD en n8n para cambiar accesos.");
  ["pwdConsultor","pwdAdmin","pwdActual"].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
}

/* ── Safe DOM helpers ── */
function setText(id, val) { const e = document.getElementById(id); if (e) e.textContent = val; }
function setStyle(id, prop, val) { const e = document.getElementById(id); if (e) e.style[prop] = val; }
function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}
function pickFirstNumber(obj, keys) {
  for (const key of keys) {
    const raw = obj?.[key];
    const num = Number(raw);
    if (raw !== "" && raw != null && Number.isFinite(num)) return num;
  }
  return null;
}
function pickFirstText(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}
function buildPill(label, colors) {
  return `<span class="tag px-2 py-1 rounded-lg" style="background:${colors.bg};color:${colors.text};border:1px solid ${colors.border}">${label}</span>`;
}
function getConfidenceMeta(valuePct) {
  if (valuePct >= 80) {
    return { label: "Alta", shortLabel: "Alta", colors: { bg:"#dcfce7", text:"#166534", border:"#bbf7d0" } };
  }
  if (valuePct >= 60) {
    return { label: "Media", shortLabel: "Media", colors: { bg:"#fef3c7", text:"#92400e", border:"#fde68a" } };
  }
  return { label: "Baja", shortLabel: "Baja", colors: { bg:"#fee2e2", text:"#b91c1c", border:"#fecaca" } };
}
function deriveQualityMetrics(exp) {
  const directValue = pickFirstNumber(exp, [
    "valor_pct","valor","porcentaje_valor","porcentaje_valor_respondido",
    "valor_respuestas_pct","calidad_pct","porcentaje_calidad","quality_pct","score_valor"
  ]);
  const progressPct = clampPercent(exp?.progreso);
  const high = Math.max(0, pickFirstNumber(exp, ["respuestas_altas","altas","cantidad_altas"]) || 0);
  const medium = Math.max(0, pickFirstNumber(exp, ["respuestas_medias","medias","cantidad_medias"]) || 0);
  const low = Math.max(0, pickFirstNumber(exp, ["respuestas_bajas","bajas","cantidad_bajas","preguntas_criticas_debiles"]) || 0);
  const repreguntas = Math.max(0, pickFirstNumber(exp, ["repreguntas","total_repreguntas","cantidad_repreguntas"]) || 0);
  const totalRated = high + medium + low;

  let valuePct;
  let source = directValue != null ? "backend" : "estimada";
  if (directValue != null) {
    valuePct = clampPercent(directValue);
  } else if (totalRated > 0) {
    valuePct = clampPercent(((high * 100) + (medium * 70) + (low * 35)) / totalRated);
  } else {
    const heuristicBase = (progressPct * 0.65) + (exp?.estado === "Cerrado" ? 20 : 8) - Math.min(repreguntas * 3, 18);
    valuePct = clampPercent(heuristicBase);
  }

  const explicitConfidence = pickFirstText(exp, ["confianza_entregable","confianza","nivel_confianza"]);
  let confidence = getConfidenceMeta(valuePct);
  if (explicitConfidence) {
    const normalized = explicitConfidence.toLowerCase();
    if (normalized.includes("alta")) confidence = getConfidenceMeta(85);
    else if (normalized.includes("media")) confidence = getConfidenceMeta(65);
    else if (normalized.includes("baja")) confidence = getConfidenceMeta(35);
  }

  const weakCritical = Math.max(0, pickFirstNumber(exp, [
    "preguntas_criticas_debiles","criticas_debiles","preguntas_debiles","respuestas_criticas_bajas"
  ]) || 0);
  const ready = valuePct >= 80 && weakCritical === 0;

  return {
    valuePct,
    source,
    high,
    medium,
    low,
    repreguntas,
    weakCritical,
    ready,
    confidence
  };
}
function renderMetricBar(pct, colors) {
  const value = clampPercent(pct);
  return `<div style="display:flex;align-items:center;gap:6px">
    <div style="flex:1;height:4px;border-radius:9999px;background:#e4e4e7;min-width:60px">
      <div style="height:4px;border-radius:9999px;background:${colors};width:${value}%"></div>
    </div>
    <span class="mono text-xs text-zinc-500">${value}%</span>
  </div>`;
}
/* ── Interview state ── */
function applyState(data) {
  // Limpiar cualquier mensaje de error previo al recibir respuesta exitosa
  renderMessage("boxMessage","","");
  const prevQuestionId = appState.preguntaActualId || "";
  appState.codigoExpediente    = data.codigo_expediente   || "";
  appState.preguntaActualId    = data.pregunta_actual_id  || "";
  appState.preguntaActualTexto = data.pregunta_actual     || "";
  appState.preguntaAyuda       = data.ayuda               || "";
  appState.identificadorColaborador = data.identificador_colaborador || appState.identificadorColaborador || "";
  appState.preguntaTipo        = data.tipo_respuesta      || "Texto largo";
  appState.preguntaOpciones    = data.opciones            || [];
  appState.progreso            = Number(data.progreso     || 0);
  appState.estadoExpediente    = data.estado_expediente   || appState.estadoExpediente || "En curso";
  appState.cargo         = data.cargo_actual   || appState.cargo         || "Levantamiento de cargos";
  appState.area          = data.area            || appState.area          || "";
  appState.jefeInmediato = data.jefe_inmediato  || appState.jefeInmediato || "";
  appState.nombreEntrevistado  = data.nombre_colaborador  || appState.nombreEntrevistado || "";
  appState.resumenIA           = data.ultima_respuesta_resumida || data.resumen_ia || "";
  if (prevQuestionId && appState.preguntaActualId && prevQuestionId !== appState.preguntaActualId) {
    clearDraft();
  }
  persistSession();
}

function qNum(id) { return Number(String(id||"").replace("P",""))||0; }

function phaseInfo(id) {
  const n   = qNum(id);
  const idx = PHASES.findIndex(p => n >= p.range[0] && n <= p.range[1]);
  const ph  = idx>=0 ? PHASES[idx] : PHASES[0];
  return {
    fase:     `Fase ${idx>=0?idx+1:1}`,
    titulo:   ph.label,
    tiempo:   ph.eta,
    siguiente: PHASES[idx+1]?.label || "Cierre"
  };
}

function renderSteps(id) {
  const n   = qNum(id);
  const cur = PHASES.findIndex(p => n >= p.range[0] && n <= p.range[1]);
  document.getElementById("stepsContainer").innerHTML = PHASES.map((ph,i) => {
    const done   = i <  cur;
    const active = i === cur;
    const dotBg  = done   ? "linear-gradient(135deg,#9333ea,#ec4899)"
                 : active ? "#ffffff"
                 :          "rgba(255,255,255,0.20)";
    const dotClr = done||active ? "#18181b" : "rgba(255,255,255,0.55)";
    const txtClr = active ? "color:white;font-weight:500"
                 : done   ? "color:#a1a1aa"
                 :          "color:#b4b4b8";
    return `<div class="flex items-center gap-3 py-0.5">
      <div class="step-dot" style="background:${dotBg};color:${dotClr}">
        ${done?"✓":i+1}
      </div>
      <span class="text-xs" style="${txtClr}">${ph.label}</span>
    </div>`;
  }).join("");
}

function getFixedHelp(questionId) {
  const AYUDAS_FIJAS = {
    P05: "Indica el nombre completo y el cargo. Ej: Juan Perez - Gerente de Logistica"
  };
  return AYUDAS_FIJAS[questionId] || "";
}

function renderAnswerInput() {
  const tipo = appState.preguntaTipo;
  const ta   = document.getElementById("answerTextarea");
  const btns = document.getElementById("answerButtons");
  document.getElementById("txtRespuesta").value = "";

  // Opciones hardcoded por pregunta
  const OPCIONES_FIJAS = {
    P07: ["Si","No"],
    P09: ["Estratégico","Táctico","Operativo","Administrativo"],
    P41: ["Alto","Medio","Bajo"]
  };
  const opsFijas = OPCIONES_FIJAS[appState.preguntaActualId] || [];
  const ops      = opsFijas.length ? opsFijas : (appState.preguntaOpciones || []);

  if (tipo==="Si/No" || tipo==="Seleccion unica" || ops.length) {
    ta.classList.add("hidden");
    btns.classList.remove("hidden");
    btns.innerHTML = ops.map((opt, i) =>
      `<button class="answer-btn" data-idx="${i}">${opt}</button>`
    ).join("");
    btns.querySelectorAll(".answer-btn").forEach(btn => {
      btn.addEventListener("click", function() { selectOpt(this, this.textContent); });
    });
  } else {
    btns.classList.add("hidden");
    ta.classList.remove("hidden");
    setTimeout(() => document.getElementById("txtRespuesta").focus(), 80);
  }
  restoreDraft();
}

function selectOpt(btn, value) {
  document.querySelectorAll(".answer-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  document.getElementById("txtRespuesta").value = value;
  renderAuxiliaryAnswerFields();
  saveDraft();
}

function renderInterviewView() {
  const ph = phaseInfo(appState.preguntaActualId);
  renderSteps(appState.preguntaActualId);
  renderAnswerInput();

  setText("lblCargo", appState.cargo || "Levantamiento de cargos");
  setText("lblMetaExpediente", `Área: ${appState.area||"—"} · Jefe inmediato: ${appState.jefeInmediato||"—"}`);
  setText("lblCodigoExpediente", appState.codigoExpediente||"—");
  setText("lblEntrevistado", appState.nombreEntrevistado||"—");
  setText("lblFase", ph.fase);
  setText("lblTituloFase", ph.titulo);
  setText("lblTiempoEstimado", ph.tiempo);
  setText("lblPreguntaId", appState.preguntaActualId||"—");
  setText("txtPreguntaActual", appState.preguntaActualTexto||"—");
  // Ayuda: show block only when there is help text
  const ayudaBox = document.getElementById("boxAyuda");
  const ayudaTxt = document.getElementById("txtAyuda");
  const ayudaVisible = getFixedHelp(appState.preguntaActualId) || appState.preguntaAyuda;
  if (ayudaVisible && ayudaVisible.trim()) {
    ayudaTxt.textContent = ayudaVisible;
    ayudaBox.classList.remove("hidden");
  } else {
    ayudaBox.classList.add("hidden");
    ayudaTxt.textContent = "";
  }
  setText("lblSiguienteFase", ph.siguiente);
  setText("lblEstadoExpediente", appState.estadoExpediente||"—");
  setText("lblRespondidoPor", appState.nombreEntrevistado||"Colaborador");
  setText("lblUltimaActualizacion", new Date().toLocaleString("es-CO",{dateStyle:"short",timeStyle:"short"}));

  const pct = Math.max(0,Math.min(100,appState.progreso));
  setStyle("progressBar", "width", pct+"%");
  setText("lblProgreso", pct+"% completado");

  // Question counter + phase detection (phIdx declared once, used in both)
  const qN    = qNum(appState.preguntaActualId);
  const phIdx = PHASES.findIndex(p => qN >= p.range[0] && qN <= p.range[1]);

  // Phase transition detection
  const banner    = document.getElementById("bannerFaseCambio");
  const bannerTxt = document.getElementById("txtFaseCambio");
  const newFase   = phIdx >= 0 ? PHASES[phIdx].label : "";
  if (appState.faseActual && appState.faseActual !== newFase && newFase) {
    bannerTxt.textContent = `Nueva fase: ${newFase}`;
    banner.classList.remove("hidden");
    setTimeout(() => banner.classList.add("hidden"), 4000);
  }
  appState.faseActual = newFase;

  // Question counter within phase
  if (phIdx >= 0) {
    const ph2       = PHASES[phIdx];
    const qInFase   = qN - ph2.range[0] + 1;
    const totalFase = ph2.range[1] - ph2.range[0] + 1;
    setText("lblContadorFase", `${qInFase} / ${totalFase} en esta fase`);
  }

  // Resumen IA: only show when there is content
  const resumenCard = document.getElementById("cardResumenIA");
  const resumenTxt  = document.getElementById("boxResumenIA");
  if (appState.resumenIA && appState.resumenIA.trim()) {
    resumenTxt.textContent = appState.resumenIA;
    resumenCard.classList.remove("hidden");
  } else {
    resumenCard.classList.add("hidden");
  }

  renderMessage("boxMessage","","");
}

/* ── Submit ── */
async function submitAnswer() {
  const respuesta = document.getElementById("txtRespuesta").value.trim();
  if (!appState.codigoExpediente || !appState.preguntaActualId) {
    renderMessage("boxMessage","error","No hay una entrevista activa."); return;
  }
  if (!respuesta) {
    renderMessage("boxMessage","warning","Escribe o selecciona una respuesta."); return;
  }
  const btn = document.getElementById("btnContinuar");
  const spinner = document.getElementById("btnSpinner");
  const btnLabel = document.getElementById("btnContinuarLabel");
  btn.disabled = true;
  isSubmittingAnswer = true;
  spinner.classList.remove("hidden");
  btnLabel.textContent = "Guardando...";
  renderMessage("boxMessage","info","Guardando respuesta...");
  try {
    let answerPayload;
    try {
      answerPayload = buildAnswerSubmission();
    } catch (validationError) {
      renderMessage("boxMessage","warning", validationError.message || "Completa los datos requeridos antes de continuar.");
      return;
    }

    const data = await postJson(WEBHOOK_URL, {
      codigo_expediente:          appState.codigoExpediente,
      pregunta_actual_id_enviada: appState.preguntaActualId,
      respuesta:                  answerPayload.respuesta,
      cargo_actual_select:        answerPayload.cargo_actual_select || "",
      cargo_actual_otro:          answerPayload.cargo_actual_otro || "",
      departamento_select:        answerPayload.departamento_select || "",
      departamento_otro:          answerPayload.departamento_otro || "",
      jefe_inmediato_select:      answerPayload.jefe_inmediato_select || "",
      nombre_jefe_inmediato:      answerPayload.nombre_jefe_inmediato || "",
      intento_numero:             appState._intentoPreguntaActual   || 1,
      respuesta_anterior:         appState._respuestaAnteriorActual || "",
    });
    if (data.ok && data.estado==="listo_para_cierre") {
      clearDraft();
      resetEntregableConsulta();
      appState.progreso = Number(data.progreso||100);
      setText("txtFinalMessage", data.mensaje || "La entrevista ha terminado.");
      showScreen("Final"); return;
    }
    if (data.ok) { clearDraft(); applyState(data); renderInterviewView(); return; }
    if (!data.ok && (data.tipo === "respuesta_insuficiente" || data.error === "respuesta_insuficiente")) {
      appState._respuestaAnteriorActual = respuesta;
      appState._intentoPreguntaActual   = (appState._intentoPreguntaActual || 1) + 1;
      const MENSAJES_TIPO = {
        sin_numeros:      "Esta pregunta espera cantidades o tiempos. Puedes agregar un numero aproximado?",
        sin_herramientas: "Menciona los sistemas o programas que usas para esta actividad.",
        sin_ejemplos:     "Da un ejemplo concreto de lo que haces en tu cargo.",
        sin_proceso:      "Describe como lo haces paso a paso.",
        evasion:          "La respuesta no corresponde a lo preguntado. Puedes intentarlo de nuevo?",
        muy_vaga:         "Agrega un dato concreto: numero, herramienta, frecuencia o ejemplo especifico.",
        sin_relacion:     "La respuesta no describe actividades laborales reales. Intenta responder con tareas concretas de tu cargo.",
      };
      const mensajeServidor = String(data.message || data.mensaje || "").trim();
      const sugerenciaIA = String(data.sugerencia || "").trim();
      const mensajeGenerico = /amplia tu respuesta|agrega un poco mas de contexto|un poco mas de detalle/i.test(mensajeServidor);
      const razon = String(data.razon_corta || "").trim();
      const faltantes = Array.isArray(data.datos_faltantes)
        ? data.datos_faltantes.filter(Boolean).join(", ")
        : String(data.datos_faltantes || "").trim();
      if (data.pregunta_actual_id) appState.preguntaActualId = data.pregunta_actual_id;
      if (data.pregunta_actual) appState.preguntaActualTexto = repairPossibleMojibake(data.pregunta_actual);
      if (Object.prototype.hasOwnProperty.call(data, "ayuda")) appState.preguntaAyuda = repairPossibleMojibake(data.ayuda || "");
      if (data.tipo_respuesta) appState.preguntaTipo = data.tipo_respuesta;
      if (Array.isArray(data.opciones)) appState.preguntaOpciones = normalizeQuestionOptions(data.opciones);
      renderInterviewView();
      const inputAfterRefresh = document.getElementById("txtRespuesta");
      if (inputAfterRefresh) inputAfterRefresh.value = respuesta;
      const msgFinal = sugerenciaIA
        || (!mensajeGenerico ? mensajeServidor : "")
        || (razon || faltantes
          ? ["Motivo: " + razon, faltantes ? "Agrega: " + faltantes : ""].filter(Boolean).join(" ")
          : "")
        || ((data.tipo_problema && MENSAJES_TIPO[data.tipo_problema])
          ? MENSAJES_TIPO[data.tipo_problema]
          : "Amplia tu respuesta con un poco mas de detalle.");
      isSubmittingAnswer = false;
      btn.disabled = false;
      spinner.classList.add("hidden");
      btnLabel.textContent = "Guardar y continuar ->";
      renderMessage("boxMessage", "warning", msgFinal);
      const input = document.getElementById("txtRespuesta");
      if (input) input.focus();
      return;
    }
    if (data.error==="expediente_en_procesamiento") {
      renderMessage("boxMessage","warning", data.mensaje||"Expediente en procesamiento, espera unos segundos.");
      return;
    }
    if (data.error==="pregunta_fuera_de_secuencia") {
      // Resincronizar estado silenciosamente
      applyState(data);
      renderInterviewView();
      return;
    }
    if (data.recuperable) { await tryRecover(data.mensaje); return; }
    renderMessage("boxMessage","error", data.mensaje||"Error al guardar.");
  } catch(e) {
    // Solo mostrar error si la respuesta no llegó (error de red puro)
    const esMensajeRed = e instanceof TypeError && e.message.includes("fetch");
    if (esMensajeRed) {
      renderMessage("boxMessage","error","Error de conexión. Verifica tu red e intenta nuevamente.");
    } else {
      console.error("[submitAnswer catch]", e.message);
    }
    // NUNCA llamar tryRecover aquí: evita el mensaje falso
  } finally {
    isSubmittingAnswer = false;
    btn.disabled = false;
    spinner.classList.add("hidden");
    btnLabel.textContent = "Guardar y continuar →";
  }
}

async function tryRecover(msg) {
  renderMessage("boxMessage","warning", msg||"Problema temporal. Recargando...");
  if (!appState.identificadorColaborador) return;
  setTimeout(async () => {
    try {
      const data = await postJson(WEBHOOK_URL,
        {accion:"iniciar_o_retomar", identificador_colaborador:appState.identificadorColaborador});
      if (data.ok) { applyState(data); renderInterviewView(); renderMessage("boxMessage","info","Entrevista recargada."); }
    } catch { renderMessage("boxMessage","error","No fue posible recuperar la entrevista."); }
  }, 2000);
}

async function closeExpediente() {
  if (!appState.codigoExpediente) {
    renderMessage("boxFinalMessage","error","No hay expediente activo."); return;
  }
  const btn = document.getElementById("btnFinalizar");
  btn.disabled=true; btn.textContent="Cerrando...";
  renderMessage("boxFinalMessage","info","Cerrando y generando entregables...");
  try {
    const data = await postJson(WEBHOOK_URL,
      {codigo_expediente:appState.codigoExpediente, accion:"cerrar_expediente"});
    console.log("Respuesta cierre expediente", data);
    if (data.ok) {
      clearDraft();
      const info = storeEntregableInfo(data);
      console.log("Entregables detectados", info);
      renderMessage("boxFinalMessage","success", data.mensaje||"Expediente cerrado.");
      if (!info.entregableVersionId) {
        renderMessage("boxFinalMessage","warning","Expediente cerrado correctamente. El entregable no fue devuelto por la respuesta de cierre. Consulte auditoria o intente recargar.");
      }
    }
    else renderMessage("boxFinalMessage","error", data.mensaje||"No se pudo cerrar.");
  } catch(e) { renderMessage("boxFinalMessage","error","Error: "+e.message); }
  finally { btn.disabled=false; btn.textContent="Finalizar expediente"; }
}

function goBackToStart() {
  Object.assign(appState,{
    rol:"",tokenSesion:"",identificadorColaborador:"",codigoExpediente:"",
    preguntaActualId:"",preguntaActualTexto:"",preguntaAyuda:"",
    preguntaTipo:"Texto largo",preguntaOpciones:[],progreso:0,
    estadoExpediente:"",cargo:"",area:"",jefeInmediato:"",nombreEntrevistado:"",
    nombreJefeInmediato:"",resumenIA:"",faseActual:"",
    entregableId:"",entregableVersionId:"",idEntregablePg:"",versionAgente:"",estadoGeneracion:""
  });
  ["txtLoginCedula","txtLoginPassword","txtRespuesta"].forEach(id => {
    const el=document.getElementById(id); if(el) el.value="";
  });
  document.querySelectorAll(".role-card").forEach(c=>c.classList.remove("selected"));
  document.getElementById("loginColaborador").classList.add("hidden");
  document.getElementById("loginPassword").classList.add("hidden");
  ["boxLoginMessage","boxMessage","boxFinalMessage"].forEach(id=>renderMessage(id,"",""));
  clearSession();

showScreen("Login");
}

/* ── Keyboard shortcuts ── */
document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.key==="Enter" && !document.getElementById("screenInterview").classList.contains("hidden"))
    submitAnswer();
  if (e.key==="Enter" && document.activeElement?.id==="txtLoginCedula")  loginColaborador();
  if (e.key==="Enter" && document.activeElement?.id==="txtLoginPassword") loginConPassword();
});

window.addEventListener("beforeunload", function(e) {
  const answerEl = document.getElementById("txtRespuesta");
  const hasDraft = !!(answerEl && answerEl.value && answerEl.value.trim());
  if (isSubmittingAnswer || (appState.codigoExpediente && hasDraft)) {
    saveDraft();
    e.preventDefault();
    e.returnValue = "";
  }
});

document.addEventListener("input", function(e) {
  if (e.target && e.target.id === "txtRespuesta") {
    saveDraft();
  }
});

window.addEventListener("load", function() {
  const persisted = loadPersistedSession();
  if (!persisted) return;

  if (persisted.identificadorColaborador) {
    appState.identificadorColaborador = persisted.identificadorColaborador;
    const cedulaEl = document.getElementById("txtLoginCedula");
    if (cedulaEl && !cedulaEl.value) cedulaEl.value = persisted.identificadorColaborador;
  }

  if (persisted.rol === "admin" || persisted.rol === "consultor") {
    appState.rol = persisted.rol;
    appState.tokenSesion = persisted.tokenSesion || "";
    selectRole(appState.rol);
    if (appState.tokenSesion) {
      document.getElementById("adminRolLabel").textContent =
        appState.rol === "admin" ? "Administrador" : "Consultor LMSS";
      document.querySelectorAll(".admin-only").forEach(el =>
        el.style.display = appState.rol === "admin" ? "" : "none");
      showScreen("Admin");
      showAdminSection("Dashboard");
      loadDashboard();
    }
    return;
  }

  if (persisted.identificadorColaborador) {
    return;
  }
});





function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeUtf8Text(value) {
  return String(value == null ? "" : value).normalize("NFC");
}

function limpiarTextoExportable(texto) {
  return String(texto || "")
    .replace(/<[a-z][a-z0-9]*[^>]*>\s*Fin del an[aá]lisis de carga y tiempos\s*<\/[a-z][a-z0-9]*>/gi, "")
    .replace(/<[a-z][a-z0-9]*[^>]*>\s*Fin del contraste con mejores pr[aá]cticas\s*<\/[a-z][a-z0-9]*>/gi, "")
    .replace(/^\s*Fin del an[aá]lisis de carga y tiempos\s*$/gmi, "")
    .replace(/^\s*Fin del contraste con mejores pr[aá]cticas\s*$/gmi, "");
}

function csvEscape(value) {
  var s = normalizeUtf8Text(value);
  if (/[";\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function downloadCsvFile(filename, content) {
  var text = normalizeUtf8Text(content);
  var buffer = new Uint8Array(2 + text.length * 2);
  buffer[0] = 0xFF;
  buffer[1] = 0xFE;
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i);
    buffer[2 + i * 2] = code & 0xFF;
    buffer[3 + i * 2] = code >> 8;
  }
  var blob = new Blob([buffer], {type:'text/csv;charset=utf-16;'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

function sleep(ms) {
  return new Promise(function(resolve){ setTimeout(resolve, ms); });
}

window.generarEntregableExpediente = async function(codigo, btnEl) {
  var codigoOriginal = normalizarCodigo(codigo || "");
  var btn = btnEl || null;
  var orig = btn ? btn.innerHTML : "";
  if (!ensureAdminToken()) {
    alert("La sesión administrativa no está disponible. Inicia sesión nuevamente.");
    return;
  }
  if (!codigoOriginal || !codigoOriginal.startsWith("EXP-")) {
    alert("No se encontró código de expediente válido para generar entregables: " + (codigo || "(vacío)"));
    return;
  }
  if (btn) { btn.innerHTML = "..."; btn.disabled = true; }
  try {
    var payloadGeneracion = {
      codigo_expediente: codigoOriginal,
      database_id_entregables_qa: DATABASE_ID_ENTREGABLES_QA
    };
    logSyncDebugBeforeSend(codigo, payloadGeneracion.codigo_expediente, {
      filaAdmin: buscarFilaAdminPorCodigo(codigoOriginal),
      btnDatasetCodigo: btn && btn.dataset ? btn.dataset.codigo : "",
      codigoParametro: codigo
    }, "Gen.");
    var res = await postJson(WEBHOOK_ENTREGABLES, payloadGeneracion, 0);
    logSyncDebugAfterResponse(codigo, payloadGeneracion.codigo_expediente, extraerCodigoRespuesta(res), res, "Gen.");
    if (!res || !res.ok) {
      throw new Error(res && (res.error_qa || res.mensaje || res.estado_generacion_qa) || "sin detalle");
    }
    var fresh = await fetchExpedienteCompletoForExport(codigoOriginal, "refetch_post_generate", 4);
    logSyncDebugAfterResponse(codigo, payloadGeneracion.codigo_expediente, extraerCodigoRespuesta(fresh), fresh, "Gen.refetch_post_generate");
    // Sesión expirada post-generación
    if (!fresh.ok && esSesionExpirada(fresh)) {
      handleSesionExpirada();
      alert("La sesión de administrador expiró. Inicia sesión nuevamente.");
      return;
    }
    // Mismatch post-generación
    var codigoRecibido = normalizarCodigo(fresh.expediente || {});
    if (fresh.ok && codigoRecibido && codigoRecibido !== codigoOriginal) {
      console.error("[ADMIN PDF] Mismatch post-generate", {
        accion: "generarEntregableExpediente",
        codigoSolicitado: codigoOriginal,
        codigoRecibido: codigoRecibido,
        tokenPresente: !!appState.tokenSesion
      });
      alert("Error de sincronización: el backend devolvió un expediente diferente al solicitado.");
      return;
    }
    appState.expedientesCompletosCache = appState.expedientesCompletosCache || {};
    appState.expedientesCompletosCache[codigoOriginal] = fresh;
    var ent = normalizeEntregablesForExport(fresh.entregables || {}, fresh);
    console.log("[ADMIN PDF]", {
      accion: "generarEntregableExpediente",
      codigoVisibleFila: codigo,
      codigoSolicitado: codigoOriginal,
      codigoRecibido: codigoRecibido || codigoOriginal,
      tokenPresente: !!appState.tokenSesion,
      okBackend: fresh.ok,
      mensajeBackend: fresh.mensaje,
      longitudesEntregables: (function(){ var l={}; PDF_SECTION_ORDER.forEach(function(k){ l[k]=String(ent[k]||"").length; }); return l; })(),
      fuenteDatos: "get_expediente_completo"
    });
    logPdfExportDiagnostics(codigoOriginal, "refetch_post_generate", fresh, ent, null, null);
    alert("Entregables generados para " + codigoOriginal + ".");
    await loadExpedientes();
  } catch (e) {
    alert("No se pudieron generar entregables para " + codigoOriginal + ": " + e.message);
  } finally {
    if (btn) { btn.innerHTML = orig; btn.disabled = false; }
  }
};

window.generarEntregablesFinalizados = async function(btnEl) {
  var btn = btnEl || null;
  var orig = btn ? btn.innerHTML : "";
  if (!ensureAdminToken()) {
    alert("La sesión administrativa no está disponible. Inicia sesión nuevamente.");
    return;
  }
  var expedientes = Array.isArray(appState.expedientesAdmin) && appState.expedientesAdmin.length
    ? appState.expedientesAdmin
    : [];
  if (!expedientes.length) {
    var data = await postJson(WEBHOOK_ADMIN, {accion:"listar_expedientes"});
    if (!data.ok && esSesionExpirada(data)) {
      handleSesionExpirada();
      alert("La sesión de administrador expiró. Inicia sesión nuevamente.");
      return;
    }
    expedientes = data.expedientes || [];
    appState.expedientesAdmin = expedientes;
  }
  // Snapshot inmutable antes de iterar — evita mezcla si la tabla se refresca durante el loop
  var pendientes = expedientes
    .filter(function(exp) {
      return String(exp.estado || "").toLowerCase() === "cerrado" && normalizarCodigo(exp);
    })
    .map(function(exp) {
      return {
        codigo: normalizarCodigo(exp),
        nombre: String(exp.nombre || ""),
        cargo:  String(exp.cargo  || ""),
        rowCompleta: exp
      };
    });
  if (!pendientes.length) {
    alert("No hay expedientes cerrados para generar.");
    return;
  }
  if (!confirm("Se generarán entregables 1x1 para " + pendientes.length + " expedientes cerrados, con pausa entre cada caso para proteger Notion. Este proceso puede tardar varios minutos. ¿Continuar?")) {
    return;
  }
  if (btn) { btn.innerHTML = "Generando 0/" + pendientes.length; btn.disabled = true; }
  var ok = 0, fail = 0;
  var errores = [];
  for (var i = 0; i < pendientes.length; i++) {
    var pendiente = pendientes[i];  // código inmutable, no depende del array original
    if (btn) btn.innerHTML = "Generando " + (i + 1) + "/" + pendientes.length;
    try {
      var payloadBatch = {
        codigo_expediente: pendiente.codigo,
        database_id_entregables_qa: DATABASE_ID_ENTREGABLES_QA
      };
      logSyncDebugBeforeSend(pendiente.codigo, payloadBatch.codigo_expediente, pendiente.rowCompleta || pendiente, "Generar finalizados 1x1");
      var res = await postJson(WEBHOOK_ENTREGABLES, payloadBatch, 0);
      logSyncDebugAfterResponse(pendiente.codigo, payloadBatch.codigo_expediente, extraerCodigoRespuesta(res), res, "Generar finalizados 1x1");
      if (res && res.ok) ok++;
      else {
        // Sesión expirada durante el loop
        if (res && !res.ok && esSesionExpirada(res)) {
          handleSesionExpirada();
          fail++;
          errores.push(pendiente.codigo + ": sesión expirada, proceso detenido");
          break;
        }
        fail++;
        errores.push(pendiente.codigo + ": " + (res && (res.error_qa || res.mensaje || res.estado_generacion_qa) || "sin detalle"));
      }
      if (res && res.ok) {
        var fresh = await fetchExpedienteCompletoForExport(pendiente.codigo, "refetch_post_batch_generate", 3);
        logSyncDebugAfterResponse(pendiente.codigo, payloadBatch.codigo_expediente, extraerCodigoRespuesta(fresh), fresh, "Generar finalizados 1x1.refetch_post_batch_generate");
        appState.expedientesCompletosCache = appState.expedientesCompletosCache || {};
        appState.expedientesCompletosCache[pendiente.codigo] = fresh;
      }
    } catch (e) {
      fail++;
      errores.push(pendiente.codigo + ": " + e.message);
    }
    await sleep(5000);
  }
  if (btn) { btn.innerHTML = orig; btn.disabled = false; }
  await loadExpedientes();
  var msg = "Generación finalizada. OK: " + ok + ". Con error: " + fail + ".";
  if (errores.length) msg += "\n\nPrimeros errores:\n" + errores.slice(0, 8).join("\n");
  alert(msg);
};

function normalizeEntregablesForExport(entregables) {
  var rawArgs = Array.prototype.slice.call(arguments);
  var sources = [];
  rawArgs.forEach(function(src) {
    if (!src || typeof src !== "object") return;
    sources.push(src);
    ["entregables", "entregables_qa", "qa_entregables", "ultimo_entregable_qa", "latest_qa", "qa", "expediente"].forEach(function(key) {
      if (src[key] && typeof src[key] === "object") sources.push(src[key]);
    });
  });
  var ent = Object.assign({}, entregables || {});
  var aliases = {
    perfil_seleccion: ["perfil_de_seleccion","perfil_seleccion","perfilSeleccion","Perfil de seleccion","Perfil de selección","Perfil de Seleccion","Perfil de Selección","Perfil Seleccion","Perfil selección"],
    manual_cargo: ["manual_de_cargo","manual_cargo","manualCargo","Manual de cargo","Manual de Cargo","Descripcion del cargo","Descripción del cargo"],
    kpis_sugeridos: ["kpis_sugeridos","indicadores","kpisSugeridos","KPIs sugeridos","KPIs Sugeridos","Indicadores de gestion","Indicadores de gestión"],
    hallazgos_optimizacion: ["hallazgos_optimizacion","hallazgosOptimizacion","Hallazgos de optimizacion","Hallazgos de optimización","Hallazgos de Optimizacion","Hallazgos de Optimización","Hallazgos optimizacion"],
    recomendaciones_finales: ["recomendaciones_finales","recomendacionesFinales","Recomendaciones finales","Recomendaciones Finales","Recomendaciones finales del cargo"],
    matriz_funciones_responsabilidades: ["matriz_funciones_responsabilidades","matrizFuncionesResponsabilidades","Matriz funciones y responsabilidades","Matriz de funciones y responsabilidades","Matriz de Funciones y Responsabilidades"],
    raci_basico: ["raci_basico","raciBasico","RACI basico","RACI básico","RACI Basico","RACI Básico"],
    analisis_carga_tiempos: ["analisis_carga_tiempos","analisisCargaTiempos","Analisis de carga y tiempos","Análisis de carga y tiempos","Analisis carga tiempos"],
    contraste_mejores_practicas: ["contraste_mejores_practicas","contrasteMejoresPracticas","Contraste con mejores practicas","Contraste con mejores prácticas","Contraste con Mejores Practicas","Contraste con Mejores Prácticas"]
  };
  function normKey(key) {
    return String(key || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }
  function asText(value) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.map(asText).filter(Boolean).join("\n");
    if (typeof value === "object") {
      if (value.plain_text) return String(value.plain_text);
      if (value.text && value.text.content) return String(value.text.content);
      if (Array.isArray(value.rich_text)) return value.rich_text.map(asText).filter(Boolean).join("");
      if (Array.isArray(value.title)) return value.title.map(asText).filter(Boolean).join("");
      if (value.content) return asText(value.content);
      if (value.value) return asText(value.value);
    }
    return "";
  }
  function findByAliases(aliasList) {
    var wanted = {};
    aliasList.forEach(function(alias){ wanted[normKey(alias)] = true; });
    for (var s = 0; s < sources.length; s++) {
      var src = sources[s] || {};
      for (var key in src) {
        if (Object.prototype.hasOwnProperty.call(src, key) && wanted[normKey(key)]) {
          var text = asText(src[key]).trim();
          if (text) return text;
        }
      }
    }
    return "";
  }
  Object.keys(aliases).forEach(function(canonical) {
    var current = String(ent[canonical] || "").trim();
    var found = current || findByAliases(aliases[canonical]);
    if (found) ent[canonical] = found;
  });
  ent.manual_de_cargo = ent.manual_de_cargo || ent.manual_cargo || "";
  ent.manual_cargo = ent.manual_cargo || ent.manual_de_cargo || "";
  ent.perfil_de_seleccion = ent.perfil_de_seleccion || ent.perfil_seleccion || "";
  ent.perfil_seleccion = ent.perfil_seleccion || ent.perfil_de_seleccion || "";
  ent.indicadores = ent.indicadores || ent.kpis_sugeridos || "";
  return ent;
}

var PDF_SECTION_ORDER = [
  "perfil_seleccion",
  "manual_cargo",
  "kpis_sugeridos",
  "hallazgos_optimizacion",
  "recomendaciones_finales",
  "matriz_funciones_responsabilidades",
  "raci_basico",
  "analisis_carga_tiempos",
  "contraste_mejores_practicas"
];

function validateExpedientePrintPayload(exp, ent, resp) {
  var diagnostics = getExportSectionDiagnostics(ent);
  var missing = PDF_SECTION_ORDER.filter(function(key) {
    return !diagnostics[key] || !diagnostics[key].present;
  });
  var presentCount = PDF_SECTION_ORDER.length - missing.length;
  if (!presentCount) {
    return { ok: false, message: "No se puede exportar PDF final. Ninguna sección de entregables tiene contenido útil." };
  }
  var respuestas = normalizeResponseItems(resp);
  var warnings = [];
  if (missing.length) warnings.push("Secciones no detectadas: " + missing.map(entregableLabel).join(", "));
  if (!respuestas.length) warnings.push("No se detectó anexo de preguntas y respuestas.");
  var visibleValues = [];
  Object.keys(exp || {}).forEach(function(key) {
    if (exp[key] || exp[key] === 0 || exp[key] === false) visibleValues.push(exp[key]);
  });
  PDF_SECTION_ORDER.forEach(function(key) { visibleValues.push(ent[key] || ""); });
  var hasBadLiteral = visibleValues.some(function(value) {
    return /\b(undefined|null|NaN|\[object Object\])\b/i.test(String(value || ""));
  });
  if (hasBadLiteral) {
    return { ok: false, message: "No se puede exportar PDF final. Hay valores técnicos sin resolver en el contenido." };
  }
  return { ok: true, respuestas: respuestas, warnings: warnings };
}

function hasMeaningfulSectionContent(value) {
  var text = String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#+\s+.*/gm, " ")          // headings markdown
    .replace(/[#*_`|>\-–—=]/g, " ")     // markdown symbols
    .replace(/^\s*[-*+]\s+/gm, " ")      // list bullets
    .replace(/\bplaceholder\b/gi, " ")   // literal "placeholder"
    .replace(/\bempty\b/gi, " ")         // literal "empty"
    .replace(/\bN\/A\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 100;
}

function getExportSectionDiagnostics(ent) {
  var result = {};
  PDF_SECTION_ORDER.forEach(function(key) {
    var value = String(ent[key] || "");
    result[key] = {
      length: value.trim().length,
      present: hasMeaningfulSectionContent(value)
    };
  });
  return result;
}

function logPdfExportDiagnostics(codigo, source, data, ent, validation, blob) {
  var diagnostics = getExportSectionDiagnostics(ent || {});
  var missing = Object.keys(diagnostics).filter(function(key){ return !diagnostics[key].present; });
  console.info("[PDF export]", {
    codigo_expediente: codigo,
    fuente_datos: source,
    webhook_status: data && (data.estado_generacion_qa || data.status || data.ok),
    secciones: diagnostics,
    secciones_faltantes_reales: missing.map(entregableLabel),
    blob_size: blob ? blob.size : 0
  });
  if (validation && !validation.ok) console.warn("[PDF export] validacion", validation.message);
}

async function fetchExpedienteCompletoForExport(codigoSolicitado, source, retries) {
  var codigoNorm = normalizarCodigo(codigoSolicitado);
  var lastData = null;
  for (var attempt = 0; attempt <= (retries || 0); attempt++) {
    var payloadRefetch = {
      accion: "get_expediente_completo",
      codigo_expediente: codigoNorm || codigoSolicitado,
      _ts: Date.now()
    };
    logSyncDebugBeforeSend(codigoSolicitado, payloadRefetch.codigo_expediente, {
      source: source || "refetch",
      intento: attempt + 1
    }, "get_expediente_completo");
    var data = await postJson(WEBHOOK_ADMIN, payloadRefetch);
    logSyncDebugAfterResponse(codigoSolicitado, payloadRefetch.codigo_expediente, extraerCodigoRespuesta(data), data, "get_expediente_completo");
    lastData = data;

    // Corto-circuito en ok:false — no reintentar errores de sesión o datos
    if (!data.ok) {
      return data;
    }

    // Detectar mismatch: backend devolvió un expediente diferente al solicitado
    var codigoRecibido = normalizarCodigo(data.expediente || {});
    if (codigoNorm && codigoRecibido && codigoRecibido !== codigoNorm) {
      console.error("[ADMIN] fetchExpedienteCompletoForExport mismatch", {
        codigoSolicitado: codigoNorm,
        codigoRecibido: codigoRecibido,
        fuente: source,
        intento: attempt + 1
      });
      return {
        ok: false,
        _mismatch: true,
        mensaje: "Error de sincronización: el backend devolvió un expediente diferente al solicitado.",
        _debug: { codigoSolicitado: codigoNorm, codigoRecibido: codigoRecibido, source: source }
      };
    }

    var ent = normalizeEntregablesForExport(data.entregables || {}, data);
    var diagnostics = getExportSectionDiagnostics(ent);
    var presentCount = Object.keys(diagnostics).filter(function(key){ return diagnostics[key].present; }).length;
    console.info("[PDF export] refetch", {
      codigo_expediente: codigoNorm,
      codigo_recibido: codigoRecibido,
      fuente_datos: source || "refetch",
      intento: attempt + 1,
      secciones_presentes: presentCount,
      secciones: diagnostics
    });
    if (presentCount > 0 || attempt === (retries || 0)) {
      data.entregables = ent;
      data._export_source = source || "refetch";
      return data;
    }
    await sleep(1500);
  }
  return lastData;
}

function collectExportRows(data) {
  var rows = [];
  var exp = data.expediente || {};
  var ent = normalizeEntregablesForExport(data.entregables || {}, data);
  var resp = data.respuestas || [];
  var seenResponseKeys = {};
  var canonicalEntKeys = [
    "perfil_seleccion",
    "manual_cargo",
    "kpis_sugeridos",
    "hallazgos_optimizacion",
    "recomendaciones_finales",
    "matriz_funciones_responsabilidades",
    "raci_basico",
    "analisis_carga_tiempos",
    "contraste_mejores_practicas"
  ];

  Object.keys(exp).forEach(function(key) {
    if (exp[key] || exp[key] === 0 || exp[key] === false) {
      rows.push({ section: "Expediente", field: key, value: exp[key] });
    }
  });

  canonicalEntKeys.forEach(function(key) {
    if (ent[key]) {
      rows.push({ section: "Entregables", field: key, value: ent[key] });
    }
  });

  if (Array.isArray(resp) && resp.length) {
    resp.forEach(function(item, index) {
      if (!item.respuesta) return;
      var dedupeKey = [
        String(item.orden == null ? "" : item.orden).trim(),
        String(item.id_pregunta || "").trim().toLowerCase(),
        String(item.pregunta || "").trim().toLowerCase(),
        String(item.respuesta || "").trim().toLowerCase()
      ].join("|");
      if (seenResponseKeys[dedupeKey]) return;
      seenResponseKeys[dedupeKey] = true;
      rows.push({
        section: "Respuestas",
        field: (item.id_pregunta || ("P" + (index + 1))) + " - " + (item.pregunta || "Pregunta"),
        value: item.respuesta || ""
      });
    });
  }

  return rows;
}

function normalizeResponseItems(resp) {
  if (!Array.isArray(resp)) return [];
  var seen = {};
  return resp
    .filter(function(item){ return item && (item.respuesta || item.pregunta || item.id_pregunta); })
    .map(function(item, index) {
      return {
        orden: Number(item.orden || index + 1),
        id_pregunta: String(item.id_pregunta || ("P" + (index + 1))).trim(),
        pregunta: String(item.pregunta || "Pregunta").trim(),
        respuesta: String(item.respuesta || "").trim()
      };
    })
    .sort(function(a, b){ return a.orden - b.orden; })
    .filter(function(item) {
      var key = [item.orden, item.id_pregunta.toLowerCase(), item.pregunta.toLowerCase(), item.respuesta.toLowerCase()].join("|");
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
}

function renderQuestionAnswerAppendix(resp) {
  var respuestas = normalizeResponseItems(resp);
  if (!respuestas.length) return "";
  var html = '<section class="doc-section appendix-section">';
  html += '<h2>Anexo — Preguntas y respuestas del levantamiento</h2>';
  respuestas.forEach(function(item) {
    html += '<div style="border-bottom:1px solid #ececf0;padding:10px 0;break-inside:avoid;page-break-inside:avoid">';
    html += '<div style="font-size:12px;font-weight:700;color:#7c3aed;margin-bottom:4px">' + escapeHtml(item.id_pregunta) + '</div>';
    html += '<div style="font-size:13px;font-weight:700;color:#3f3f46;line-height:1.5;margin-bottom:5px">' + escapeHtml(item.pregunta) + '</div>';
    html += '<div style="font-size:12.5px;color:#52525b;line-height:1.65;white-space:pre-wrap">' + escapeHtml(item.respuesta || "Sin respuesta registrada") + '</div>';
    html += '</div>';
  });
  html += '<p class="section-end">Fin del anexo de preguntas y respuestas</p>';
  html += '</section>';
  return html;
}

function normalizeMarkdownForPrint(value) {
  var text = normalizeUtf8Text(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  var previous;
  do {
    previous = text;
    text = text.replace(/\\text\{([^{}]*)\}/g, "$1");
    text = text.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1 / $2");
  } while (text !== previous);
  return text
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\times/g, "x")
    .replace(/\\cdot/g, "x")
    .replace(/\\%/g, "%");
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function splitMarkdownTableRow(line) {
  var cleaned = String(line || "").trim();
  if (cleaned.charAt(0) === "|") cleaned = cleaned.slice(1);
  if (cleaned.charAt(cleaned.length - 1) === "|") cleaned = cleaned.slice(0, -1);
  return cleaned.split("|").map(function(cell){ return cell.trim(); });
}

function isMarkdownTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line || "");
}

function renderMarkdownTable(lines, start) {
  var header = splitMarkdownTableRow(lines[start]);
  var wideClass = header.length > 5 ? ' wide-table' : '';
  var html = '<div class="md-table-wrap"><table class="md-table' + wideClass + '"><thead><tr>';
  header.forEach(function(cell){ html += '<th>' + renderInlineMarkdown(cell) + '</th>'; });
  html += '</tr></thead><tbody>';
  var i = start + 2;
  while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) {
    var cells = splitMarkdownTableRow(lines[i]);
    html += '<tr>';
    for (var c = 0; c < header.length; c++) {
      html += '<td>' + renderInlineMarkdown(cells[c] || "") + '</td>';
    }
    html += '</tr>';
    i++;
  }
  html += '</tbody></table></div>';
  return { html: html, next: i };
}

function renderMarkdownToHtml(value) {
  var text = normalizeMarkdownForPrint(value);
  var lines = text.split("\n");
  var html = "";
  var i = 0;

  function isBlockBoundary(line, nextLine) {
    return !line.trim() ||
      /^#{1,4}\s+/.test(line) ||
      /^-{3,}\s*$/.test(line.trim()) ||
      /^[-*]\s+/.test(line) ||
      (/\|/.test(line) && isMarkdownTableSeparator(nextLine || ""));
  }

  while (i < lines.length) {
    var line = lines[i];
    var trimmed = line.trim();
    if (!trimmed) { i++; continue; }

    if (/^#{1,4}\s+/.test(trimmed)) {
      var level = Math.min((trimmed.match(/^#+/) || ["##"])[0].length, 4);
      var tag = level <= 1 ? "h2" : (level === 2 ? "h3" : "h4");
      html += '<' + tag + ' class="md-heading md-heading-' + level + '">' + renderInlineMarkdown(trimmed.replace(/^#{1,4}\s+/, "")) + '</' + tag + '>';
      i++;
      continue;
    }

    if (/^-{3,}\s*$/.test(trimmed)) {
      html += '<hr class="md-hr">';
      i++;
      continue;
    }

    if (/\|/.test(line) && isMarkdownTableSeparator(lines[i + 1] || "")) {
      var table = renderMarkdownTable(lines, i);
      html += table.html;
      i = table.next;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      html += '<ul class="md-list">';
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        html += '<li>' + renderInlineMarkdown(lines[i].trim().replace(/^[-*]\s+/, "")) + '</li>';
        i++;
      }
      html += '</ul>';
      continue;
    }

    var paragraph = [trimmed];
    i++;
    while (i < lines.length && !isBlockBoundary(lines[i], lines[i + 1])) {
      paragraph.push(lines[i].trim());
      i++;
    }
    html += '<p class="md-p">' + renderInlineMarkdown(paragraph.join(" ")) + '</p>';
  }

  return html || '<p class="md-p"></p>';
}

function entregableLabel(key) {
  var labels = {
    perfil_seleccion: "Perfil de Selección",
    recomendaciones_finales: "Recomendaciones Finales",
    manual_cargo: "Manual de Cargo",
    kpis_sugeridos: "KPIs Sugeridos",
    hallazgos_optimizacion: "Hallazgos de Optimización",
    matriz_funciones_responsabilidades: "Matriz de Funciones y Responsabilidades",
    raci_basico: "RACI Básico",
    analisis_carga_tiempos: "Análisis de Carga y Tiempos",
    contraste_mejores_practicas: "Contraste con Mejores Prácticas"
  };
  return labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, function(c){ return c.toUpperCase(); });
}

window.exportarExpediente = async function(codigo, btnEl) {
  var codigoOriginal = normalizarCodigo(codigo || "");
  var btn = btnEl || null, orig = btn ? btn.innerHTML : "";
  if (!ensureAdminToken()) {
    alert("La sesión administrativa no está disponible. Inicia sesión nuevamente antes de exportar.");
    return;
  }
  if (!codigoOriginal || !codigoOriginal.startsWith("EXP-")) {
    alert("No se puede exportar PDF final. Código de expediente inválido o vacío: " + (codigo || "(vacío)"));
    return;
  }
  if (btn) { btn.innerHTML = 'Procesando...'; btn.disabled = true; }
  try {
    var d = await fetchExpedienteCompletoForExport(codigoOriginal, "refetch", 2);

    // Sesión expirada — limpiar token y mostrar mensaje correcto
    if (!d.ok && esSesionExpirada(d)) {
      handleSesionExpirada();
      alert("La sesión de administrador expiró. Inicia sesión nuevamente.");
      return;
    }

    // Mismatch de sincronización — no intentar exportar
    if (!d.ok && d._mismatch) {
      console.error("[ADMIN PDF] Mismatch detectado por fetchExpedienteCompletoForExport", d._debug || {});
      alert(d.mensaje || "Error de sincronización: el backend devolvió un expediente diferente al solicitado.");
      return;
    }

    if (!d.ok) {
      alert(d.mensaje || "Error al obtener expediente.");
      return;
    }

    var codigoRecibido = normalizarCodigo(d.expediente || {});
    // Validación explícita de coincidencia de código
    if (codigoRecibido && codigoRecibido !== codigoOriginal) {
      console.error("[ADMIN PDF] Mismatch post-fetch", {
        accion: "exportarExpediente",
        codigoVisibleFila: codigo,
        codigoSolicitado: codigoOriginal,
        codigoRecibido: codigoRecibido,
        tokenPresente: !!appState.tokenSesion
      });
      alert("Error de sincronización: el backend devolvió un expediente diferente al solicitado.");
      return;
    }

    var exp=d.expediente||{},ent=normalizeEntregablesForExport(d.entregables||{}, d),resp=d.respuestas||[];
    var fuenteQa=d.fuente_entregable_qa||{};

    // Log diagnóstico obligatorio
    var _longitudes = {};
    PDF_SECTION_ORDER.forEach(function(k){ _longitudes[k] = String(ent[k]||"").length; });
    console.log("[ADMIN PDF]", {
      accion: "exportarExpediente",
      codigoVisibleFila: codigo,
      codigoSolicitado: codigoOriginal,
      codigoRecibido: codigoRecibido || codigoOriginal,
      tokenPresente: !!appState.tokenSesion,
      okBackend: d.ok,
      mensajeBackend: d.mensaje,
      longitudesEntregables: _longitudes,
      fuenteDatos: "get_expediente_completo"
    });

    var validation = validateExpedientePrintPayload(exp, ent, resp);
    if (!validation.ok) {
      logPdfExportDiagnostics(codigoOriginal, d._export_source || "refetch", d, ent, validation, null);
      alert(validation.message);
      return;
    }
    var orderedEntKeys = PDF_SECTION_ORDER;
    var now=new Date().toLocaleDateString('es-CO',{year:'numeric',month:'long',day:'numeric'});
    function row(l,v){if(!v&&v!==0)return '';return '<tr><td style="font-weight:600;color:#52525b;width:220px;padding:6px 12px;vertical-align:top">'+escapeHtml(l)+'</td><td style="padding:6px 12px;white-space:pre-wrap">'+escapeHtml(v)+'</td></tr>';}
    function sec(t,b,key){if(!b)return '';return '<section class="doc-section"><h2>'+escapeHtml(t)+'</h2><div class="markdown-body">'+renderMarkdownToHtml(limpiarTextoExportable(b))+'</div></section>';}
    var htm='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte '+escapeHtml(exp.codigo||codigoOriginal)+'</title>';
    htm+='<style>@page{size:A4;margin:14mm 12mm}html{background:#fff}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;max-width:860px;margin:0 auto;background:#fff;padding:30px 34px;color:#18181b;font-size:12.7px;line-height:1.56}';
    htm+='.print-toolbar{position:sticky;top:0;z-index:5;margin:-30px -34px 18px;padding:10px 16px;background:#fff;border-bottom:1px solid #e4e4e7;display:flex;justify-content:space-between;gap:12px;align-items:center;color:#52525b;font-size:12px}.print-toolbar-actions{display:flex;gap:10px;align-items:center;white-space:nowrap}.print-toolbar label{display:flex;gap:5px;align-items:center}.print-toolbar button{background:#27272a;color:#fff;border:0;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer}';
    htm+='.h{background:#6d28d9;color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:18px}';
    htm+='.h h1{font-size:20px;font-weight:700;margin:0 0 4px}.h p{margin:0;opacity:.85;font-size:13px}';
    htm+='.source-note{font-size:11.5px;color:#71717a;background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;padding:7px 9px;margin:-8px 0 14px}';
    htm+='table{width:100%;border-collapse:collapse;font-size:12.2px}';
    htm+='td{border-bottom:1px solid #eeeef2}tr:nth-child(even) td{background:#fbfbfd}';
    htm+='h2{font-size:15px;font-weight:750;color:#27272a;margin:0 0 10px;border-bottom:1.5px solid #ddd6fe;padding-bottom:6px}';
    htm+='.doc-section{break-inside:auto;page-break-inside:auto;margin-top:22px}';
    htm+='.markdown-body{font-size:12.8px;line-height:1.65;color:#27272a}';
    htm+='.markdown-body .md-heading{color:#3f3f46;margin:14px 0 7px;line-height:1.3;break-after:avoid;page-break-after:avoid}';
    htm+='.markdown-body .md-heading-1{font-size:15px}.markdown-body .md-heading-2{font-size:14px}.markdown-body .md-heading-3,.markdown-body .md-heading-4{font-size:13px}';
    htm+='.md-p{margin:0 0 8px}.md-list{margin:0 0 10px 18px;padding:0}.md-list li{margin:3px 0}.md-hr{border:0;border-top:1px solid #e4e4e7;margin:12px 0}';
    htm+='.md-table-wrap{max-width:100%;overflow:visible;margin:8px 0 12px;break-inside:auto;page-break-inside:auto}';
    htm+='.md-table{table-layout:auto;border:1px solid #e4e4e7;font-size:10.7px;line-height:1.38}';
    htm+='.md-table.wide-table{font-size:10px;line-height:1.34}';
    htm+='.md-table th{background:#f4f4f5;color:#3f3f46;text-align:left;font-weight:700;border:1px solid #e4e4e7;padding:6px;vertical-align:top;overflow-wrap:break-word;word-break:normal;hyphens:auto}';
    htm+='.md-table td{border:1px solid #e4e4e7;padding:6px;vertical-align:top;overflow-wrap:break-word;word-break:normal;hyphens:auto;background:#fff}';
    htm+='.md-table tr:nth-child(even) td{background:#fafafa}strong{font-weight:700}code{font-family:Consolas,monospace;background:#f4f4f5;border-radius:3px;padding:1px 3px}';
    htm+='.section-end{font-size:11.5px;color:#71717a;font-style:italic;margin:12px 0 0;border-top:1px solid #e4e4e7;padding-top:6px}.appendix-section{margin-top:28px;border-top:2px solid #ede9fe;padding-top:14px}';
    htm+='footer{margin-top:28px;font-size:11px;color:#aaa;text-align:center;padding-top:8px;border-top:1px solid #eee}';
    htm+='@media print{html,body{background:#fff}.print-toolbar{display:none!important}.h{background:#6d28d9!important;color:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.source-note{display:none!important;background:#fff!important}body.print-source .source-note{display:block!important}.md-table th{background:#f4f4f5!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{max-width:none;margin:0;padding:0}.doc-section{break-inside:auto;page-break-inside:auto}.appendix-section{break-before:auto;page-break-before:auto}.markdown-body .md-heading,h2{break-after:avoid;page-break-after:avoid}.md-table-wrap{break-inside:auto;page-break-inside:auto}.md-table{page-break-inside:auto}.md-table thead{display:table-header-group}.md-table tfoot{display:table-footer-group}.md-table tr{break-inside:avoid;page-break-inside:avoid}}';
    htm+='</style></head><body>';
    htm+='<div class="print-toolbar"><span>Vista imprimible para PDF visual. Para auditoría textual usa HTML texto.</span><div class="print-toolbar-actions"><label><input type="checkbox" onchange="document.body.classList.toggle(&quot;print-source&quot;, this.checked)">Incluir fuente QA</label><button onclick="downloadTextHtml()">Descargar HTML texto</button><button onclick="window.print()">Guardar como PDF</button></div></div>';
    htm+='<div class="h"><h1>Levantamiento de Cargo</h1><p>'+escapeHtml(exp.cargo||'-')+' &middot; '+escapeHtml(exp.codigo||codigo)+' &middot; '+escapeHtml(now)+'</p></div>';
    if (fuenteQa && (fuenteQa.version || fuenteQa.page_id)) htm+='<div class="source-note">Fuente QA exportada: '+escapeHtml(fuenteQa.version||'sin version')+(fuenteQa.last_edited_time?' &middot; '+escapeHtml(fuenteQa.last_edited_time):'')+(fuenteQa.score_secciones_gerenciales!=null?' &middot; score secciones '+escapeHtml(fuenteQa.score_secciones_gerenciales):'')+'</div>';
    htm+='<h2>Datos del Colaborador</h2><table>';
    htm+=row('Nombre',exp.nombre)+row('Cargo',exp.cargo)+row('Área',exp.area);
    htm+=row('Jefe inmediato',exp.jefe_inmediato)+row('Ubicación',exp.ubicacion);
    htm+=row('Tiempo en cargo',exp.tiempo_cargo)+row('Nivel del cargo',exp.nivel);
    htm+=row('Personal a cargo',exp.tiene_personal?'Sí':'No');
    htm+=row('Estado',exp.estado)+row('Progreso',(exp.progreso||0)+'%');
    htm+=row('Última actualización',exp.ultima_interaccion);
    htm+='</table>';
    orderedEntKeys.forEach(function(key){
      if (ent[key]) htm += sec(entregableLabel(key), ent[key], key);
    });
    htm+=renderQuestionAnswerAppendix(resp);
    htm+='<footer>Generado por LM Smart Solutions</footer>';
    htm+='<script>function downloadTextHtml(){var clone=document.documentElement.cloneNode(true);var toolbar=clone.querySelector(".print-toolbar");if(toolbar)toolbar.remove();if(!document.body.classList.contains("print-source")){var source=clone.querySelector(".source-note");if(source)source.remove();}var script=clone.querySelector("script");if(script)script.remove();var html="<!DOCTYPE html>\\n"+clone.outerHTML;var blob=new Blob([html],{type:"text/html;charset=utf-8"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="expediente_'+escapeHtml(String(exp.codigo||codigoOriginal)).replace(/[^a-zA-Z0-9_-]+/g,"_")+'_texto.html";document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);}</script>';
    htm+='</body></html>';
    htm = limpiarTextoExportable(htm);
    var blob=new Blob([htm],{type:'text/html;charset=utf-8'});
    if (!blob || !blob.size) {
      logPdfExportDiagnostics(codigoOriginal, d._export_source || "refetch", d, ent, {ok:false,message:"blob vacio"}, blob);
      alert("No se pudo exportar PDF final. El archivo generado está vacío.");
      return;
    }
    logPdfExportDiagnostics(codigoOriginal, d._export_source || "refetch", d, ent, validation, blob);
    var url=URL.createObjectURL(blob);
    var w=window.open(url,'_blank');
    if(!w){
      alert('El navegador bloqueó la vista imprimible. Permite popups e inténtalo de nuevo.');
      return;
    }
    setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
    var revision = d.revision_qa || d.qa || d;
    if (revision && revision.requiere_revision_humana === true) {
      setTimeout(function(){ alert("Archivo generado correctamente. El expediente requiere revisión antes de entrega final."); }, 250);
    }
  } catch(e) {
    alert('Error PDF: '+e.message);
  } finally {
    if (btn) { btn.innerHTML=orig; btn.disabled=false; }
  }
};

window.exportarCSV = function(codigo, btnEl) {
  var codigoOriginalCsv = normalizarCodigo(codigo || "");
  var btn = btnEl || null, orig = btn ? btn.innerHTML : "";
  if (!ensureAdminToken()) {
    alert("La sesión administrativa no está disponible. Inicia sesión nuevamente antes de exportar.");
    return;
  }
  if (!codigoOriginalCsv || !codigoOriginalCsv.startsWith("EXP-")) {
    alert("Código de expediente inválido para exportar CSV: " + (codigo || "(vacío)"));
    return;
  }
  if (btn) { btn.innerHTML='Exportando...'; btn.disabled=true; }
  postJson(WEBHOOK_ADMIN,{accion:'get_expediente_completo',codigo_expediente:codigoOriginalCsv})
  .then(function(d){
    if (!d.ok && esSesionExpirada(d)) {
      handleSesionExpirada();
      alert("La sesión de administrador expiró. Inicia sesión nuevamente.");
      return;
    }
    var codigoRecibidoCsv = normalizarCodigo(d.expediente || {});
    if (d.ok && codigoRecibidoCsv && codigoRecibidoCsv !== codigoOriginalCsv) {
      alert("Error de sincronización: el backend devolvió un expediente diferente al solicitado.");
      return;
    }
    if(!d.ok){alert(d.mensaje||'Error al obtener expediente.');return;}
    var rows = collectExportRows(d);
    var separator = ';';
    var header = ['Seccion','Campo','Valor'];
    var body = rows.map(function(item){
      return [
        csvEscape(item.section),
        csvEscape(item.field),
        csvEscape(item.value)
      ].join(separator);
    });
    var csv='sep='+separator+String.fromCharCode(13,10)+header.join(separator)+String.fromCharCode(13,10)+body.join(String.fromCharCode(13,10));
    downloadCsvFile('expediente_'+codigoOriginalCsv+'.csv', csv);
  }).catch(function(e){alert('Error CSV: '+e.message);})
  .finally(function(){ if (btn) { btn.innerHTML=orig; btn.disabled=false; } });
};

showScreen("Login");



// ═══════════════════════════════════════════════════════════════
// MÓDULO CLIENTE — Vista resumen de la empresa en el proceso
// ═══════════════════════════════════════════════════════════════

async function loadClienteResumen() {
  const body = document.getElementById('clienteCargosBody');
  const msgBox = document.getElementById('boxClienteMessage');
  if (body) body.innerHTML = '<tr><td colspan="6" class="px-5 py-8 text-center text-sm text-zinc-400">Cargando...</td></tr>';
  if (msgBox) msgBox.classList.add('hidden');

  try {
    const token = ensureAdminToken();

    // Llamadas en paralelo: expedientes + configuración empresa
    const [resExp, resCfg] = await Promise.all([
      postJson(WEBHOOK_ADMIN, { accion: 'listar_expedientes', rol: appState.rol }),
      postJson(WEBHOOK_ADMIN, { accion: 'get_configuracion_empresa', rol: appState.rol })
    ]);

    // ── Datos de empresa ──────────────────────────────────────────
    const cfg = resCfg || {};
    const nombre = cfg.nombre || cfg.empresa || 'Sin configurar';
    const sector = cfg.sector || '—';
    const tamano = cfg.tamano || cfg.tamaño || '—';
    const contexto = cfg.contexto || '—';

    setText('clienteNombre', nombre);
    setText('clienteSectorTamano', sector + (tamano !== '—' ? ' · ' + tamano : ''));
    setText('clienteContexto', contexto);

    // ── Stats del proceso ─────────────────────────────────────────
    const expedientes = resExp?.expedientes || [];
    const total = expedientes.length;
    const completados = expedientes.filter(e => e.estado === 'Cerrado').length;
    const enCurso = expedientes.filter(e => e.estado === 'En curso').length;
    const avancePct = total > 0 ? Math.round((completados / total) * 100) : 0;
    const qualityRows = expedientes.map(deriveQualityMetrics);
    const valorPromedio = qualityRows.length
      ? clampPercent(qualityRows.reduce((sum, item) => sum + item.valuePct, 0) / qualityRows.length)
      : 0;
    const listosEntregable = qualityRows.filter(item => item.ready).length;
    const confianzaAlta = qualityRows.filter(item => item.confidence.label === 'Alta').length;
    const confianzaMedia = qualityRows.filter(item => item.confidence.label === 'Media').length;
    const fuenteBackend = qualityRows.length > 0 && qualityRows.every(item => item.source === 'backend');

    setText('clienteTotal', total);
    setText('clienteCompletados', completados);
    setText('clienteEnCurso', enCurso);
    setText('clienteAvance', avancePct + '%');
    setText('clienteValor', valorPromedio + '%');
    setText('clienteListos', listosEntregable);
    setText('clienteProgresoPct', avancePct + '%');
    setText('clienteValorPct', valorPromedio + '%');
    setText('clienteConfianzaResumen', `Confianza general: ${confianzaAlta > 0 ? `${confianzaAlta} alta` : confianzaMedia > 0 ? `${confianzaMedia} media` : 'predominio bajo'}`);
    setText('clienteValorFuente', `Fuente: ${fuenteBackend ? 'backend' : 'estimada'}`);

    const bar = document.getElementById('clienteProgresoBar');
    if (bar) bar.style.width = avancePct + '%';
    const valueBar = document.getElementById('clienteValorBar');
    if (valueBar) valueBar.style.width = valorPromedio + '%';

    // ── Tabla de cargos ───────────────────────────────────────────
    if (!body) return;

    if (expedientes.length === 0) {
      body.innerHTML = '<tr><td colspan="8" class="px-5 py-8 text-center text-sm text-zinc-400">No hay expedientes registrados.</td></tr>';
      return;
    }

    const estadoTag = (estado) => {
      if (estado === 'Cerrado') return '<span class="tag" style="background:#dcfce7;color:#16a34a">Completado</span>';
      if (estado === 'En curso') return '<span class="tag" style="background:#fef9c3;color:#854d0e">En curso</span>';
      return '<span class="tag" style="background:#f4f4f5;color:#71717a">' + (estado || 'Pendiente') + '</span>';
    };

    body.innerHTML = expedientes.map((e, index) => {
      const quality = qualityRows[index];
      const rowValuePct = typeof e.valor_pct === "number" ? clampPercent(e.valor_pct) : quality.valuePct;
      const rowSource = typeof e.valor_pct === "number" ? "backend" : quality.source;
      const rowConfidence = e.confianza_entregable
        ? (/alta/i.test(e.confianza_entregable) ? getConfidenceMeta(85) : /media/i.test(e.confianza_entregable) ? getConfidenceMeta(65) : getConfidenceMeta(35))
        : quality.confidence;
      return `
      <tr class="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
        <td class="px-5 py-3 mono text-xs text-zinc-500">${e.codigo || '—'}</td>
        <td class="px-5 py-3 text-sm font-medium text-zinc-800">${e.cargo || '—'}</td>
        <td class="px-5 py-3 text-sm text-zinc-600">${e.nombre || '—'}</td>
        <td class="px-5 py-3 text-sm text-zinc-500">${e.area || '—'}</td>
        <td class="px-5 py-3">${renderMetricBar(e.progreso, "linear-gradient(90deg,#9333ea,#ec4899)")}</td>
        <td class="px-5 py-3">
          ${renderMetricBar(rowValuePct, "linear-gradient(90deg,#0f766e,#14b8a6)")}
          <div class="mt-1 text-[11px] text-zinc-400">${rowSource === 'backend' ? 'dato calculado' : 'estimado visual'}</div>
        </td>
        <td class="px-5 py-3">${buildPill(rowConfidence.label, rowConfidence.colors)}</td>
        <td class="px-5 py-3">${estadoTag(e.estado)}</td>
      </tr>`;
    }).join('');

  } catch (err) {
    console.error('[loadClienteResumen]', err);
    if (msgBox) {
      msgBox.className = 'mt-4 p-4 rounded-xl text-sm text-red-700' ;
      msgBox.style.background = '#fef2f2';
      msgBox.textContent = 'Error al cargar datos del cliente: ' + err.message;
      msgBox.classList.remove('hidden');
    }
  }
}

/* ── Consulta manual de entregable (Admin/Consultor QA) ── */
async function consultarEntregablePorVersionId(tipo) {
  const input  = document.getElementById("txtConsultaEntregableVersionId");
  const msgBox = "boxConsultaEntregableMsg";
  const raw    = (input ? input.value : "").trim();

  if (!raw) {
    renderMessage(msgBox, "warning", "Ingresa un Version ID valido.");
    return;
  }
  const numId = Number(raw);
  if (!Number.isInteger(numId) || numId <= 0) {
    renderMessage(msgBox, "warning", "Ingresa un Version ID valido (entero positivo).");
    return;
  }

  cerrarConsultaEntregable();
  renderMessage(msgBox, "info",
    tipo === "documental" ? "Generando version documental…"
    : tipo === "auditado"  ? "Cargando versión auditada…"
    : "Consultando entregable…");
  console.log("Consulta manual entregable", { tipo, entregableVersionId: numId });

  try {
    const endpoint = tipo === "documental"
      ? ENTREGABLE_EXPORT_HTML_URL
      : tipo === "auditado"
      ? ENTREGABLE_EXPORT_HTML_V24B_URL
      : WEBHOOK_ENTREGABLE_CONSULTA;
    const data = await postJson(endpoint, {
      entregable_version_id: numId,
      modo: "QA"
    }, 0);
    console.log("Respuesta consulta manual entregable", data);

    if (!data.ok) {
      const msg = tipo === "documental"
        ? getDocumentalErrorMessage(data.error)
        : tipo === "auditado"
        ? getAuditadoErrorMessage(data.error)
        : getEntregableErrorMessage(data.error);
      renderMessage(msgBox, "warning", msg);
      return;
    }

    const htmlContent = tipo === "preview" ? data.html_preview : data.html_export;
    if (!htmlContent) {
      renderMessage(msgBox, "warning", "El servidor no devolvio contenido HTML para mostrar.");
      return;
    }

    const iframe = document.getElementById("iframeConsultaEntregable");
    const box    = document.getElementById("boxConsultaEntregablePreview");
    if (!iframe || !box) return;

    iframe.setAttribute("srcdoc", htmlContent);
    iframe.setAttribute("sandbox", "");
    iframe.style.minHeight = "800px";
    box.classList.remove("hidden");

    setText("lblConsultaVista",
      tipo === "documental" ? "Versión documental imprimible"
      : tipo === "auditado"  ? "Documento auditado"
      : "Vista previa del entregable");

    let successMsg;
    if (tipo === "auditado") {
      const scorePart  = (data.score_completitud != null) ? "Score: " + data.score_completitud + "%" : "";
      const estadoPart = data.estado_documental ? "Estado: " + data.estado_documental : "";
      const details    = [scorePart, estadoPart].filter(Boolean).join(" · ");
      successMsg = "Documento auditado cargado correctamente." + (details ? " " + details + "." : "");
    } else if (tipo === "documental") {
      const extra = data.filename ? " — " + data.filename : "";
      successMsg = "Versión documental cargada correctamente." + extra;
    } else {
      successMsg = "Entregable consultado correctamente.";
    }
    renderMessage(msgBox, "success", successMsg);

  } catch (e) {
    console.log("Respuesta consulta manual entregable", { error: e.message });
    renderMessage(msgBox, "error",
      "No fue posible cargar el entregable. Intente nuevamente o revise auditoria.");
  }
}

function cerrarConsultaEntregable() {
  const iframe = document.getElementById("iframeConsultaEntregable");
  const box    = document.getElementById("boxConsultaEntregablePreview");
  if (iframe) iframe.removeAttribute("srcdoc");
  if (box)    box.classList.add("hidden");
  setText("lblConsultaVista", "Vista previa");
  renderMessage("boxConsultaEntregableMsg", "", "");
}

// Patch de showAdminSection para incluir sección Cliente
const __origShowAdminSection = showAdminSection;
showAdminSection = function(section) {
  __origShowAdminSection(section);
  // Activar nav Cliente
  const navCliente = document.getElementById('navCliente');
  if (navCliente) {
    if (section === 'Cliente') {
      navCliente.classList.add('active');
    } else {
      navCliente.classList.remove('active');
    }
  }
  // Mostrar/ocultar sección Cliente
  const secCliente = document.getElementById('sectionCliente');
  if (secCliente) {
    if (section === 'Cliente') {
      secCliente.classList.remove('hidden');
      loadClienteResumen();
    } else {
      secCliente.classList.add('hidden');
    }
  }
};
