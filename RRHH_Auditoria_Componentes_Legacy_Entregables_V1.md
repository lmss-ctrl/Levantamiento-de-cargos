# RRHH — Auditoría de Componentes Legacy de Entregables
**Versión del reporte:** V1  
**Fecha:** 2026-05-28  
**Autor:** Claude (Anthropic) — LMSS / Levantamiento de Cargos  
**Contexto:** Revisión de workflows anteriores del Agente de Entregables para identificar componentes reutilizables, adaptables o descartables en el contexto del stack actual (PostgreSQL read-only, sin OpenAI, sin Notion).

---

## 1. Resumen Ejecutivo

Se revisaron **9 archivos** de workflows n8n legacy correspondientes a las versiones V20, V21, V22, y los dry-runs V3, V4, V5, V5.1, más el preparador de payload V2. El objetivo fue catalogar qué lógica puede ser rescatada para mejorar los entregables actuales (V24B) o futuros (V25) sin violar las restricciones operativas del proyecto.

**Conclusión principal:** Los legacy workflows contienen valor real, pero casi todo ese valor está en:
1. **Prompts OpenAI** — refinados a lo largo de múltiples iteraciones, con reglas anti-corte, anti-drift y fundamentación grounded. No son directamente utilizables (sin OpenAI) pero definen los *criterios editoriales* que V24B ya implementa parcialmente de forma determinista.
2. **Schemas JSON estructurados** — definen la forma exacta del entregable esperado (ficha analítica, revisión QA, objetos estándar). Estos son directamente aplicables como guía de validación en V24B y V25.
3. **Detectores de brechas en Code nodes** — lógica JS pura (sin IA) que detecta ausencia de tiempos, frecuencias, volumen, impacto e indicadores. Son **reutilizables directamente** en V24B.
4. **Criterio de suficiencia de evidencias** — `criterio_suficiencia` con 6 booleans + umbral mínimo de 3 — aplicable como capa adicional de scoring en V25.

Los nodos Notion (escribir/leer), los OpenAI Tool Use (múltiples llamadas), los parsers multi-parte y los mecanismos de reintento (4×60 s) son **descartados** por incompatibilidad con el stack actual.

**Resumen de clasificación:**

| Clasificación | Cantidad de componentes |
|---|---|
| REUTILIZAR_DIRECTO | 7 |
| ADAPTAR_A_PG | 5 |
| USAR_COMO_REFERENCIA | 9 |
| DESCARTAR | 14 |

---

## 2. Archivos / Workflows Revisados

| # | Archivo | Versión | Tamaño aprox. | Nodos | Stack | Estado |
|---|---|---|---|---|---|---|
| 1 | `RRHH_Agente_Entregables_QA_V20_LOW_COST_PG_FIRST.json` | V20 | ~544 KB | ~45 | OpenAI gpt-4.1-mini + Notion + PG | Legacy — no activo |
| 2 | `RRHH_Agente_Entregables_QA_V20_LOW_COST_PG_FIRST_CANONICO_FIX.json` | V20-Fix | ~544 KB | ~45 | Ídem V20 | Legacy — idéntico a V20 |
| 3 | `RRHH_Agente_Entregables_QA_V21_LOW_COST_PG_STORE.json` | V21 | ~560 KB | ~47 | V20 + nodos PG de escritura | Legacy — no activo |
| 4 | `RRHH_Agente_Entregables_QA_V22_OUTPUT_STRUCTURED_PARSER.json` | V22 | ~580 KB | ~50 | V20 + parser de output estructurado | Legacy — no activo |
| 5 | `rrhh_qa_pg_dry_run_borrador_grounded_v5_1.json` | V5.1 | ~120 KB | 11 | OpenAI gpt-4o-mini + PG read-only | Dry-run — no activo |
| 6 | `rrhh_qa_pg_dry_run_borrador_seccional_v5.json` | V5 | ~110 KB | 11 | OpenAI gpt-4o-mini + PG read-only | Dry-run — no activo |
| 7 | `rrhh_qa_pg_dry_run_estructura_documental_v4.json` | V4 | ~105 KB | 11 | OpenAI gpt-4o-mini + PG read-only | Dry-run — no activo |
| 8 | `rrhh_qa_pg_prepare_payload_entregable_v2.json` | V2 | ~45 KB | 7 | PG read-only — sin OpenAI | Tool — no activo |
| 9 | `rrhh_qa_pg_dry_run_agente_entregable_v3.json` | V3 | ~90 KB | 11 | OpenAI gpt-4o-mini + PG read-only | Dry-run — no activo |

---

## 3. Componentes Reutilizables Encontrados

### 3.1 Detectores de Brechas (Code JS puro)

**Origen:** V20 / V21 / V22 — nodos Code previos a llamadas OpenAI  
**Clasificación:** REUTILIZAR_DIRECTO

Cinco detectores de brechas escritos en JS puro, independientes de IA:

```javascript
// 1. Detector de tiempos / frecuencias
const tienesFrecuencias = tiempos.frecuencias && Array.isArray(tiempos.frecuencias) && tiempos.frecuencias.length > 0;
const tieneTiempos      = tienesFrecuencias || (tiempos.actividades_mayor_tiempo && tiempos.actividades_mayor_tiempo.length > 0);

// 2. Detector de volumen de trabajo
const tieneVolumen = !!(relaciones.volumen_trabajo || ficha.volumen_trabajo || objeto.volumen);

// 3. Detector de impacto del cargo
const tieneImpacto = !!(objeto.impacto || objeto.impacto_cargo || ficha.impacto);

// 4. Detector de indicadores
const tieneIndicadores = (Array.isArray(objeto.indicadores_sugeridos) && objeto.indicadores_sugeridos.length > 0)
  || (Array.isArray(ficha.indicadores_sugeridos) && ficha.indicadores_sugeridos.length > 0);

// 5. Detector de perfil completo
const perfilAlguno = !!(perfil.estudios || perfil.formacion || perfil.experiencia || perfil.competencias);
```

