const WEBHOOK_URL   = "https://n8n.lmsmartsolutions.com/webhook/levantamiento-cargos-qa";
const WEBHOOK_AUTH  = "https://n8n.lmsmartsolutions.com/webhook/levantamiento-cargos-auth-qa";
const WEBHOOK_ADMIN = "https://n8n.lmsmartsolutions.com/webhook/levantamiento-cargos-admin-qa";

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
  cargo:"", area:"", jefeInmediato:"", nombreEntrevistado:""
};

function normalizeQuestionOptions(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map(function(item) { return String(item == null ? "" : item).trim(); })
      .filter(Boolean);
  }

  if (raw == null) return [];

  return String(raw)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(function(item) { return item.trim(); })
    .filter(Boolean);
}

applyState = function(data) {
  renderMessage("boxMessage", "", "");
  const prevQuestionId = appState.preguntaActualId || "";

  appState.codigoExpediente = data.codigo_expediente ?? "";
  appState.preguntaActualId = data.pregunta_actual_id ?? "";
  appState.preguntaActualTexto = data.pregunta_actual ?? "";
  appState.preguntaAyuda = data.ayuda ?? "";
  appState.identificadorColaborador =
    data.identificador_colaborador || appState.identificadorColaborador || "";
  appState.preguntaTipo = data.tipo_respuesta || "Texto largo";
  appState.preguntaOpciones = normalizeQuestionOptions(data.opciones);
  appState.progreso = Number(data.progreso || 0);
  appState.estadoExpediente = data.estado_expediente || appState.estadoExpediente || "En curso";
  appState.cargo = data.cargo_actual || appState.cargo || "Levantamiento de cargos";
  appState.area = data.area || appState.area || "";
  appState.jefeInmediato = data.jefe_inmediato || appState.jefeInmediato || "";
  appState.nombreEntrevistado = data.nombre_colaborador || appState.nombreEntrevistado || "";
  appState.resumenIA = data.ultima_respuesta_resumida || data.resumen_ia || "";

  if (prevQuestionId && appState.preguntaActualId && prevQuestionId !== appState.preguntaActualId) {
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
    preguntaActualId: appState.preguntaActualId || ""
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

function saveDraft() {
  try {
    const answerEl = document.getElementById("txtRespuesta");
    const value = answerEl ? answerEl.value : "";
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
      codigoExpediente: appState.codigoExpediente || "",
      preguntaActualId: appState.preguntaActualId || "",
      value: value || ""
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
    throw new Error("Respuesta vacía del servidor");
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Respuesta no válida del servidor");
  }
  if (!res.ok) {
    throw new Error(data?.mensaje || ("Error HTTP " + res.status));
  }
  return data;
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
const SECTIONS = ["Dashboard","Expedientes","Empresa","Accesos"];
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
  tbody.innerHTML = `<tr><td colspan="7" class="px-5 py-10 text-center text-sm text-zinc-400">
    <span class="pulse inline-block w-2 h-2 rounded-full bg-zinc-300 mr-2"></span>Cargando...</td></tr>`;
  try {
    const data = await postJson(WEBHOOK_ADMIN, {accion:"listar_expedientes"});
    if (!data.ok || !data.expedientes?.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="px-5 py-10 text-center text-sm text-zinc-400">No hay expedientes registrados.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.expedientes.map(exp => {
      const cls = exp.estado==="Cerrado"   ? "color:#166534;background:#f0fdf4;border:1px solid #bbf7d0" :
                  exp.estado==="En curso"  ? "color:#92400e;background:#fffbeb;border:1px solid #fde68a" :
                                             "color:#52525b;background:#f4f4f6;border:1px solid #e4e4e7";
      return `<tr class="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
        <td class="px-5 py-3 mono text-xs text-zinc-400">${exp.codigo||"—"}</td>
        <td class="px-5 py-3 text-sm font-medium text-zinc-800">${exp.nombre||"—"}</td>
        <td class="px-5 py-3 text-sm text-zinc-600">${exp.cargo||"—"}</td>
        <td class="px-5 py-3">
          <div class="flex items-center gap-2">
            <div class="h-1.5 rounded-full w-16" style="background:#e4e4e7">
              <div class="h-1.5 rounded-full" style="width:${exp.progreso||0}%;background:linear-gradient(90deg,#9333ea,#ec4899)"></div>
            </div>
            <span class="text-xs text-zinc-400 mono">${exp.progreso||0}%</span>
          </div>
        </td>
        <td class="px-5 py-3">
          <span class="tag px-2 py-1 rounded-lg" style="${cls}">${exp.estado||"—"}</span>
        </td>
        <td class="px-5 py-3 text-xs text-zinc-400">${exp.ultima_interaccion||"—"}</td>
      
        <td class="px-5 py-3">${exp.estado==="Cerrado"?'<button data-codigo="'+exp.codigo+'" onclick="exportarExpediente(this.dataset.codigo, this)" style="background:#9333ea;color:#fff;border:none;cursor:pointer;padding:5px 12px;border-radius:8px;font-size:12px;font-weight:600">&#8595; PDF</button> <button data-codigo=\"'+exp.codigo+'\" onclick=\"exportarCSV(this.dataset.codigo, this)\" style=\"background:#0891b2;color:#fff;border:none;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600\">&#8595; CSV</button>':'&mdash;'}</td></tr>`;
    }).join("");
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-5 py-8 text-center text-sm text-red-400">Error: ${e.message}</td></tr>`;
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
    const data = await postJson(WEBHOOK_URL, {
      codigo_expediente: appState.codigoExpediente,
      pregunta_actual_id_enviada: appState.preguntaActualId,
      respuesta
    });
    if (data.ok && data.estado==="listo_para_cierre") {
      clearDraft();
      appState.progreso = Number(data.progreso||100);
      setText("txtFinalMessage", data.mensaje || "La entrevista ha terminado.");
      showScreen("Final"); return;
    }
    if (data.ok) { clearDraft(); applyState(data); renderInterviewView(); return; }
    if (!data.ok && (data.tipo === "respuesta_insuficiente" || data.error === "respuesta_insuficiente")) {
      renderMessage(
        "boxMessage",
        "warning",
        data.message || data.mensaje || "Amplía tu respuesta con un poco más de detalle."
      );
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
    if (data.ok) {
      clearDraft();
      renderMessage("boxFinalMessage","success", data.mensaje||"Expediente cerrado.");
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
    resumenIA:"",faseActual:""
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

function collectExportRows(data) {
  var rows = [];
  var exp = data.expediente || {};
  var ent = data.entregables || {};
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

window.exportarExpediente = function(codigo, btnEl) {
  var btn = btnEl || null, orig = btn ? btn.innerHTML : "";
  if (!ensureAdminToken()) {
    alert("La sesión administrativa no está disponible. Inicia sesión nuevamente antes de exportar.");
    return;
  }
  if (btn) { btn.innerHTML = 'Procesando...'; btn.disabled = true; }
  postJson(WEBHOOK_ADMIN,{accion:'get_expediente_completo',codigo_expediente:codigo})
  .then(function(d){
    if(!d.ok){alert(d.mensaje||'Error al obtener expediente.');return;}
    var exp=d.expediente||{},ent=d.entregables||{};
    var orderedEntKeys = [
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
    var now=new Date().toLocaleDateString('es-CO',{year:'numeric',month:'long',day:'numeric'});
    function row(l,v){if(!v&&v!==0)return '';return '<tr><td style="font-weight:600;color:#52525b;width:220px;padding:6px 12px;vertical-align:top">'+escapeHtml(l)+'</td><td style="padding:6px 12px;white-space:pre-wrap">'+escapeHtml(v)+'</td></tr>';}
    function sec(t,b){if(!b)return '';return '<div style="margin-top:20px"><h3 style="font-size:14px;font-weight:700;color:#7c3aed;border-bottom:2px solid #ede9fe;padding-bottom:5px;margin-bottom:8px">'+escapeHtml(t)+'</h3><p style="font-size:13px;line-height:1.8;white-space:pre-wrap;margin:0">'+escapeHtml(b)+'</p></div>';}
    var htm='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte '+escapeHtml(exp.codigo||codigo)+'</title>';
    htm+='<style>body{font-family:Arial,sans-serif;padding:32px;color:#18181b;margin:0}';
    htm+='.h{background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;padding:22px 28px;border-radius:12px;margin-bottom:18px}';
    htm+='.h h1{font-size:20px;font-weight:700;margin:0 0 4px}.h p{margin:0;opacity:.85;font-size:13px}';
    htm+='table{width:100%;border-collapse:collapse;font-size:13px}';
    htm+='td{border-bottom:1px solid #f0f0f0}tr:nth-child(even) td{background:#faf9ff}';
    htm+='h2{font-size:14px;font-weight:700;color:#27272a;margin:16px 0 8px}';
    htm+='footer{margin-top:28px;font-size:11px;color:#aaa;text-align:center;padding-top:8px;border-top:1px solid #eee}';
    htm+='@media print{.h{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
    htm+='</style></head><body>';
    htm+='<div class="h"><h1>Levantamiento de Cargo</h1><p>'+escapeHtml(exp.cargo||'-')+' &middot; '+escapeHtml(exp.codigo||codigo)+' &middot; '+escapeHtml(now)+'</p></div>';
    htm+='<h2>Datos del Colaborador</h2><table>';
    htm+=row('Nombre',exp.nombre)+row('Cargo',exp.cargo)+row('Área',exp.area);
    htm+=row('Jefe inmediato',exp.jefe_inmediato)+row('Ubicación',exp.ubicacion);
    htm+=row('Tiempo en cargo',exp.tiempo_cargo)+row('Nivel del cargo',exp.nivel);
    htm+=row('Personal a cargo',exp.tiene_personal?'Sí':'No');
    htm+=row('Estado',exp.estado)+row('Progreso',(exp.progreso||0)+'%');
    htm+=row('Última actualización',exp.ultima_interaccion);
    htm+='</table>';
    orderedEntKeys.forEach(function(key){
      if (ent[key]) htm += sec(entregableLabel(key), ent[key]);
    });
    htm+='<footer>Generado por LM Smart Solutions</footer>';
    htm+='</body></html>';
    var blob=new Blob([htm],{type:'text/html;charset=utf-8'});
    var url=URL.createObjectURL(blob);
    var w=window.open(url,'_blank');
    if(!w){
      alert('El navegador bloqueó la vista imprimible. Permite popups e inténtalo de nuevo.');
      return;
    }
    setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
  }).catch(function(e){alert('Error PDF: '+e.message);})
  .finally(function(){ if (btn) { btn.innerHTML=orig; btn.disabled=false; } });
};

window.exportarCSV = function(codigo, btnEl) {
  var btn = btnEl || null, orig = btn ? btn.innerHTML : "";
  if (!ensureAdminToken()) {
    alert("La sesión administrativa no está disponible. Inicia sesión nuevamente antes de exportar.");
    return;
  }
  if (btn) { btn.innerHTML='Exportando...'; btn.disabled=true; }
  postJson(WEBHOOK_ADMIN,{accion:'get_expediente_completo',codigo_expediente:codigo})
  .then(function(d){
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
    downloadCsvFile('expediente_'+codigo+'.csv', csv);
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
      postJson(WEBHOOK_ADMIN, { accion: 'listar_expedientes', rol: adminRol }, token),
      postJson(WEBHOOK_ADMIN, { accion: 'get_configuracion_empresa', rol: adminRol }, token)
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

    setText('clienteTotal', total);
    setText('clienteCompletados', completados);
    setText('clienteEnCurso', enCurso);
    setText('clienteAvance', avancePct + '%');
    setText('clienteProgresoPct', avancePct + '%');

    const bar = document.getElementById('clienteProgresoBar');
    if (bar) bar.style.width = avancePct + '%';

    // ── Tabla de cargos ───────────────────────────────────────────
    if (!body) return;

    if (expedientes.length === 0) {
      body.innerHTML = '<tr><td colspan="6" class="px-5 py-8 text-center text-sm text-zinc-400">No hay expedientes registrados.</td></tr>';
      return;
    }

    const estadoTag = (estado) => {
      if (estado === 'Cerrado') return '<span class="tag" style="background:#dcfce7;color:#16a34a">Completado</span>';
      if (estado === 'En curso') return '<span class="tag" style="background:#fef9c3;color:#854d0e">En curso</span>';
      return '<span class="tag" style="background:#f4f4f5;color:#71717a">' + (estado || 'Pendiente') + '</span>';
    };

    const progresoBar = (pct) => {
      const p = Math.min(100, Math.max(0, Number(pct) || 0));
      return `<div style="display:flex;align-items:center;gap:6px">
        <div style="flex:1;height:4px;border-radius:9999px;background:#e4e4e7;min-width:60px">
          <div style="height:4px;border-radius:9999px;background:#9333ea;width:${p}%"></div>
        </div>
        <span class="mono text-xs text-zinc-500">${p}%</span>
      </div>`;
    };

    body.innerHTML = expedientes.map(e => `
      <tr class="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
        <td class="px-5 py-3 mono text-xs text-zinc-500">${e.codigo || '—'}</td>
        <td class="px-5 py-3 text-sm font-medium text-zinc-800">${e.cargo || '—'}</td>
        <td class="px-5 py-3 text-sm text-zinc-600">${e.nombre || '—'}</td>
        <td class="px-5 py-3 text-sm text-zinc-500">${e.area || '—'}</td>
        <td class="px-5 py-3">${progresoBar(e.progreso)}</td>
        <td class="px-5 py-3">${estadoTag(e.estado)}</td>
      </tr>`).join('');

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