**Valor:** Estos detectores son la base del scoring determinístico de V24B. Tres de los cinco ya están implementados en el nodo `Code_BuildHTMLAuditado`. Los dos pendientes (volumen, impacto) son candidatos para ampliar la matriz de scoring en V24B o V25.

---

### 3.2 Criterio de Suficiencia de Evidencias

**Origen:** V20 / V21 — nodo Code previo a OpenAI  
**Clasificación:** REUTILIZAR_DIRECTO (adaptar labels)

```javascript
const evidencias_utiles = {
  tiene_tiempos:        tieneTiempos,
  tiene_indicadores:    tieneIndicadores,
  tiene_relaciones:     tieneRelaciones,
  tiene_perfil_base:    perfilAlguno,
  tiene_difmej:         !!(difMej.mejoras || difMej.reprocesos || difMej.dificultades),
  tiene_pyr:            pyrRows.length > 0
};
const count_evidencias  = Object.values(evidencias_utiles).filter(Boolean).length;
const criterio_suficiencia = count_evidencias >= 3; // mínimo 3 de 6 para generar
```

**Valor:** Este es exactamente el criterio de suficiencia que determina si el entregable tiene base para ser procesado. Aplica directamente a la lógica de `estado_documental` en V24B.

---

### 3.3 limpiarResiduosMultiparteLocal()

**Origen:** V22 — Code parser de output  
**Clasificación:** USAR_COMO_REFERENCIA (no aplica directamente, pero la lógica de limpieza sí)

Elimina encabezados artefactuales, marcadores de sección residuales y JSON parcialmente truncado del output de OpenAI. Útil como referencia para cualquier futuro proceso de parsing de texto libre.

---

### 3.4 diagnosticarCorteManual()

**Origen:** V22 — Code parser post-OpenAI  
**Clasificación:** USAR_COMO_REFERENCIA

Detecta si un texto fue cortado antes de completarse verificando:
- ¿Termina con `}` o `]` si es JSON?
- ¿El último párrafo tiene al menos N palabras?
- ¿Existe título de última sección pero sin cuerpo?

Útil como referencia si V25 incorpora generación de texto libre en alguna sección.

---

### 3.5 Anti-Cargo-Drift (token overlap check)

**Origen:** V20 / V21 / V22 — Code node previo a OpenAI  
**Clasificación:** ADAPTAR_A_PG

```javascript
// Verifica que el nombre del cargo en la respuesta coincida con el cargo del expediente
const tokensCargo    = nombreCargoNormalizado.toLowerCase().split(/\s+/);
const tokensDeclarado = cargo_declarado.toLowerCase().split(/\s+/);
const overlap        = tokensCargo.filter(t => tokensDeclarado.includes(t)).length;
const driftDetectado  = overlap < Math.ceil(tokensCargo.length * 0.6);
```

**Valor:** Evita que un entregable generado para cargo "Analista de Compras" aparezca como "Jefe de Logística". Aplicable en V24B como validación de coherencia entre `objeto_estandar_json.cargo.nombre` y el cargo registrado en el expediente.

---

### 3.6 entregables_invalidos Tracking

**Origen:** V20 / V21 — Code de control de flujo  
**Clasificación:** USAR_COMO_REFERENCIA

Lista de IDs de entregable marcados como inválidos para evitar reprocesarlos. En el contexto actual (sin generación automática), aplica como patrón de auditoría: el campo `parse_errors` en `rrhh.entregable_versiones` cumple este rol, pero la lógica de tracking adicional podría usarse en V25.

---

### 3.7 PG Queries Read-Only (vw_payload_ia_entregable_canonico)

**Origen:** V3 / V4 / V5 / V5.1 / V2  
**Clasificación:** REUTILIZAR_DIRECTO (ya implementado en V24B)

```sql
SELECT payload_ia
FROM rrhh.vw_payload_ia_entregable_canonico
WHERE entregable_version_id = $1::bigint;
```

La vista `rrhh.vw_payload_ia_entregable_canonico` consolida todos los datos del expediente en un JSONB único. Esta es la fuente canónica de datos usada por V24B. Los dry-runs confirmaron que es la única fuente necesaria para construir el entregable sin OpenAI.

---

## 4. Componentes Descartados

| Componente | Origen | Razón de descarte |
|---|---|---|
| Nodos `openai.chat` (gpt-4.1-mini) | V20 / V21 / V22 | Sin API key activa; restricción operativa explícita |
| Nodos `openai.chat` (gpt-4o-mini) | V3 / V4 / V5 / V5.1 | Ídem |
| Nodos Notion (createPage, updatePage, getPage) | V20 / V21 / V22 | Sin integración Notion activa; restricción operativa |
| Lógica de reintento 4×60s | V20 / V21 / V22 | Solo aplica a fallos de OpenAI — no existe equivalente en stack PG |
| `integrarMultiparteSinReinicio()` | V22 | Solo aplica a outputs multi-parte de OpenAI (>4096 tokens) |
| Parsers de structured output (tool_calls) | V22 | Formato de respuesta exclusivo de OpenAI function calling |
| Nodo `splitInBatches` de entregables | V20 / V21 | Batch processing de entregables; no aplica en flujo actual (1 a la vez) |
| Lógica de 9 tipos de entregable con switch | V20 / V21 / V22 | Arquitectura multi-tipo que no existe en V24B (1 tipo, 1 versión) |
| `core.configuracion_sistema` QA flags | V3 / V4 / V5 | Flags `usar_pg_rrhh_core`, `modo_qa_rrhh` — tabla no confirmada en prod actual |
| Mecanismo de password "LMSS-QA" bypass | V3 / V5.1 | Lógica de bypass de autenticación — no aplica al front actual |
| Preparación de `instrucciones_sistema` hardcoded | V2 | Las 4 reglas del payload V2 fueron supersedidas por prompts completos en V3+ |
| Tool Use schema (OpenAI function calling) | V22 / V5.1 | Formato exclusivo de OpenAI; no tiene equivalente determinista |
| Nodo `httpRequest` a OpenAI | Todos | Ídem — no aplica |
| Metadata de Notion (page_id, database_id) | V20 / V21 | Infraestructura Notion no activa |

---

## 5. Prompts OpenAI Útiles

> **Nota:** Estos prompts no son ejecutables con el stack actual. Se documentan como especificaciones editoriales — definen QUÉ debe contener un entregable completo, independientemente de quién o qué lo genere.

### 5.1 Prompt: Manual de Cargo (Sistema — V20/V21/V22)

**Reglas extractadas (aplican como criterios editoriales):**

1. **Anti-corte:** El texto de cada sección debe completarse en la misma llamada. Si el token limit se acerca, priorizar las secciones de mayor peso (propósito, funciones, responsabilidades) y truncar las complementarias con marcador `[PENDIENTE]`.
2. **Anti-drift:** El cargo mencionado en el cuerpo del documento debe coincidir en al menos 60% de tokens con el nombre del cargo del expediente.
3. **Límite de tokens:** máximo 1800 tokens de output por sección; máximo 450 tokens por subsección de perfil.
4. **Single-call:** Todo el objeto estándar en una sola llamada — no dividir en múltiples prompts sin lógica de integración explícita.
5. **Formato de salida:** JSON estricto sin markdown — cualquier texto libre va dentro de strings del JSON.

### 5.2 Prompt: Revisión QA Final (Sistema — V20/V21)

**Reglas extractadas:**

1. El auditor QA NO puede inventar información. Solo señalar lo que existe vs. lo que falta.
2. Los `alertas_vacios` deben citar el campo exacto ausente (ej: `"perfil.herramientas"` no `"el perfil"`)
3. `requiere_revision_humana = true` si algún campo crítico (propósito, funciones, responsabilidades) tiene menos de 40 palabras.
4. `nivel_revision_humana` debe ser `"alta"` si más de 3 campos críticos requieren revisión.
5. El `estado_qa_resumido` debe ser uno de: `"Apto para entrega"`, `"Requiere revisión menor"`, `"Requiere revisión mayor"`, `"Borrador incompleto"`.

### 5.3 Prompt: Borrador Grounded (Sistema — V5.1)

**Reglas extractadas:**

1. Cada afirmación debe citarse con `id_pregunta` de la fuente en `respuestas_canonicas`.
2. Separar explícitamente: `hechos` (directo de respuestas), `inferencias` (deducidas razonablemente), `recomendaciones` (generadas por el agente).
3. `nivel_soporte` por subsección: `"fuerte"` (3+ respuestas relevantes), `"medio"` (1-2), `"debil"` (inferencia), `"sin_evidencia"` (no hay base).
4. Si `nivel_soporte === "sin_evidencia"`, no generar texto — poner `null` y agregar a `campos_debiles`.
5. Prohibido citar fuentes inventadas — solo IDs existentes en `respuestas_canonicas`.

### 5.4 Prompt: Diagnóstico de Aptitud (Sistema — V3)

**Reglas extractadas:**

1. Con máximo 1200 tokens, solo diagnosticar — no generar entregable.
2. `apto_para_generacion`: true/false con justificación de 1 oración.
3. `nivel_riesgo`: `"bajo"` (datos suficientes), `"medio"` (algunos campos clave ausentes), `"alto"` (menos del 40% de campos base presentes).
4. `secciones_detectadas`: lista de secciones con datos presentes en el payload.
5. `campos_faltantes`: lista específica de campos ausentes con impacto en la calidad.

---

## 6. Scripts Code Útiles

### 6.1 Función de normalización de cargo

**Origen:** V20 / V21 / V22 — Code node "Normalizar Cargo"  
**Clasificación:** REUTILIZAR_DIRECTO

```javascript
function normalizarNombreCargo(nombre) {
  return (nombre || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // quitar tildes
    .replace(/[^a-zA-Z0-9\s]/g, '')  // solo alfanumérico
    .toLowerCase()
    .trim();
}
```

### 6.2 Función de cálculo de longitud efectiva de texto

**Origen:** V22 — Code parser  
**Clasificación:** USAR_COMO_REFERENCIA

```javascript
function longitudEfectiva(value) {
  if (!value) return 0;
  if (Array.isArray(value)) return value.map(x => String(x || '')).join(' ').trim().length;
  return String(value).trim().length;
}
// En V20/V22: campo crítico requiere longitudEfectiva >= 40 palabras
const palabrasCritico = longitudEfectiva(campo).split(/\s+/).filter(Boolean).length;
const requiereRevision = palabrasCritico < 40;
```

### 6.3 Función de extracción segura de campos JSONB

**Origen:** V5 / V5.1 — Code node "Preparar Payload"  
**Clasificación:** REUTILIZAR_DIRECTO (ya en V24B como `hasVal`)

```javascript
function safeGet(obj, ...keys) {
  return keys.reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}
// Uso:
const funciones = safeGet(payload, 'objeto_estandar_json', 'funciones_clave') || [];
```

### 6.4 Función `payload_ia_preparado` (V2 — sin OpenAI)

**Origen:** V2 — Code node "Construir Payload IA"  
**Clasificación:** USAR_COMO_REFERENCIA

Construye un objeto diagnóstico que incluye:
- `metricas`: count de respuestas, campos presentes/ausentes
- `alertas`: lista de campos críticos ausentes
- `respuestas`: array normalizado de P&R
- `instrucciones_sistema`: 4 reglas para el futuro agente IA

Este patrón es el antecedente directo del `Code_ValidarEntrada` actual en V24B.

### 6.5 Lógica de patch de entregables inválidos

**Origen:** V20 / V21 — Code node "Filtrar Inválidos"  
**Clasificación:** DESCARTAR (no aplica al flujo actual, pero útil como referencia)

```javascript
const ENTREGABLES_INVALIDOS = [/* IDs hardcoded */];
const esInvalido = ENTREGABLES_INVALIDOS.includes(Number(entregable_version_id));
```

---

## 7. Schemas / Parsers Útiles

### 7.1 Schema Ficha Analítica (19 campos)

**Origen:** V20 / V21 / V22 — system prompt + validación Code  
**Clasificación:** USAR_COMO_REFERENCIA

```json
{
  "cargo": "string",
  "area": "string",
  "departamento": "string",
  "proposito": "string (≥40 palabras)",
  "funciones_clave": ["string"],
  "responsabilidades": ["string"],
  "perfil": {
    "estudios": "string",
    "formacion": "string",
    "experiencia": "string",
    "competencias": ["string"],
    "herramientas": ["string"],
    "sistemas": ["string"],
    "conocimientos": ["string"]
  },
  "indicadores_sugeridos": ["string"],
  "alertas_vacios": ["string"],
  "relaciones": {
    "internas": ["string"],
    "externas": ["string"]
  },
  "tiempos": {
    "frecuencias": ["string"],
    "actividades_mayor_tiempo": ["string"]
  },
  "dificultades_mejoras": {
    "dificultades": ["string"],
    "mejoras": ["string"],
    "reprocesos": ["string"]
  },
  "observaciones_qa": "string",
  "nivel_revision_humana": "alta|media|baja|ninguna"
}
```

**Valor:** Este schema define el contrato de datos que V24B valida mediante los 17 criterios de scoring. Los campos que V24B aún no cubre explícitamente (`relaciones.externas`, `observaciones_qa`, `nivel_revision_humana`) son candidatos para V25.

### 7.2 Schema Revisión QA Extendida (V22 — 11 campos)

**Origen:** V22 — structured output parser  
**Clasificación:** USAR_COMO_REFERENCIA

```json
{
  "estado_qa_resumido": "Apto para entrega|Requiere revisión menor|Requiere revisión mayor|Borrador incompleto",
  "calidad_general": "alta|media|baja",
  "apto_para_entrega": true,
  "requiere_revision_humana": false,
  "nivel_revision_humana": "ninguna|baja|media|alta",
  "alertas": ["string"],
  "campos_faltantes": ["string"],
  "resumen": "string",
  "observaciones": "string",
  "tipo_de_falla": "corte|drift|vacio|formato|otro",
  "reproceso_recomendado": "string"
}
```

**Valor:** Los campos `tipo_de_falla` y `reproceso_recomendado` son innovaciones de V22 que V24B aún no tiene. Son candidatos para la sección de recomendaciones de V24B (ya existe `secRec` en el HTML auditado).

### 7.3 Schema Grounded V5.1 (con evidencia_base por subsección)

**Origen:** V5.1 — structured output  
**Clasificación:** ADAPTAR_A_PG

```json
{
  "secciones": {
    "proposito": {
      "texto": "string",
      "nivel_soporte": "fuerte|medio|debil|sin_evidencia",
      "evidencia_base": [{"id_pregunta": 42, "fragmento": "string"}]
    },
    "funciones_clave": {
      "items": ["string"],
      "nivel_soporte": "fuerte|medio|debil|sin_evidencia",
      "evidencia_base": [{"id_pregunta": 15, "fragmento": "string"}]
    }
  },
  "campos_debiles": ["proposito", "indicadores_sugeridos"],
  "requiere_revision_humana": true,
  "razon_revision": "string"
}
```

**Valor:** El campo `nivel_soporte` con `evidencia_base` permite trazabilidad completa. En V25, los nodos PG podrían recuperar los fragmentos de `rrhh.respuestas_entrevista` y mapearlos a cada sección del entregable.

### 7.4 Schema Estructura Documental (V4)

**Origen:** V4 — dry-run estructura  
**Clasificación:** USAR_COMO_REFERENCIA

```json
{
  "tipos_documento": {
    "manual_de_cargo": {
      "secciones": ["proposito", "funciones_clave", "responsabilidades", "perfil", "indicadores"],
      "campos_debiles": [],
      "requiere_revision_humana": false
    },
    "ficha_analitica": {
      "secciones": ["tiempos", "relaciones", "dificultades_mejoras"],
      "campos_debiles": ["tiempos.frecuencias"],
      "requiere_revision_humana": true
    }
  },
  "evidencia_base": [{"tipo": "p_y_r", "count": 12, "cobertura_estimada": "alta"}],
  "campos_criticos_ausentes": []
}
```

### 7.5 Schema Diagnóstico de Aptitud (V3)

**Origen:** V3 — dry-run diagnóstico  
**Clasificación:** ADAPTAR_A_PG

```json
{
  "apto_para_generacion": true,
  "nivel_riesgo": "bajo|medio|alto",
  "secciones_detectadas": ["proposito", "funciones_clave", "perfil", "tiempos"],
  "campos_faltantes": ["relaciones.externas", "indicadores_sugeridos"],
  "justificacion": "string (1 oración)"
}
```

**Valor:** Este schema podría implementarse de forma completamente determinista (sin OpenAI) en V24B o V25 como una sección de diagnóstico pre-entregable, usando los 17 criterios de scoring ya implementados.

---

## 8. Reglas QA Útiles

### 8.1 Reglas de longitud mínima por campo crítico

**Origen:** V20 / V21 / V22  
**Aplicabilidad:** V24B scoring, V25

| Campo | Mínimo recomendado | Acción si no cumple |
|---|---|---|
| `proposito` | 40 palabras | `requiere_revision_humana = true` |
| `funciones_clave` | ≥3 items, cada uno ≥5 palabras | Agregar a `brechas` con `critico = true` |
| `responsabilidades` | ≥3 items | Ídem |
| `indicadores_sugeridos` | ≥2 items | Agregar a `brechas` con `critico = false` |
| Cualquier string de perfil | ≥10 caracteres | Considerar vacío |
| P&R (`respuestas_entrevista`) | ≥5 filas | Score penalizado |

V24B ya implementa detección de presencia, pero no la validación de longitud mínima. Esta capa es recomendada para V25.

### 8.2 Regla de coherencia cargo vs. entregable

**Origen:** V20 / V21 / V22 — anti-cargo-drift  
**Aplicabilidad:** V24B (candidato a agregar), V25

El nombre del cargo en `objeto_estandar_json.cargo.nombre` debe tener al menos 60% de tokens en común con el cargo del expediente. Si hay drift, agregar alerta en `alertas_vacios`.

### 8.3 Regla de fuente grounded (nivel_soporte)

**Origen:** V5.1  
**Aplicabilidad:** V25

Ninguna sección debe declararse `"fuerte"` con menos de 3 respuestas relevantes en `respuestas_canonicas`. La traza de evidencia (`id_pregunta`) permite auditar el origen de cada afirmación.

### 8.4 Regla anti-corte en texto libre

**Origen:** V22 — diagnosticarCorteManual()  
**Aplicabilidad:** V25 (si se incorpora generación de texto)

Un texto libre se considera cortado si:
- Es JSON y no termina con `}` o `]`
- El último párrafo tiene menos de 5 palabras
- Existe un título de sección sin cuerpo asociado

### 8.5 Reglas de estado QA resumido

**Origen:** V20 / V21 — Code QA  
**Aplicabilidad:** V24B (ya implementado como `estado_documental`)

Los 4 estados de V24B (`BORRADOR_QA`, `REQUIERE_REVISION`, `APTO_REVISION`, `APTO_ENTREGA`) mapean directamente a los 4 estados del `estado_qa_resumido` de V20/V21 (`"Borrador incompleto"`, `"Requiere revisión mayor"`, `"Requiere revisión menor"`, `"Apto para entrega"`). La nomenclatura cambió pero la lógica es equivalente.

### 8.6 Regla de seguridad read-only

**Origen:** V5 / V5.1 — flags hardcoded en Code  
**Aplicabilidad:** Todos los workflows actuales

```javascript
// Flags de seguridad hardcoded (no dependen de DB)
const SOLO_LECTURA       = true;
const GENERA_ENTREGABLE  = false;
const GENERA_WORD_PDF    = false;
const ESCRIBE_NOTION     = false;
```

Estos flags deben incluirse en el output de cualquier workflow de exportación como confirmación de restricciones cumplidas.

---

## 9. Componentes que Deben Adaptarse a PostgreSQL

### 9.1 Criterio de suficiencia → Scoring determinístico

**Componente original:** 6 booleans + umbral ≥3 (Code JS, V20/V21)  
**Adaptación requerida:**  
- Mapear los 6 booleans a los 17 criterios de V24B
- Calcular automáticamente desde campos JSONB de `entregable_versiones`
- Ya parcialmente adaptado en `Code_BuildHTMLAuditado`

### 9.2 Anti-Cargo-Drift → Validación de coherencia

**Componente original:** Token overlap check (Code JS, V20/V21)  
**Adaptación requerida:**  
- Obtener `nombre_cargo` desde `rrhh.expedientes` o `rrhh.entregables`
- Comparar con `objeto_estandar_json->>'cargo'` o similar
- Agregar al array `brechas` si hay drift detectado
- Sin cambios al schema PG — solo lógica en Code node

### 9.3 Niveles de soporte → Scoring por sección

**Componente original:** `nivel_soporte` por subsección con `evidencia_base` (V5.1)  
**Adaptación requerida:**  
- En lugar de que OpenAI asigne `nivel_soporte`, calcularlo determinísticamente:
  - `"fuerte"`: campo presente + longitud ≥ mínimo + ≥3 P&R asociadas en `respuestas_entrevista`
  - `"medio"`: campo presente + longitud ≥ mínimo
  - `"debil"`: campo presente pero longitud < mínimo
  - `"sin_evidencia"`: campo ausente o vacío
- Requiere un JOIN adicional con `rrhh.respuestas_entrevista` en el PG node (ya existe el nodo `PG_LeerRespuestasEntrevista` en V24B)

### 9.4 Diagnóstico de aptitud → Pre-validación determinista

**Componente original:** Schema aptitud (V3, con OpenAI)  
**Adaptación requerida:**  
- Implementar el schema completo usando solo los 17 criterios de scoring
- `apto_para_generacion`: score ≥ 60%
- `nivel_riesgo`: score < 40% → "alto", 40-70% → "medio", >70% → "bajo"
- `secciones_detectadas`: lista de criterios con `presente = true`
- `campos_faltantes`: lista de criterios con `presente = false`
- Completamente implementable en V24B como sección adicional del JSON de respuesta

### 9.5 Payload IA preparado → Enriquecimiento del reporte

**Componente original:** `payload_ia_preparado` (V2, sin OpenAI)  
**Adaptación requerida:**  
- Agregar campos `metricas` al JSON de respuesta de V24B:
  - `count_respuestas`: número de filas en `respuestas_entrevista`
  - `count_campos_presentes`: de los 17 criterios
  - `count_campos_ausentes`: brechas detectadas
  - `pct_completitud`: score_completitud ya presente

---

## 10. Componentes Candidatos para V24B

> V24B ya existe en producción. Estos son enhancements aplicables sin romper la interfaz actual.

### 10.1 Longitud mínima por campo crítico (Regla 8.1)

**Impacto:** Mejora la precisión del scoring. Actualmente V24B detecta "presencia" pero no "suficiencia".  
**Esfuerzo:** Bajo — agregar `longitudEfectiva()` al `Code_BuildHTMLAuditado`.  
**Riesgo:** Bajo — cambio aditivo, no rompe campos existentes.

**Implementación sugerida:**
```javascript
function suficiente(value, minPalabras) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  return words.length >= (minPalabras || 5);
}
// Ajustar CRITERIOS: agregar validación de suficiencia además de presencia
{ id: 'proposito', ... , presente: hasVal(objeto.proposito) && suficiente(objeto.proposito, 40) }
```

### 10.2 Anti-Cargo-Drift en brechas (Regla 8.2)

**Impacto:** Detecta entregables "copiados" de otro cargo o con nombre de cargo incorrecto.  
**Esfuerzo:** Medio — requiere acceder al nombre del cargo del expediente desde el payload.  
**Riesgo:** Bajo — agrega alerta en `brechas` pero no cambia scoring ni estado.

### 10.3 Diagnóstico de aptitud en JSON de respuesta (Sección 9.4)

**Impacto:** El cliente puede saber si el entregable tiene base suficiente sin leer el HTML.  
**Esfuerzo:** Bajo — campos ya calculados internamente en V24B.  
**Riesgo:** Bajo — solo expone datos ya existentes en el JSON de respuesta.

### 10.4 Flags de seguridad en JSON de respuesta (Regla 8.6)

**Impacto:** Trazabilidad de cumplimiento de restricciones operativas.  
**Esfuerzo:** Mínimo — agregar objeto `restricciones` al JSON de respuesta.  
**Riesgo:** Ninguno.

```json
{
  "restricciones": {
    "solo_lectura": true,
    "sin_openai": true,
    "sin_notion": true,
    "sin_insert_update_delete": true
  }
}
```

---

## 11. Componentes Candidatos para V25

> V25 sería la siguiente iteración mayor del exportador. Requiere planificación antes de implementar.

### 11.1 Scoring con nivel_soporte por sección

**Descripción:** Cada uno de los 17 criterios obtiene `nivel_soporte` (fuerte/medio/débil/sin_evidencia) calculado determinísticamente a partir del count de P&R en `respuestas_entrevista`.  
**Complejidad:** Media — requiere JOIN y mapeo de preguntas a criterios.  
**Valor:** Alta trazabilidad — el usuario sabe de dónde viene cada dato.

### 11.2 Evidencia_base con id_pregunta por sección

**Descripción:** Para cada sección del HTML, mostrar los IDs de preguntas que la soportan.  
**Complejidad:** Media-Alta — requiere mapeo semántico de preguntas a secciones del entregable.  
**Valor:** Auditoría completa — cualquier afirmación puede rastrearse a la entrevista original.

### 11.3 Generación asistida por IA (opt-in)

**Descripción:** Usar los prompts documentados en Sección 5 con `gpt-4o-mini` para generar texto de secciones con `nivel_soporte >= "medio"`.  
**Complejidad:** Alta — requiere API key, manejo de costos, control de calidad.  
**Prerrequisito:** Aprobación de uso de OpenAI por el equipo.  
**Candidato:** Los prompts de V5.1 (grounded) son los más maduros para este propósito.

### 11.4 Validación de longitud mínima con recomendaciones específicas

**Descripción:** Para campos con texto presente pero insuficiente, generar recomendaciones específicas (ej: "Propósito tiene 15 palabras — se recomienda expandir a mínimo 40").  
**Complejidad:** Baja — extensión de la `secRec` existente en V24B.  
**Valor:** Orienta al revisor humano con acciones concretas.

### 11.5 Export multi-formato (PDF/DOCX)

**Descripción:** A partir del HTML auditado de V24B, generar PDF o DOCX vía herramienta externa (no n8n).  
**Complejidad:** Alta — requiere headless browser o librería de documentos.  
**Restricción actual:** Prohibido por restricciones operativas del proyecto.  
**Nota:** Documentado para revisión futura si se levantan restricciones.

### 11.6 Dashboard de completitud multi-expediente

**Descripción:** Endpoint que consolide `score_completitud` y `estado_documental` de múltiples entregables en una tabla resumen.  
**Complejidad:** Baja-Media — nuevo endpoint + query SQL con GROUP BY expediente.  
**Valor:** Visibilidad ejecutiva del avance del proyecto completo.

---

## 12. Riesgos Técnicos

| # | Riesgo | Nivel | Mitigación |
|---|---|---|---|
| RT-01 | `vw_payload_ia_entregable_canonico` cambia de schema | Medio | Versionar la view o añadir columnas compatibles; V24B ya usa `COALESCE` defensivo |
| RT-02 | Campos JSONB con estructura inconsistente entre expedientes | Alto | `hasVal()` defensivo ya implementado; añadir `longitudEfectiva()` para scoring preciso |
| RT-03 | `respuestas_entrevista` vacía para expedientes antiguos | Medio | Ya manejado con sentinel `pyr_found=false` en V24B |
| RT-04 | n8n actualización rompe nodo `respondToWebhook` v1.1 | Bajo | Monitorear changelog n8n; V24B usa versión estable |
| RT-05 | HTML muy grande (>500 KB) en entregables con muchas P&R | Bajo | Limitar P&R a primeras 50 filas en `PG_LeerRespuestasEntrevista` si performance degrada |
| RT-06 | Double-quote en strings de payload corrompe jsCode JSON | Bajo | Ya resuelto en V24B con single-quotes en HTML; documentado para futuros workflows |
| RT-07 | Anti-cargo-drift produce falsos positivos en cargos compuestos | Medio | Ajustar umbral de 60% a 40% para cargos con >3 palabras |

---

## 13. Riesgos de Costo

| # | Riesgo | Aplica a | Costo estimado | Mitigación |
|---|---|---|---|---|
| RC-01 | Activar nodos OpenAI de V20/V22 en producción sin control | V25 (si se habilita IA) | $0.10-0.40/entregable con gpt-4o-mini (estimado 1500 tokens/llamada) | Aprobación explícita; rate limiting; audit log de llamadas |
| RC-02 | Uso de gpt-4.1-mini en lugar de gpt-4o-mini | V25 | ~3× más caro que gpt-4o-mini | Mantener gpt-4o-mini para dry-runs; gpt-4.1-mini solo si calidad es insuficiente |
| RC-03 | Múltiples reintentos (4×) incrementan costo variable | V25 | Hasta 4× el costo por entregable fallido | Limitar reintentos a 2; revisar prompts para reducir fallos |
| RC-04 | Generación multi-parte sin control de tokens | V25 | Imprevisible — depende de longitud de payload | Hardcodear `max_tokens` y respetar el límite de sección de V20 (1800 tokens) |
| RC-05 | Notion API calls para escritura (V20 patrón) | N/A actual | ~0 (tier gratuito actual) | No reactivar Notion write — solo lectura si se requiere |

**Stack actual (V24B):** $0 por entregable. Solo consultas PostgreSQL read-only. No hay riesgo de costo variable.

---

## 14. Recomendación Final

### Stack actual (V24B) — Mantener y mejorar incrementalmente

V24B es la implementación correcta para el stack actual. El análisis de los 9 archivos legacy confirma que:

1. **Los prompts OpenAI son criterios editoriales**, no lógica de negocio. V24B ya los implementa de forma determinista a través de los 17 criterios de scoring.

2. **Los detectores de brechas JS son reutilizables directamente.** Los 5 detectores de V20/V21 son extensiones directas del scoring de V24B. Recomendamos agregar `longitud mínima` como segunda dimensión de validación.

3. **Los schemas JSON son contratos de datos.** El schema de ficha analítica (19 campos, Sección 7.1) es la especificación exacta que V24B valida. Debe documentarse como contrato oficial del proyecto.

4. **El patrón anti-cargo-drift es de bajo esfuerzo y alto valor.** Agregar esta validación en V24B detectaría entregables con problemas de coherencia sin costo adicional.

5. **V25 debería incorporar nivel_soporte determinístico antes de cualquier IA.** El schema grounded de V5.1 puede implementarse completamente sin OpenAI usando los datos de `respuestas_entrevista` ya disponibles.

### Jerarquía de mejoras recomendada

| Prioridad | Mejora | Esfuerzo | Versión |
|---|---|---|---|
| 1 | Longitud mínima por campo crítico | Bajo | V24B enhancement |
| 2 | Anti-cargo-drift en brechas | Medio | V24B enhancement |
| 3 | Diagnóstico de aptitud en JSON response | Bajo | V24B enhancement |
| 4 | Flags de restricciones en JSON response | Mínimo | V24B enhancement |
| 5 | nivel_soporte determinístico por sección | Medio | V25 |
| 6 | evidencia_base con id_pregunta | Alto | V25 |
| 7 | Generación IA opt-in (V5.1 prompts) | Alto | V25+ (sujeto a aprobación) |

---

## 15. Plan de Implementación por Fases

### Fase 0 — Completada ✓

- [x] Corrección CORS V23 (R2)
- [x] Creación V24B con scoring determinístico (17 criterios)
- [x] Integración frontend (botón "Documento auditado")
- [x] Simplificación UI (retiro de V24A de la interfaz)

### Fase 1 — V24B Enhancements (sin cambios de backend ni schema)

**Objetivo:** Mejorar precisión del scoring sin romper la interfaz actual.  
**Restricciones:** Solo modificar `Code_BuildHTMLAuditado` en n8n. Sin cambios a PG. Sin cambios al front.  
**Duración estimada:** 1-2 días.

- [ ] Agregar `suficiente(value, minPalabras)` al scoring de V24B
- [ ] Implementar anti-cargo-drift (token overlap ≥40% para cargos >3 tokens)
- [ ] Agregar campos `diagnostico_aptitud` al JSON de respuesta
- [ ] Agregar objeto `restricciones` al JSON de respuesta
- [ ] Actualizar QA checklist: verificar nuevos campos

### Fase 2 — V24B con nivel_soporte determinístico

**Objetivo:** Agregar trazabilidad de evidencia por sección sin OpenAI.  
**Restricciones:** Solo SELECT adicional en `PG_LeerRespuestasEntrevista`. Sin cambios al schema.  
**Duración estimada:** 3-5 días.

- [ ] Definir mapeo de preguntas a secciones del entregable (tabla de correspondencia)
- [ ] Calcular `nivel_soporte` por criterio: fuerte/medio/débil/sin_evidencia
- [ ] Mostrar `nivel_soporte` en la `secCompletitud` del HTML (columna adicional)
- [ ] Agregar `nivel_soporte_promedio` al JSON de respuesta

### Fase 3 — V25 con evidencia_base por sección

**Objetivo:** Trazabilidad completa desde sección del entregable hasta pregunta de entrevista.  
**Restricciones:** Nuevo endpoint, nuevo workflow. V24B intacto.  
**Duración estimada:** 1-2 semanas.

- [ ] Definir schema V25 (extensión de V24B con `evidencia_base` por criterio)
- [ ] Implementar JOIN con `rrhh.respuestas_entrevista` por criterio
- [ ] Generar HTML con sección de trazabilidad (pregunta → respuesta → sección)
- [ ] QA completo antes de activar en producción

### Fase 4 — V25+ con IA opt-in (sujeto a aprobación)

**Objetivo:** Generación de texto asistida para secciones con datos suficientes.  
**Prerrequisito:** Aprobación de uso de OpenAI. API key activa. Estimado de costo aprobado.  
**Duración estimada:** 2-3 semanas.

- [ ] Activar API key gpt-4o-mini
- [ ] Implementar prompts de V5.1 (grounded, nivel_soporte enforcement)
- [ ] Rate limiting: máximo N entregables/hora
- [ ] Audit log de llamadas IA en PG (INSERT en tabla dedicada — requiere aprobación de schema change)
- [ ] QA riguroso: anti-corte, anti-drift, nivel_soporte mínimo "medio" para generar

---

## Tabla de Clasificación de Componentes

| origen | nodo | tipo | componente | valor | riesgo | decisión | destino sugerido |
|---|---|---|---|---|---|---|---|
| V20/V21/V22 | Code - Detectar Brechas | Code JS | Detector de tiempos/frecuencias | Alto | Bajo | REUTILIZAR_DIRECTO | V24B `Code_BuildHTMLAuditado` |
| V20/V21/V22 | Code - Detectar Brechas | Code JS | Detector de volumen de trabajo | Medio | Bajo | REUTILIZAR_DIRECTO | V24B enhancement Fase 1 |
| V20/V21/V22 | Code - Detectar Brechas | Code JS | Detector de impacto del cargo | Medio | Bajo | REUTILIZAR_DIRECTO | V24B enhancement Fase 1 |
| V20/V21/V22 | Code - Criterio Suficiencia | Code JS | `criterio_suficiencia` (6 booleans + umbral ≥3) | Alto | Bajo | REUTILIZAR_DIRECTO | V24B `Code_BuildHTMLAuditado` |
| V20/V21/V22 | Code - Anti-Drift | Code JS | Token overlap check anti-cargo-drift | Alto | Bajo | REUTILIZAR_DIRECTO | V24B enhancement Fase 1 |
| V3/V4/V5/V5.1/V2 | PG - Query canónica | SQL SELECT | `vw_payload_ia_entregable_canonico` query | Alto | Bajo | REUTILIZAR_DIRECTO | Ya en V24B |
| V20/V21/V22 | Code - Normalizar Cargo | Code JS | `normalizarNombreCargo()` | Medio | Bajo | REUTILIZAR_DIRECTO | V24B enhancement Fase 1 |
| V20/V21/V22 | OpenAI - Manual Cargo | Prompt sistema | Anti-corte rules (5 reglas) | Alto | Bajo | USAR_COMO_REFERENCIA | Criterios editoriales V25 |
| V20/V21/V22 | OpenAI - QA Final | Prompt sistema | `tipo_de_falla`, `reproceso_recomendado` | Medio | Bajo | USAR_COMO_REFERENCIA | V24B `secRec` enhancement |
| V5.1 | OpenAI - Grounded Borrador | Prompt sistema | nivel_soporte + evidencia_base rules | Alto | Bajo | ADAPTAR_A_PG | V25 scoring por sección |
| V4 | OpenAI - Estructura Documental | Prompt sistema | Schema estructura documental | Medio | Bajo | USAR_COMO_REFERENCIA | V25 diseño |
| V3 | OpenAI - Diagnóstico Aptitud | Prompt sistema | Schema diagnóstico 1200 tokens | Alto | Bajo | ADAPTAR_A_PG | V24B JSON response Fase 1 |
| V20/V21/V22 | Code - Longitud | Code JS | `longitudEfectiva()` + umbral 40 palabras | Alto | Bajo | ADAPTAR_A_PG | V24B `suficiente()` Fase 1 |
| V5.1 | Structured Output | Schema JSON | Schema grounded con `nivel_soporte` por subsección | Alto | Medio | ADAPTAR_A_PG | V25 Fase 3 |
| V22 | Code - Parser | Code JS | `diagnosticarCorteManual()` | Medio | Bajo | USAR_COMO_REFERENCIA | V25 si se incorpora texto libre |
| V22 | Code - Parser | Code JS | `limpiarResiduosMultiparteLocal()` | Bajo | Bajo | USAR_COMO_REFERENCIA | V25+ si se usa OpenAI |
| V2 | Code - Payload | Code JS | `payload_ia_preparado` structure (metricas, alertas) | Medio | Bajo | ADAPTAR_A_PG | V24B JSON `metricas` Fase 1 |
| V20/V21/V22 | Notion - Write | Nodo Notion | createPage, updatePage | Ninguno | N/A | DESCARTAR | — |
| V20/V21/V22 | OpenAI - All nodes | Nodo OpenAI | gpt-4.1-mini llamadas directas | Ninguno | Alto | DESCARTAR | — |
| V3/V4/V5/V5.1 | OpenAI - All nodes | Nodo OpenAI | gpt-4o-mini llamadas directas | Ninguno | Medio | DESCARTAR | — |
| V20/V21/V22 | Code - Reintento | Code JS | Lógica 4×60s retry para OpenAI | Ninguno | N/A | DESCARTAR | — |
| V22 | Code - Multi-parte | Code JS | `integrarMultiparteSinReinicio()` | Ninguno | N/A | DESCARTAR | — |
| V22 | Code - Tool Calls | Code JS | Parser structured output tool_calls | Ninguno | N/A | DESCARTAR | — |
| V20/V21/V22 | Code - Switch Tipos | Code JS | 9 tipos de entregable con switch | Bajo | Medio | DESCARTAR | — |
| V20/V21 | Code - Inválidos | Code JS | `ENTREGABLES_INVALIDOS` hardcoded | Bajo | Bajo | DESCARTAR | — |
| V20/V21/V22 | Notion - Read | Nodo Notion | getPage para leer entregables | Ninguno | N/A | DESCARTAR | — |
| V3/V5 | Code - QA Flags | Code JS | `core.configuracion_sistema` flags | Bajo | Bajo | DESCARTAR | — |
| V3/V5.1 | Code - Auth | Code JS | Password "LMSS-QA" bypass | Bajo | Alto | DESCARTAR | — |

---

*Reporte generado automáticamente el 2026-05-28 por Claude (Anthropic) — LMSS / Levantamiento de Cargos.*  
*Versión V1 — Sin modificaciones a ningún workflow, schema PG, frontend, ni base de datos.*
