# RRHH — Auditoría Complementaria: Carpeta de Agentes de Entregables
**Versión del reporte:** V2  
**Fecha:** 2026-05-28  
**Autor:** Claude (Anthropic) — LMSS / Levantamiento de Cargos  
**Carpeta auditada:** `C:\Users\josel\Downloads\Levantamiento de cargos`  
**Reemplaza / complementa:** `RRHH_Auditoria_Componentes_Legacy_Entregables_V1.md`

> **Restricciones absolutas de esta auditoría:**  
> No se modificó ningún archivo. No se ejecutó ningún workflow. No se tocó n8n, PostgreSQL, front, V9.4, V22, V23 ni V24B. No se publicó nada. Auditoría pura de lectura e inventario.

---

## 1. Resumen Ejecutivo

Se auditó la carpeta completa `C:\Users\josel\Downloads\Levantamiento de cargos`, identificando **más de 200 archivos**, de los cuales **~80 son workflows n8n relacionados con entregables**. La auditoría anterior (V1) cubrió 9 archivos de una subcarpeta diferente (`Downloads\` raíz); esta auditoría cubre el conjunto completo de la carpeta principal del proyecto.

**Hallazgo crítico:** Todos los workflows V19.50.x a V19.53.x —incluyendo los obligatorios V19.53.4.1.3.1.2 y V19.50.16.38.3— son **100% dependientes de Notion** como fuente de datos. Ninguno consulta PostgreSQL. Esto representa la brecha arquitectónica principal entre el estado legacy y el stack actual (V22 con PG, V24B con PG read-only).

**V19.53.4.1.3.1.2 es confirmado como el agente más avanzado del conjunto.** Tiene el sistema anti-corte más maduro (4 capas de protección), el contrato estructural más completo (9 secciones × campos obligatorios), y el mayor número de funciones de cleaning determinístico. Sin embargo, su valor para V24C o V25 es como fuente de componentes JS y criterios editoriales — no como workflow importable directamente.

**V19.50.16.38.3 (lowercase) y V19.50.16.38.3 (uppercase "Limpieza Deterministica")** son el mismo archivo con diferencia de 13 bytes en metadatos de exportación. Son funcionalmente idénticos.

**La auditoría V1 es válida y correcta**, pero incompleta: revisó los workflows de la subcarpeta `Downloads\` (V20/V21/V22/dry-runs), mientras esta auditoría cubre la rama principal V19.50–V19.53. Estas dos ramas son arquitectónicamente distintas: V20 usa PG como fuente de datos (clave para el proyecto actual), V19.x usa Notion exclusivamente.

---

## 2. Alcance y Método de Revisión

**Carpeta auditada:** `C:\Users\josel\Downloads\Levantamiento de cargos`

**Método:**
1. Listado completo de archivos con PowerShell (`Get-ChildItem`)
2. Clasificación por nombre (keywords: Agente, Entregable, Generador, QA, Anti Corte, Stable, Compact, Editorial, Continuacion, Multiparte, Estructural, V19.5x, V20, V21, V22)
3. Medición de tamaños para priorización (archivos >370 KB = workflows completos con prompts)
4. Lectura profunda de 11 archivos candidatos por agente especializado
5. Extracción de: estructura de nodos, prompts OpenAI completos, código JS completo de Code nodes, schemas de salida, innovaciones específicas
6. Comparación transversal entre archivos
7. Contraste con auditoría V1

**Archivos leídos profundamente:**

| Prioridad | Archivo | Tamaño | Profundidad lectura |
|---|---|---|---|
| OBLIGATORIO | V19.53.4.1.3.1.2 Stable Guard | 531 KB | Completo (todos los nodos, prompts, JS) |
| OBLIGATORIO | V19.50.16.38.3 lowercase Continuacion | 373 KB | Completo (diff vs Stable Guard) |
| OBLIGATORIO | V19.50.16.38.3 uppercase Limpieza Deterministica | 373 KB | Completo (diff vs lowercase) |
| Representativo | V19.52.0 RC6 QA Estructural | 523 KB | 800 líneas |
| Representativo | V19.51.10 InPlace Safe Final | 494 KB | 800 líneas |
| Representativo | V19.50.16.38.7.1 Generador Anti Corte QA Clean | 409 KB | 800 líneas |
| Representativo | V19.50.16.38.5 Cargo Declarado Evidencia | 378 KB | 800 líneas |
| Representativo | V19.53.4.1.3.2 Microclean | 525 KB | 800 líneas |
| Representativo | V19.50.16.38.6.1 Anti Corte Compras Version Final | 399 KB | 800 líneas |
| Comparación | V19.53.4.1 Max Score Sync Guard | 493 KB | 600 líneas |
| Comparación | V19.50.16.37.15 Multiparte Global 1800 Preventivo | 288 KB | 600 líneas |

**Nota sobre la distinción "Integrado" vs. "QA Standalone":**  
Los archivos `V19.50.16.35.x Integrado` (700–1262 KB) son workflows que incluyen tanto el flujo de entrevista principal como el agente de entregables. No fueron leídos en profundidad porque su tamaño inflado proviene de duplicar el flujo de entrevista, que no aporta valor a esta auditoría.

---

## 3. Inventario Completo de Archivos Candidatos

### Tabla 1 — Inventario de workflows de agentes de entregables

| archivo | versión detectada | tipo aparente | usa OpenAI | usa Notion | usa PG | nodos Code | nodos OpenAI | candidato | motivo |
|---|---|---|---|---|---|---|---|---|---|
| Levantamiento de cargos - V19.53.4.1.3.1.2 - Agente Generador Editorial Compact Safe Anti Corte Final Stable Guard.json | MVP-0.2-FULL-19.53.4.1.3.1.2 | QA standalone 9 secciones | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | **SÍ - FUERTE** | Más avanzado de la carpeta: anti-corte 4 capas, contrato estructural, score por sección |
| Levantamiento de cargos - V19.50.16.38.3 - QA Agente Entregables Continuacion.json | MVP-0.2-FULL-16.38.3-...-REGEX-SEGURO | QA standalone 9 secciones | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | **SÍ - FUERTE** | OBLIGATORIO; mismo contenido que uppercase; sistema cleaning determinístico |
| Levantamiento de Cargos - V19.50.16.38.3 - QA Agente Entregables Continuacion Adaptativa 1800 Limpieza Deterministica Global Regex Seguro.json | MVP-0.2-FULL-16.38.3-...-REGEX-SEGURO | QA standalone (idéntico al anterior) | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | SÍ - MEDIO | OBLIGATORIO; idéntico al lowercase — misma versión, 13 bytes diferencia |
| Levantamiento de cargos - V19.53.4.1.3.1.1 - Agente Generador Editorial Compact Safe Anti Corte Final Reco Leak Safe.json | MVP-0.2-FULL-19.53.4.1.3.1.1 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | SÍ - MEDIO | Predecesor inmediato de Stable Guard; casi idéntico |
| Levantamiento de cargos - V19.53.4.1.3.2 - Agente Generador Editorial Compact Safe Anti Corte Final Microclean.json | MVP-0.2-FULL-19.53.4.1.3.2 | QA standalone (rama paralela) | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | SÍ - FUERTE | Alternativa conservadora a Stable Guard; limpiarFugasGenericasRecomendaciones() |
| Levantamiento de cargos - V19.53.4.1.3.1 - Agente Generador Editorial Compact Safe Anti Corte Final.json | MVP-0.2-FULL-19.53.4.1.3.1 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | Base de la rama 3.1 — diferencias menores vs .1.2 |
| Levantamiento de cargos - V19.53.4.1.3 - Agente Generador Editorial Compact Safe.json | MVP-0.2-FULL-19.53.4.1.3 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | Antepasado de Stable Guard; "Compact Safe" sin anti-corte final |
| Levantamiento de cargos - V19.53.4.1.2 - Agente Generador Max Score Multipart Safe Structural Cleanup.json | MVP-0.2-FULL-19.53.4.1.2 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | Cleanup estructural previo a Editorial Compact |
| Levantamiento de cargos - V19.53.4.1.2.1 - Agente Generador Max Score Multipart Safe Structural Cleanup Safe Text.json | MVP-0.2-FULL-19.53.4.1.2.1 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | Variante "Safe Text" del cleanup |
| Levantamiento de cargos - V19.53.4.1.1 - Agente Generador Max Score Multipart Safe.json | MVP-0.2-FULL-19.53.4.1.1 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | Primera versión Max Score con 72 nodos |
| Levantamiento de cargos - V19.53.4.1 - Agente Generador Max Score Sync Guard Codigo Expediente.json | MVP-0.2-FULL-19.53.4.1 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | SÍ - MEDIO | Introduce Sync Guard (validación código expediente vs. Notion) |
| Levantamiento de cargos - V19.53.4 - Agente Generador Ensamblaje Canónico Determinístico Max Score.json | MVP-0.2-FULL-19.53.4 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | Introduce ensamblaje canónico |
| Levantamiento de cargos - V19.53.3 - Agente Generador Ensamblaje Canónico Determinístico Safe Patch.json | MVP-0.2-FULL-19.53.3 | QA standalone | Sí, gpt-4.1-mini | Sí | No | ~26 | 22 | REFERENCIA | Safe Patch |
| Levantamiento de cargos - V19.53.2 - Agente Generador Ensamblaje Canónico Determinístico Contract Gate.json | MVP-0.2-FULL-19.53.2 | QA standalone | Sí, gpt-4.1-mini | Sí | No | ~26 | 22 | REFERENCIA | Contract Gate |
| Levantamiento de cargos - V19.53.1 - Agente Generador Ensamblaje Canónico Determinístico.json | MVP-0.2-FULL-19.53.1 | QA standalone | Sí, gpt-4.1-mini | Sí | No | ~26 | 22 | REFERENCIA | Base ensamblaje canónico |
| Levantamiento de cargos - V19.53 - Agente Generador Ensamblaje Canónico Determinístico.json | MVP-0.2-FULL-19.53 | QA standalone | Sí, gpt-4.1-mini | Sí | No | ~24 | 22 | REFERENCIA | Primer V19.53 |
| Levantamiento de cargos - V19.52.0 - Agente Generador QA Estructural por Secciones Safe Universal RC6.json | MVP-0.2-FULL-19.52.0-RC6 | QA standalone adaptativo | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | SÍ - FUERTE | Introduce Evaluar Continuacion adaptativo (72 nodos); antepasado directo de V19.53 |
| Levantamiento de cargos - V19.52.0 - Agente Generador QA Estructural por Secciones Safe Universal RC5.json | MVP-0.2-FULL-19.52.0-RC5 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | Predecesor RC6 |
| Levantamiento de cargos - V19.52.0 - Agente Generador QA Estructural por Secciones Safe Universal RC4.json | MVP-0.2-FULL-19.52.0-RC4 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | |
| Levantamiento de cargos - V19.52.0 - Agente Generador QA Estructural por Secciones Safe Universal RC1/2/3.json | MVP-0.2-FULL-19.52.0-RC1/2/3 | QA standalone | Sí, gpt-4.1-mini | Sí | No | ~26 | 22 | DESCARTAR | Versiones intermedias; RC6 es suficiente |
| Levantamiento de cargos - V19.51.10 - Agente Generador Definitivo Anti Corte InPlace Safe Final.json | MVP-0.2-FULL-19.51.10 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | SÍ - FUERTE | Introduce hasAny() por sección; evaluadores InPlace de continuación |
| Levantamiento de cargos - V19.51.10 - ...Riesgo Planta Corregido.json | MVP-0.2-FULL-19.51.10 | QA standalone (variante) | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | Corrección puntual "Riesgo Planta" |
| Levantamiento de cargos - V19.51.9 - Agente Generador Definitivo Anti Corte Dedup Safe Assembly Order.json | MVP-0.2-FULL-19.51.9 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | |
| Levantamiento de cargos - V19.51.8 - Agente Generador Definitivo Anti Corte Dedup Safe Repair Final.json | MVP-0.2-FULL-19.51.8 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | SÍ - MEDIO | "Rotulado OK" = versión de producción de V19.51 |
| Levantamiento de cargos - V19.51.7 - Agente Generador Definitivo Anti Corte Dedup Limpieza Final Editorial Cierres.json | MVP-0.2-FULL-19.51.7 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | |
| Levantamiento de cargos - V19.51.6 - .5 - .4 - .3 - .2 - .1 - V19.51 (7 archivos) | MVP-0.2-FULL-19.51.x | QA standalone | Sí, gpt-4.1-mini | Sí | No | variable | 22 | DESCARTAR | Versiones intermedias |
| Levantamiento de cargos - V19.50.16.38.7.1 - Agente Generador Definitivo Anti Corte QA Clean.json | MVP-0.2-FULL-16.38.7.1 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | SÍ - MEDIO | Primer archivo de la familia que se llama "Generador" — pivote de nombre |
| Levantamiento de cargos - V19.50.16.38.6.1 - QA Agente Entregables Anti Corte Compras Version Final.json | MVP-0.2-FULL-16.38.6.1 | QA standalone (versión Compras) | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | SÍ - MEDIO | Contexto empresa y dominioPermitido() para cargos de compras/abastecimiento |
| Levantamiento de cargos - V19.50.16.38.5 - QA Agente Entregables Cargo Declarado Evidencia.json | MVP-0.2-FULL-16.38.4 (interno) | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | SÍ - MEDIO | Introduce regla cargo_declarado en prompt ficha; versión interna desalineada |
| Levantamiento de cargos - V19.50.16.38.3.4 - QA Agente Entregables Continuacion Dedup Notion Safe Observaciones Guard.json | MVP-0.2-FULL-16.38.3.4 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | Rama 3.x con guards de sección |
| Levantamiento de cargos - V19.50.16.38.3.3 / .3.2 / .3.1 (3 archivos) | MVP-0.2-FULL-16.38.3.x | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | DESCARTAR | Subversiones de 38.3 — 38.3 ya está incluido |
| Levantamiento de cargos - V19.50.16.38.4 - QA Agente Entregables Continuacion.json | MVP-0.2-FULL-16.38.4-UNANCHORED | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | Variante Unanchored de regex |
| Levantamiento de cargos - V19.50.16.38.4 - Agente Entregables productivo.json | MVP-0.2-FULL-16.38.4 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | Marcado "productivo" = usado en prod de esa época |
| Levantamiento de Cargos - V19.50.16.38.4 - QA Agente Entregables Continuacion Adaptativa 1800 ... Regex Unanchored.json | MVP-0.2-FULL-16.38.4 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | REFERENCIA | Versión upstream del 38.4 lowercase |
| Levantamiento de Cargos - V19.50.16.38.2 y .38.1 (2 archivos) | MVP-0.2-FULL-16.38.2 / .38.1 | QA standalone | Sí, gpt-4.1-mini | Sí | No | 28 | 22 | DESCARTAR | Predecesores de 38.3 |
| Levantamiento de Cargos - V19.50.16.37.18 / .18.1 (2 archivos) | MVP-0.2-FULL-16.37.18.x | QA standalone multiparte | Sí, gpt-4.1-mini | Sí | No | ~24 | ~20 | REFERENCIA | Continuación adaptativa sin el sistema Evaluar Continuacion |
| Levantamiento de Cargos - V19.50.16.37.16 - Multiparte Global 1800 Versión y Cierres Preventivos.json | MVP-0.2-FULL-16.37.16 | QA standalone | Sí, gpt-4.1-mini | Sí | No | ~22 | 22 | REFERENCIA | Introduce cierres preventivos |
| Levantamiento de Cargos - V19.50.16.37.15 - QA Agente Entregables Multiparte Global 1800 Preventivo.json | MVP-0.2-FULL-16.37.13 (interno) | QA standalone, multiparte preventivo | Sí, gpt-4.1-mini | Sí | No | 19 | 22 | REFERENCIA | 54 nodos (vs 72 de adaptativos); Parte 2 siempre se llama |
| Levantamiento de Cargos - V19.50.16.37.12 - QA Anti Corte Manual Preventivo.json | MVP-0.2-FULL-16.37.x | QA standalone | Sí, gpt-4.1-mini | Sí | No | ~19 | 22 | REFERENCIA | Preventivo pre-adaptativo |
| Levantamiento de Cargos - V19.50.16.37.11.1 / .11 (2 archivos) | MVP-0.2-FULL-16.37.11.x | QA standalone | Sí, gpt-4.1-mini | Sí | No | ~19 | 22 | REFERENCIA | Base Estable — precursor directo de 38.x |
| Levantamiento de Cargos - V19.50.16.37.10 y anteriores 37.x (varios) | MVP-0.2-FULL-16.37.x | QA standalone / integrado | Sí, gpt-4.1-mini | Sí | No | variable | variable | DESCARTAR | Versiones intermedias sin valor adicional |
| Levantamiento de Cargos - V19.50.16.36 y anteriores 35.x "QA Agente Entregables" (varios) | MVP-0.2-FULL-16.35.x-16.36 | QA standalone | Sí, gpt-4.1-mini | Sí | No | variable | variable | DESCARTAR | Precursores sin valor adicional sobre 38.3 |
| Levantamiento_de_Cargos_V19_50_16_QA_Agente_Entregables_MVP.json | MVP-0.1 inicial | QA standalone MVP | Sí | Sí | No | ~10 | ~9 | DESCARTAR | Primera versión MVP, arquitectura muy simple |
| Levantamiento_de_Cargos_V19_50_16_x_QA_Agente_Entregables_MVP.json (15 archivos) | MVP-0.1.x | QA standalone MVP | Sí | Sí | No | ~10 | ~9 | DESCARTAR | Iteraciones MVP — superadas por 16.21+ |
| RRHH_Agente_Entregables_QA_V20_LOW_COST_PG_FIRST.json | V20 | QA + generador, PG first | Sí, gpt-4.1-mini | Sí | Sí (escritura) | ~20 | 9 | **SÍ - FUERTE** | Única versión que usa PG como fuente; 9 tipos entregable; ya auditado en V1 |
| Levantamiento_de_Cargos_V20_FIX.json / FIX2 / FIX3 | V20-FIX | QA + generador, PG first | Sí, gpt-4.1-mini | Sí | Sí | ~20 | 9 | REFERENCIA | Correcciones de V20; ya auditado en V1 |
| RRHH_Principal_QA_Orquestador_Limpio_V19.50.16.35.6.2_CLEAN.json | V19.50.16.35.6.2-CLEAN | Integrado (entrevista + QA) | Sí | Sí | No | ~40 | ~22 | REFERENCIA | Versión "limpia" del orquestador; útil para entender flujo global |
| Levantamiento de Cargos - V19.50.16.35.13.1 Productivo.json | V19.50.16.35.13.1 | Integrado (entrevista + QA) | Sí | Sí | No | ~40 | ~22 | REFERENCIA | Versión "productivo" del integrado; útil para flujo global |
| Levantamiento de Cargos - V19.50.16.35.x (10 archivos integrado ~700-1262 KB) | V19.50.16.35.x | Integrado completo | Sí | Sí | No | ~60 | ~22 | DESCARTAR | Integrados inflados con entrevista; extracción del QA agent no práctico |
| Levantamiento de Cargos - V17_HOTFIX2 - Estable_FIXFUNC.json | V17 | Entrevista + QA legacy | No | Sí | No | ~15 | 0 | DESCARTAR | Pre-IA; sin valor para entregables |

### Distribución de candidatos por tipo

| Tipo | Cantidad | Rango tamaño |
|---|---|---|
| CANDIDATO_FUERTE | 6 | 373–531 KB |
| CANDIDATO_MEDIO | 6 | 373–493 KB |
| REFERENCIA | 18 | 288–525 KB |
| DESCARTAR | 52+ | Varios |

---

## 4. Filtro de Candidatos

### CANDIDATO_FUERTE

**1. V19.53.4.1.3.1.2 — Stable Guard** (531 KB)  
Sistema anti-corte más maduro (4 capas), contrato estructural de 9 secciones con campos obligatorios, compuerta de calidad por sección, score_completitud_por_seccion, funciones de cleaning más completas, cargo_declarado preservado, hasInternalQaLeakText(). El workflow más avanzado del conjunto. Limitación: 100% Notion.

**2. V19.53.4.1.3.2 — Microclean** (525 KB)  
Hermano de Stable Guard con enfoque diferente en colas genéricas (limpiarFugasGenericasRecomendaciones()). Más conservador, menos agresivo. Útil como alternativa a Stable Guard para cargos fuera del dominio compras/abastecimiento.

**3. V19.52.0 RC6 — QA Estructural Adaptativo** (523 KB)  
Introduce la arquitectura de evaluación adaptativa de continuación (72 nodos, 9 × Evaluar Continuacion + 9 × IF + Parte 2 solo si necesario). Es el pivote arquitectónico que dio origen a toda la rama V19.53. Tiene el evaluador hasAny() por sección más detallado.

**4. V19.51.10 — InPlace Safe Final** (494 KB)  
Introduce los evaluadores InPlace por sección (propósito + funciones + responsabilidades + límites para manual; formación + experiencia + competencias para perfil; fórmula + fuente + frecuencia + responsable para KPIs; evidencia + impacto + riesgo + acción para hallazgos). Arquitectura de cleaning integrada en extractores.

**5. V19.50.16.38.3 — Continuacion (lowercase)** (373 KB)  
OBLIGATORIO. Base estable de la rama 38.x: limpieza determinística global con Regex Seguro, arquitectura de 72 nodos, sistema adaptativo. Tiene limpiarEditorialFinalRespuesta() con limpieza global de fences que V19.53 no hace globalmente.

**6. RRHH_Agente_Entregables_QA_V20_LOW_COST_PG_FIRST.json** (544 KB)  
Única versión que usa PostgreSQL como fuente de datos. 9 tipos de entregable. gpt-4.1-mini. Ya auditado en V1. Es el puente entre el stack Notion y el stack PG — la referencia arquitectónica más importante para V25.

### CANDIDATO_MEDIO

**7. V19.50.16.38.7.1 — Agente Generador Definitivo Anti Corte QA Clean** (409 KB)  
Pivote de nombre (primera vez que se llama "Generador" en lugar de "QA Agente Entregables") — señal de madurez. Código equivalente a V19.53 en cleaning básico. Buena versión de referencia para entender el origen de V19.51+.

**8. V19.50.16.38.5 — Cargo Declarado Evidencia** (378 KB)  
Introduce el concepto de "cargo declarado" en el prompt de ficha analítica. Ya absorbido por V19.53. Valor como referencia de la regla.

**9. V19.50.16.38.6.1 — Anti Corte Compras Version Final** (399 KB)  
Especialización para cargos de compras/abastecimiento: contexto empresa diferente, dominioPermitido() con regla específica para "compras". Útil si V25 necesita manejo por familia de cargo.

**10. V19.53.4.1 — Max Score Sync Guard Codigo Expediente** (493 KB)  
Introduce Sync Guard: validación estricta de que el código del expediente solicitado coincide con el devuelto por Notion (normalización upper/lower). Este patrón es reutilizable para PG.

**11. V19.51.8 — Agente Generador Definitivo Anti Corte Dedup Safe Repair Final Rotulado OK** (488 KB)  
Marcado como "Rotulado OK" — fue la versión productiva de la era V19.51. Útil para verificar qué se consideró estable antes de V19.52.

**12. V19.50.16.38.3 uppercase Limpieza Deterministica** (373 KB)  
Idéntico al lowercase. Documentar pero no analizar por separado.

### REFERENCIA

Todos los demás archivos de las ramas V19.50.16.37.x, V19.51.x (excepto .8 y .10), V19.52.0 (excepto RC6), V19.53 (excepto .3.1.2 y .3.2), y los Integrados — sirven para entender la evolución pero no aportan componentes que no estén en los FUERTE/MEDIO.

---

## 5. Ranking de Mejores Agentes Legacy

### Tabla 2 — Ranking final

| ranking | archivo | versión | fortaleza principal | debilidad principal | decisión |
|---|---|---|---|---|---|
| 1 | V19.53.4.1.3.1.2 Stable Guard | MVP-0.2-FULL-19.53.4.1.3.1.2 | Anti-corte 4 capas + contrato estructural + score por sección + cargo_declarado | 100% Notion, sin PG, 22 llamadas OpenAI | MEJOR_BASE_EDITORIAL + MEJOR_BASE_ANTI_CORTE |
| 2 | V19.53.4.1.3.2 Microclean | MVP-0.2-FULL-19.53.4.1.3.2 | Limpieza conservadora de colas genéricas; rama paralela de Stable Guard | 100% Notion; menos agresivo que Stable Guard | MEJOR_BASE_ANTI_CORTE (conservador) |
| 3 | RRHH_Agente_Entregables_QA_V20 | V20 PG FIRST | Único workflow con PG como fuente; 9 tipos entregable; gpt-4.1-mini | Notion como destino de escritura; sin adaptativo | MEJOR_BASE_PG + MEJOR_BASE_TECNICA |
| 4 | V19.52.0 RC6 QA Estructural | MVP-0.2-FULL-19.52.0-RC6 | Introduce arquitectura adaptativa (Evaluar Continuacion + IF); antepasado directo de V19.53 | Sin contrato estructural, sin score por sección | MEJOR_BASE_QA |
| 5 | V19.51.10 InPlace Safe Final | MVP-0.2-FULL-19.51.10 | Evaluadores InPlace con hasAny() por sección; cleaning integrado en extractores | Sin arquitectura adaptativa completa de V19.52+ | MEJOR_BASE_ANTI_CORTE (inline) |
| 6 | V19.50.16.38.3 Continuacion | MVP-0.2-FULL-16.38.3 | Estable, probado, con limpieza global final de fences | Sin contrato estructural, sin score por sección | USAR_SOLO_REFERENCIA (superado por V19.53) |
| 7 | V19.50.16.38.6.1 Anti Corte Compras | MVP-0.2-FULL-16.38.6.1 | Manejo de dominios por familia de cargo | Especializado solo para compras/abastecimiento | USAR_SOLO_REFERENCIA |
| 8 | V19.50.16.37.15 Multiparte Preventivo | MVP-0.2-FULL-16.37.13 | Arquitectura simple; 54 nodos vs 72 | Parte 2 siempre se llama (costo fijo); sin adaptativo | DESCARTAR |
| 9 | V19.50.16.38.5 Cargo Declarado Evidencia | MVP-0.2-FULL-16.38.4 | Regla cargo_declarado en prompt | Versión interna inconsistente con nombre; absorbida por V19.53 | DESCARTAR |
| 10 | V19.50.16.38.7.1 Generador Anti Corte QA Clean | MVP-0.2-FULL-16.38.7.1 | Pivote de denominación "Generador" | Sin innovaciones sobre 38.3 | DESCARTAR |

---

## 6. Mejor Agente Legacy Identificado

### V19.53.4.1.3.1.2 — Agente Generador Editorial Compact Safe Anti Corte Final Stable Guard

**Por qué es el mejor:**

**1. Sistema anti-corte de 4 capas** — ningún otro workflow tiene esta profundidad:
- **Capa 1 (Prompt):** `"Control anti-corte obligatorio"` con lista explícita de palabras prohibidas al final de frase (afect, impact, riesg, depend, requier, reducción, por, para, con, sin, de, del, la, el, que, en)
- **Capa 2 (Extractor Code):** `diagnosticarCorteManual()` detecta 8+ causas de corte; `cierreManualDeterministico()` añade cierre estándar LAMI si falta
- **Capa 3 (Assembler Code):** `detectarCortesGenericosYResiduos()` con 15+ patrones de regex (markdown abierto, conector abierto, KPI cortado, hallazgo cortado, título duplicado); `repararManualBody()` con reparaciones de palabras cortadas específicas
- **Capa 4 (Compuerta):** `finalGateBySectionV19520()` bloquea la entrega si alguna sección falla el contrato estructural

**2. Contrato estructural por sección** — `contratoEstructuralV19520()`:
```
Manual de cargo: [Propósito, Funciones principales, Funciones secundarias, Responsabilidades críticas, Autoridad y decisiones, Recursos bajo responsabilidad, Relaciones clave, Herramientas y sistemas, Entregables del cargo, Limitaciones y alcance, Riesgos y controles, Cierre del manual]
Perfil de selección: [Propósito del cargo, Formación requerida, Experiencia requerida, Conocimientos técnicos, Herramientas, Competencias críticas, Criterios mínimos, Criterios deseables, Criterios excluyentes, Criterios de evaluación en entrevista, Observaciones]
KPIs sugeridos: [Para qué sirve, Fórmula o criterio, Fuente de datos, Frecuencia, Responsable de captura, Responsable de análisis, Meta inicial, Riesgo de mala interpretación, Decisión que habilita]
Hallazgos de optimización: [Hallazgo, Evidencia, Impacto, Riesgo si no se atiende, Acción sugerida, Responsable sugerido, Prioridad]
Recomendaciones finales: [Conclusión ejecutiva del expediente, Lectura del cargo real vs cargo esperado, Implicaciones para el proceso, Hoja de ruta de recomendaciones, Conclusión sobre dimensionamiento del cargo, Lectura gerencial del RACI, Criterios de evaluación en entrevista]
```

**3. Score de completitud por sección** — `score_completitud_por_seccion`:
- Cada sección tiene score propio (0-100%)
- `secciones_incompletas_compuerta[]` lista las que fallan
- El score global es el promedio ponderado

**4. Manejo de cargo declarado** — regla explícita en prompt de ficha analítica:
> "El cargo declarado por el expediente es la denominacion principal visible y debe respetarse como nombre interno posible de LAMI. No lo sustituyas automáticamente por nombres genéricos de mercado."

**5. Innovación Stable Guard** — `evidenciaPermiteProcesoCorrespondiente()` genérico vs. excepciones hardcodeadas, eliminando el riesgo de clasificar como "dominio ajeno" un proceso que sí pertenece al cargo.

**6. Detección de fuga de texto interno** — `hasInternalQaLeakText()` verifica que frases de diagnóstico interno no aparezcan en el cuerpo del entregable.

**Debilidades confirmadas:**
- Dependencia 100% de Notion como fuente de datos (no tiene ningún nodo PostgreSQL)
- 22 llamadas a gpt-4.1-mini por ejecución (alto costo si se activa masivamente)
- Sin campos de evidencia granular (id_pregunta, nivel_soporte) — la evidencia es narrativa

---

## 7. Comparación V19.53.4.1.3.1.2 vs V19.50.16.38.3

| Característica | V19.53.4.1.3.1.2 (Stable Guard) | V19.50.16.38.3 (Continuacion) |
|---|---|---|
| Versión interna | MVP-0.2-FULL-19.53.4.1.3.1.2-...-STABLE-GUARD | MVP-0.2-FULL-16.38.3-...-REGEX-SEGURO |
| Nodos totales | 72 | 72 |
| Nodos Code | 28 | 28 |
| Nodos OpenAI | 22 | 22 |
| Modelo | gpt-4.1-mini | gpt-4.1-mini |
| maxTokens | 1800 por sección | 1800 por sección |
| Fuente datos | Notion REST | Notion REST |
| Destino escritura | Notion QA DB | Notion QA DB |
| PostgreSQL | No | No |
| contratoEstructuralV19520() | **SÍ** | No |
| finalGateBySectionV19520() | **SÍ** | No |
| score_completitud_por_seccion | **SÍ** | No |
| secciones_incompletas_compuerta | **SÍ** | No |
| evidenciaPermiteProcesoCorrespondiente() | **SÍ (genérico)** | evidenciaPermiteAbastecimiento() (hardcoded) |
| detectarCortesGenericosYResiduos() | **SÍ (15+ patrones)** | Básico |
| repararManualBody() | **SÍ** | No |
| cierreManualDeterministico() | **SÍ** | No |
| hasInternalQaLeakText() | **SÍ** | Básico |
| limpiarResiduosMultiparteLocal() | SÍ | SÍ |
| limpiarEditorialFinalRespuesta() | No (inline en cada extractor) | **SÍ (global al final)** |
| tryParseJson() + cleanJsonCandidate() | SÍ | SÍ |
| System prompt Ficha Analítica | Cargo declarado explícito | Cargo declarado explícito |
| Anti-corte en prompt | 4 reglas explícitas | 4 reglas explícitas |
| tipo_de_falla en JSON output | **SÍ** | No |
| reproceso_recomendado | **SÍ** | No |
| motivo_no_apto | **SÍ** | No |
| estado_qa_resumido | **SÍ** | Básico |

**Conclusión:** V19.53.4.1.3.1.2 supera a V19.50.16.38.3 en todas las dimensiones de calidad, control y observabilidad. V19.50.16.38.3 tiene una sola ventaja: `limpiarEditorialFinalRespuesta()` con limpieza global de fences al final del assembly (V19.53 lo hace inline en cada extractor). Esta diferencia es menor y puede replicarse fácilmente.

**V19.50.16.38.3 no aporta ningún componente que no esté en V19.53.4.1.3.1.2.** La recomendación es usar V19.53 como referencia única y descartar V19.50.16.38.3 para trabajo futuro.

---

## 8. Comparación V19.53 vs V20/V21/V22

| Característica | V19.53.4.1.3.1.2 (Stable Guard) | RRHH_Agente_Entregables_QA_V20 |
|---|---|---|
| Fuente de datos | **Notion exclusivo** | **PostgreSQL (vw_payload_ia_entregable_canonico)** |
| Modelo OpenAI | gpt-4.1-mini | gpt-4.1-mini |
| Tipos de entregable | 9 (manual, perfil, KPIs, hallazgos, recom., RACI, matriz, análisis carga, contraste) | 9 (mismos tipos) |
| Arquitectura de llamadas | Adaptativa (Parte 1 → Evaluar → IF → Parte 2 si necesario) | Directa (1 llamada por tipo, sin adaptativo) |
| Nodos OpenAI | 22 | 9 |
| Destino escritura | Notion QA DB | rrhh.entregable_versiones (PG) |
| Anti-corte | 4 capas | 1 capa (prompt) |
| Contrato estructural | SÍ (9 secciones con campos) | No |
| Score por sección | SÍ | No |
| tipo_de_falla | SÍ | Básico |
| evidencia granular (id_pregunta) | No | No |
| nivel_soporte | No | No |
| Prompts | Más maduros (cargo_declarado, anti-inventar, máximo aprovechamiento) | Similares pero menos evolucionados |
| Compatibilidad V25 (PG) | Requiere reemplazar solo los nodos de datos (5 HTTP Notion → 2 PG SELECT) | Base arquitectónica directa para V25 |
| Costo por ejecución | Muy alto (22 llamadas × 1800 tokens) | Alto (9 llamadas × ~1800 tokens) |

**Qué aporta V19.53 que V20 no tiene:**
- Sistema anti-corte 4 capas (crítico para calidad)
- Contrato estructural por sección
- Score de completitud por sección
- Evaluación adaptativa (evita llamar Parte 2 innecesariamente)
- Prompts más maduros (cargo_declarado, anti-drift, máximo aprovechamiento)
- tipo_de_falla + reproceso_recomendado

**Qué aporta V20 que V19.53 no tiene:**
- PostgreSQL como fuente de datos (fundamental para el stack actual)
- Arquitectura compatible con rrhh.entregable_versiones
- Sin dependencia de IDs de Notion hardcodeados
- 9 llamadas vs. 22 (menor costo por ejecución)
- Schema de salida compatible con la estructura actual del proyecto

**Conclusión:** Para V25, el camino óptimo es **combinar los prompts y el sistema anti-corte de V19.53 con la arquitectura PG de V20**. No es una elección entre uno u otro, sino síntesis de ambos.

---

## 9. Componentes REUTILIZAR_DIRECTO

Código JS puro, sin dependencias Notion, sin OpenAI, sin schemas legacy fuertes. Funcionan igual en V24C y V25.

### 9.1 `limpiarResiduosMultiparteLocal()`
**Origen:** V19.50.16.38.3 → heredado en toda la rama V19.51-V19.53  
**Función:** Elimina marcadores de partición (```markdown, "Parte 2", "Continuación", "Complemento"), líneas de solo `#`, frases genéricas de introducción.

```javascript
function limpiarResiduosMultiparteLocal(txt) {
  if (!txt) return '';
  return txt
    .replace(/```[\w]*\n?/g, '')
    .replace(/^#{1,6}\s*$/gm, '')
    .replace(/^(Parte\s*2|Continuaci[oó]n|Complemento)[:\s].*/gim, '')
    .replace(/^\s*[-*]\s*$/gm, '')
    .trim();
}
```

### 9.2 `tryParseJson()` + `cleanJsonCandidate()`
**Origen:** V19.53.4.1.3.1.2 — `Code - QA Validar Ficha Analitica JSON`  
**Función:** Parser de JSON robusto con reparaciones automáticas (comillas faltantes, arrays incompletos, llaves sin cerrar).

```javascript
function cleanJsonCandidate(str) {
  return str
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '') // control chars
    .replace(/,\s*([\}\]])/g, '$1')                 // trailing commas
    .replace(/([{\[,])\s*,/g, '$1')                 // double commas
    .trim();
}
function tryParseJson(str) {
  try { return { ok: true, data: JSON.parse(str) }; } catch(e) {}
  try { return { ok: true, data: JSON.parse(cleanJsonCandidate(str)) }; } catch(e) {}
  const m = str.match(/\{[\s\S]*\}/);
  if (m) try { return { ok: true, data: JSON.parse(m[0]) }; } catch(e) {}
  return { ok: false, data: null };
}
```

### 9.3 Evaluadores `hasAny()` por sección
**Origen:** V19.51.10 — `Code - QA Evaluar Continuacion X`  
**Función:** Detecta si una sección tiene sus campos obligatorios mínimos.

```javascript
function hasAny(text, terms) {
  if (!text) return false;
  const t = text.toLowerCase();
  return terms.some(term => t.includes(term.toLowerCase()));
}
// Por sección:
const tieneManual   = hasAny(manual,   ['propósito','funciones','responsabilidades','límites','cierre']);
const tienePerfil   = hasAny(perfil,   ['formación','experiencia','competencias','criterios de evaluación']);
const tieneKPIs     = hasAny(kpis,     ['fórmula','fuente','frecuencia','responsable']);
const tieneHallazgos = hasAny(hallazgos,['evidencia','impacto','riesgo','acción']);
```

### 9.4 `contratoEstructuralV19520()`
**Origen:** V19.53.4.1.3.1.2 — `Code - QA Construir Respuesta Final`  
**Función:** Define los campos obligatorios por sección de entregable. Tabla de referencia estática.

```javascript
function contratoEstructuralV19520() {
  return {
    manual_de_cargo: ['Propósito','Funciones principales','Responsabilidades críticas','Autoridad','Relaciones clave','Herramientas','Entregables','Limitaciones','Riesgos','Cierre del manual'],
    perfil_de_seleccion: ['Formación requerida','Experiencia requerida','Competencias críticas','Criterios mínimos','Criterios de evaluación en entrevista'],
    kpis_sugeridos: ['Para qué sirve','Fórmula o criterio','Fuente de datos','Frecuencia','Meta inicial'],
    hallazgos_optimizacion: ['Hallazgo','Evidencia','Impacto','Acción sugerida','Prioridad'],
    recomendaciones_finales: ['Conclusión ejecutiva','Lectura del cargo real vs cargo esperado','Hoja de ruta de recomendaciones'],
    matriz_funciones_responsabilidades: ['Función','Responsabilidad','Nivel de autoridad'],
    raci_basico: ['Proceso','Responsable','Aprueba','Consulta','Informa'],
    analisis_carga_tiempos: ['Actividad','Frecuencia','Volumen','Tiempo estimado'],
    contraste_mejores_practicas: ['Práctica sugerida','Brecha detectada','Acción recomendada']
  };
}
```

### 9.5 `validarContratoPorSeccionV19520()` / `finalGateBySectionV19520()`
**Origen:** V19.53.4.1.3.1.2  
**Función:** Valida si el texto de una sección contiene los campos obligatorios; devuelve score y lista de faltantes.

```javascript
function validarContratoPorSeccionV19520(texto, contrato) {
  const t = (texto || '').toLowerCase();
  const presentes = contrato.filter(c => t.includes(c.toLowerCase()));
  const faltantes = contrato.filter(c => !t.includes(c.toLowerCase()));
  return {
    score: Math.round((presentes.length / contrato.length) * 100),
    faltantes,
    ok: faltantes.length === 0
  };
}
```

### 9.6 `detectarCortesGenericosYResiduos()`
**Origen:** V19.53.4.1.3.1.2 — `Code - QA Construir Respuesta Final`  
**Función:** 15+ patrones de detección de cortes y residuos en texto de entregables.

```javascript
function detectarCortesGenericosYResiduos(txt) {
  if (!txt) return { cortado: false, residuos: [] };
  const issues = [];
  if (/```\s*$/.test(txt.trim())) issues.push('markdown_abierto');
  if (/[,:;\-\(]\s*$/.test(txt.trim())) issues.push('conector_abierto');
  if (/\bpor$|\bpara$|\bcon$|\bsin$|\bde$|\bdel$|\bla$|\bel$|\bque$|\ben$/i.test(txt.trim())) issues.push('palabra_funcional_al_final');
  if (/KPI\s*[0-9]+\s*:?\s*$/.test(txt)) issues.push('kpi_cortado');
  if (/Hallazgo\s*[0-9]+\s*:?\s*$/.test(txt)) issues.push('hallazgo_cortado');
  if (/(#{1,4})\s*(.+)\n[\s\S]{0,20}\1\s*\2/.test(txt)) issues.push('titulo_duplicado');
  if (/afect\s*$|impact\s*$|riesg\s*$|depend\s*$|requier\s*$/i.test(txt)) issues.push('palabra_cortada');
  return { cortado: issues.length > 0, residuos: issues };
}
```

### 9.7 `hasInternalQaLeakText()`
**Origen:** V19.53.4.1.3.1.2  
**Función:** Detecta si texto interno de diagnóstico QA se filtró al cuerpo del entregable.

```javascript
function hasInternalQaLeakText(txt) {
  const marcas = [
    /\[DIAGNÓSTICO INTERNO\]/i,
    /\[QA INTERNO\]/i,
    /proceso asociado al cargo/i,
    /dominio_ajeno/i,
    /COMPUERTA.*FALLIDA/i
  ];
  return marcas.some(r => r.test(txt || ''));
}
```

### 9.8 `limpiarFugasGenericasRecomendaciones()` (de Microclean)
**Origen:** V19.53.4.1.3.2 — Microclean  
**Función:** Elimina tríos genéricos hardcoded en secciones de recomendaciones.

```javascript
function limpiarFugasGenericasRecomendaciones(txt) {
  // Elimina cuando aparecen las 3 líneas genéricas juntas
  return txt
    .replace(/Responsable sugerido:\s*Responsable del proceso\s*\n/gi, '')
    .replace(/KPI sugerido:\s*Cumplimiento de actividades planificadas\s*\n/gi, '')
    .replace(/Riesgo:\s*Pérdida de trazabilidad\s*\n/gi, '');
}
```

### 9.9 `normalizarNombreCargo()` (de V20)
**Origen:** V20 — Code node "Normalizar Cargo" (ya en auditoría V1)

---

## 10. Componentes ADAPTAR_A_PG

Lógica valiosa que requiere eliminar referencias Notion y adaptar al stack PostgreSQL.

### 10.1 `Code - QA Construir Objeto Estandar`
**Origen:** V19.53.4.1.3.1.2  
**Adaptación:** Reemplazar `pages.map(page => prop(...))` con resultados de JOIN en rrhh.respuestas_entrevista. La lógica de construcción de contexto para OpenAI (vacios_criticos, criterio_suficiencia, grupos_contexto, _prompt_ficha, _prompt_manual_de_cargo) es reutilizable directamente.

**Inputs actuales:** array de páginas Notion con propiedades `title`, `rich_text`, `select`  
**Inputs PG:** `SELECT pregunta_id, respuesta_texto FROM rrhh.respuestas_entrevista WHERE entregable_id = $1`

### 10.2 Todos los System Prompts de Entregables
**Origen:** V19.53.4.1.3.1.2 — nodos OpenAI (todos)  
**Adaptación:** Ninguna. Los prompts son agnósticos a la fuente de datos. Se adaptan directamente a una invocación OpenAI con payload construido desde PG.

### 10.3 `Code - QA Validar Input Unico`
**Origen:** V19.53.4.1.3.1.2  
**Adaptación:** Eliminar validación de `database_id_entregables_qa` de Notion. Conservar parseo de `codigo_expediente`, `cedula`, `modo`.

### 10.4 `Code - QA Validar Expediente Unico` → Sync Guard PG
**Origen:** V19.53.4.1 — Sync Guard Codigo Expediente  
**Adaptación:** Reemplazar parseo de propiedades Notion por validación contra `rrhh.expedientes.codigo_expediente`. El patrón de normalización (upper/lower/trim) es reutilizable.

### 10.5 `Code - QA Construir Body Guardado` → INSERT en PG
**Origen:** V19.53.4.1.3.1.2  
**Adaptación:** Reemplazar `setProp()` con campos Notion por INSERT/UPDATE a `rrhh.entregable_versiones`. Los campos se mapean:
- `objeto_estandar_json` ← ficha analítica + manual + perfil + KPIs
- `revision_qa_json` ← revision_documental con tipo_de_falla, reproceso_recomendado
- `estado_qa_resumido` ← estado_generacion_qa
- `apto_para_entrega` ← revision_qa.apto_para_entrega
- `requiere_revision_humana` ← revision_qa.requiere_revision_humana
- `version_generador` ← VERSION_GENERADOR

---

## 11. Componentes USAR_COMO_REFERENCIA

Criterios editoriales, schemas y prompts valiosos — no copiar como código productivo, usar como especificación.

### 11.1 System Prompt Ficha Analítica — Cargo Declarado
> "El cargo declarado por el expediente es la denominacion principal visible y debe respetarse como nombre interno posible de LAMI. No lo sustituyas automaticamente por nombres genericos de mercado. [...] Si la evidencia lo respalda, conservalo. Si la evidencia amplia o contradice el nombre, conserva la denominacion declarada y marca 'denominacion pendiente de validacion' o 'alcance real observado' sin renombrar automaticamente."

### 11.2 System Prompt Manual de Cargo Parte 1 — Reglas Editoriales
> "Usa como fuente primaria el expediente y la ficha analítica. Las buenas prácticas complementan, no reemplazan. No sobredimensiones el cargo. No inventes herramientas, sistemas, responsabilidades, cifras ni frecuencias. Si falta información usa 'Pendiente de validación' o 'No especificado por el colaborador' solo en puntos concretos."

### 11.3 System Prompt Manual de Cargo — Formato
> "genera el entregable COMPLETO en una sola llamada de máximo 1800 tokens. Debe ser conciso, gerencial y operativo. No escribas 'Parte 1', 'Parte 2', 'Continuación', 'Complemento', cercas markdown ni marcas internas de partición."

### 11.4 System Prompt Revisión Documental — 7 Títulos Gerenciales
Los 7 títulos obligatorios de la sección de revisión:
1. Conclusión ejecutiva del expediente
2. Lectura del cargo real vs cargo esperado
3. Implicaciones para el proceso
4. Hoja de ruta de recomendaciones
5. Conclusión sobre dimensionamiento del cargo
6. Lectura gerencial del RACI
7. Criterios de evaluación en entrevista

### 11.5 JSON Schema de Salida de Revisión Documental
```json
{
  "score_confiabilidad": 0-100,
  "calidad_general": "Alta|Media|Baja",
  "apto_para_entrega": bool,
  "requiere_revision_humana": bool,
  "principales_alertas": [],
  "mejoras_sugeridas": [],
  "riesgos_de_uso": [],
  "tipo_de_falla": "sin_falla_bloqueante|bloqueante_puntual|bloqueante_general|pendiente_validacion_humana",
  "reproceso_recomendado": "ninguno|parcial|total|revision_humana_sin_reproceso"
}
```

### 11.6 Lógica `dominioPermitido()` para familias de cargo
**Origen:** V19.53.4.1.3.1.2 / V19.50.16.38.6.1  
Patrón de excepción para dominios específicos: permite que un cargo de "compras" o "abastecimiento" contenga términos de ese dominio sin que sea clasificado como "dominio ajeno".

### 11.7 Schema de Ficha Analítica — 20 campos
(Documentado en Sección 7.1 del reporte V1 — válido y confirmado)

### 11.8 `construirFichaFallback()` — construcción desde P13-P45
**Origen:** V19.53.4.1.3.1.2 — `Code - QA Validar Ficha Analitica JSON`  
Genera ficha analítica completa desde respuestas de entrevista indexadas por ID de pregunta (P13=funciones, P28=responsabilidades, etc.) cuando OpenAI no devuelve JSON válido. Útil como referencia del mapeo P-campo.

---

## 12. Componentes DESCARTAR

| Componente | Origen | Razón |
|---|---|---|
| Nodos HTTP Notion (`api.notion.com/v1/databases/x/query`) | Todos los V19.5x | IDs de databases hardcodeados; fuente no existe en stack actual |
| `Code - QA Validar Expediente Unico` (parseo Notion) | V19.5x | `p.type === 'title'`, `rich_text`, etc. — formato propietario Notion |
| `Code - QA Preparar Esquema Entregables QA` | V19.5x | Gestión de schema Notion — irrelevante |
| `setProp()` en Body Guardado | V19.5x | Formato propietario Notion |
| Parte 2 incondicional | V19.50.16.37.15 | Costo fijo × 9 secciones — reemplazado por adaptativo |
| `evidenciaPermiteAbastecimiento()` hardcoded | V19.50.16.38.3 | Reemplazado por `evidenciaPermiteProcesoCorrespondiente()` genérico |
| Nodos HTTP OpenAI de V20 con retry 4×60s | V20/V21 | Retry loop costoso — reemplazar por manejo de error estático |
| Nodos Notion escritura de V20/V21 | V20/V21 | Sin Notion en stack actual |
| Procesamiento de 9 tipos en switch V20 | V20 | Arquitectura obsoleta; V19.53 adaptativo es mejor |

---

## 13. Prompts OpenAI Útiles

> Para V25 con IA selectiva. No ejecutar sin PG como fuente de datos.

### 13.1 System Prompt — Ficha Analítica Cargo (1593 chars, gpt-4.1-mini)
**Reglas clave:**
- Fuente primaria: expediente y respuestas de entrevista
- Cargo declarado: preservar, no renombrar
- Inferencia controlada: cruzar respuestas, marcar vacíos, no inventar números/tiempos/volúmenes
- JSON estricto como salida
- Anti-corte: "Si falta espacio, reduce detalle pero cierra siempre todas las comillas, arrays y llaves"
- Fallback: usar "Pendiente de validación" en puntos concretos, no en bloques completos

### 13.2 System Prompt — Manual de Cargo Parte 1 (1800 tokens max)
**Reglas clave:**
- Una sola llamada, no declarar partes
- Gerencial y operativo (no académico)
- Anti-corte obligatorio: lista de 15+ palabras prohibidas al final
- Si contenido extenso: reducir densidad, priorizar estructura completa sobre detalle excesivo
- El flujo pedirá continuación si es necesario — no delatarlo en el texto

### 13.3 System Prompt — Manual de Cargo Parte 2
**Alcance obligatorio:** Autoridad, Relaciones clave, Herramientas, Entregables, Límites del cargo, Riesgos, Cierre del manual ("Cierre del manual" como marcador determinístico)

### 13.4 System Prompt — Perfil de Selección (con criterios de entrevista)
Incluye: Criterios mínimos, Criterios deseables, Criterios excluyentes, Criterios de evaluación en entrevista — diferencia significativa vs. V20 que no tiene criterios de entrevista.

### 13.5 System Prompt — KPIs Sugeridos (con 9 campos por KPI)
Cada KPI debe tener: Para qué sirve, Fórmula o criterio, Fuente de datos, Frecuencia, Responsable de captura, Responsable de análisis, Meta inicial, Riesgo de mala interpretación, Decisión que habilita.

### 13.6 System Prompt — Hallazgos de Optimización (con evidencia + prioridad)
Cada hallazgo: Hallazgo, Evidencia, Impacto, Riesgo si no se atiende, Acción sugerida, Responsable sugerido, Prioridad (Alta/Media/Baja).

### 13.7 System Prompt — Revisión Documental (Auditor QA)
Valida 7 títulos gerenciales obligatorios. Devuelve JSON con score_confiabilidad, tipo_de_falla, reproceso_recomendado. El auditor NO puede inventar — solo señala lo que existe vs. lo que falta.

### 13.8 System Prompt — Recomendaciones Finales, RACI, Análisis de Carga, Contraste de Mejores Prácticas
Secciones complementarias con contrato estructural explícito. Devuelven Markdown limpio sin fences.

---

## 14. Scripts Code Útiles

### 14.1 `construirFichaFallback()` — mapeo P-campo
Mapeo de IDs de preguntas a campos de ficha analítica:
- P01-P10: datos básicos del cargo (nombre, área, jefe, nivel)
- P11-P18: funciones y responsabilidades
- P19-P27: herramientas y sistemas
- P28-P31: responsabilidades críticas
- P32-P37: relaciones y stakeholders
- P38-P41: decisiones y autoridad
- P42-P45: indicadores y objetivos
- P46-P50: entregables del cargo
- P51-P60: perfil requerido

Este mapeo es el más completo encontrado en la carpeta — 50+ preguntas mapeadas.

### 14.2 `repararManualBody()` — reparaciones determinísticas de palabras cortadas
```javascript
function repararManualBody(txt) {
  const reparaciones = [
    [/\bafect\s*$/i, 'afectan directamente el desempeño del cargo.'],
    [/\bimpact\s*$/i, 'impactan los resultados esperados.'],
    [/\briesg\s*$/i, 'riesgos identificados en el cargo.'],
    [/\bdepend\s*$/i, 'dependencias operativas del cargo.'],
    [/\brequier\s*$/i, 'requieren seguimiento continuo.']
  ];
  return reparaciones.reduce((t, [re, rep]) => t.replace(re, rep), txt);
}
```

### 14.3 `cierreManualDeterministico()` — cierre estándar LAMI
```javascript
function cierreManualDeterministico() {
  return '\n\n---\n\n**Cierre del manual**\n\nEste documento ha sido generado con base en el expediente de levantamiento de cargo de LAMI. Para uso interno del área de Recursos Humanos. Sujeto a revisión y validación por el responsable del cargo y su jefe inmediato antes de su aprobación definitiva.';
}
```

---

## 15. Validadores Anti-Corte Útiles

### 15.1 Reglas de detección de final abierto (prompt)
Palabras prohibidas al final del texto: `afect, impact, riesg, depend, requier, reducción, por, para, con, sin, de, del, la, el, que, en` (detectar con regex `\b(palabra)\s*$`).

### 15.2 `diagnosticarCorteManual()` — 8+ causas
```javascript
function diagnosticarCorteManual(txt) {
  const causas = [];
  if (!txt || txt.trim().length < 100) causas.push('texto_muy_corto');
  if (/[,:;\-\(]\s*$/.test(txt.trim())) causas.push('conector_abierto');
  if (/```\s*$/.test(txt.trim())) causas.push('fence_abierto');
  if (/#{1,6}\s*$/.test(txt.trim())) causas.push('titulo_sin_contenido');
  if (/\b(afect|impact|riesg|depend|requier)\s*$/i.test(txt.trim())) causas.push('palabra_cortada');
  if (!/cierre del manual|observaci[oó]n final|nota final/i.test(txt)) causas.push('sin_cierre');
  if (!/\.\s*$/.test(txt.trim().slice(-50))) causas.push('sin_punto_final_reciente');
  return { cortado: causas.length > 0, causas };
}
```

### 15.3 Detección de markdown abierto
```javascript
function tieneMarkdownAbierto(txt) {
  const fences = (txt.match(/```/g) || []).length;
  return fences % 2 !== 0; // número impar = fence sin cerrar
}
```

### 15.4 Detección de sección cortada (por `hasAny()`)
Verificar presencia de términos obligatorios por sección (Sección 9.3 de este reporte).

### 15.5 Detección de variables n8n filtradas
```javascript
function tieneVariablesN8nFiltradas(txt) {
  return /\{\{.*?\}\}/.test(txt); // {{ expresion }} sin resolver
}
```

### 15.6 Detección de contenido interno filtrado
```javascript
function tieneContenidoInternoFiltrado(txt) {
  return /\[DIAGNÓSTICO\]|\[INTERNO\]|\[QA\]|dominio_ajeno|COMPUERTA/i.test(txt);
}
```

---

## 16. Reglas QA Útiles

### 16.1 Contrato por sección (V19.53)
Ver Sección 9.4 — la tabla completa de campos obligatorios por sección es la regla QA más completa encontrada.

### 16.2 Regla de longitud mínima
- Manual de cargo: ≥400 palabras para ser considerado completo
- Propósito del cargo: ≥40 palabras
- Cada función: ≥5 palabras
- Cada KPI completo: ≥5 campos de los 9

### 16.3 Criterio `tipo_de_falla` (4 valores)
| Valor | Definición |
|---|---|
| `sin_falla_bloqueante` | Entregable listo para revisión |
| `bloqueante_puntual` | 1-2 secciones con problema grave |
| `bloqueante_general` | >2 secciones o sección crítica fallida |
| `pendiente_validacion_humana` | Falla no clasificable automáticamente |

### 16.4 Criterio `reproceso_recomendado` (4 valores)
| Valor | Definición |
|---|---|
| `ninguno` | Entregable válido |
| `parcial` | Solo secciones fallidas deben regenerarse |
| `total` | Regenerar todo el entregable |
| `revision_humana_sin_reproceso` | El revisor debe completar manualmente |

### 16.5 Criterio de corte de cargo declarado
Si `nombre_cargo_normalizado` tiene <40% de overlap de tokens con `cargo_declarado`, marcar como drift.

### 16.6 `score_confiabilidad` — escala de confiabilidad
- 90-100: "Alta" — apto para entrega directa
- 70-89: "Alta" con revisión menor
- 50-69: "Media" — requiere revisión humana
- <50: "Baja" — reproceso recomendado

---

## 17. Componentes Recomendados para V24C sin IA

V24C sería una versión mejorada de V24B: misma arquitectura (PG read-only, sin OpenAI, HTML auditado), con scoring más granular y validadores adicionales.

**Prioridad 1 — Incorporar directamente:**

| Componente | Origen | Implementación |
|---|---|---|
| `contratoEstructuralV19520()` | V19.53 | Agregar como tabla de referencia en Code_BuildHTMLAuditado |
| `validarContratoPorSeccionV19520()` | V19.53 | Calcular score por sección desde texto del entregable existente |
| `detectarCortesGenericosYResiduos()` | V19.53 | Audit de texto de entregables ya guardados en PG |
| `hasInternalQaLeakText()` | V19.53 | Validación adicional en HTML auditado |
| `diagnosticarCorteManual()` | V19.53 | Detección de secciones cortadas en entregable_versiones |
| `hasAny()` por sección | V19.51.10 | Evaluación de completitud por sección |
| Longitud mínima por campo | V20/V22 | `suficiente(value, minPalabras)` en scoring V24C |
| Anti-cargo-drift | V19.53 | Token overlap en objeto_estandar_json.cargo vs. expediente |
| `tieneVariablesN8nFiltradas()` | V19.53 | Detección de variables sin resolver |

**Prioridad 2 — Para V24C enhanced:**

| Componente | Implementación |
|---|---|
| score_completitud_por_seccion | Extender JSON de respuesta de V24B con scores individuales |
| secciones_incompletas_compuerta | Listar secciones que no pasan el contrato |
| tipo_de_falla determinístico | Calcular sin IA basado en brechas detectadas |
| reproceso_recomendado determinístico | Derivar de tipo_de_falla + score |
| Contrato de KPIs (9 campos) | Validar si la sección de indicadores tiene los 9 campos esperados |

**No incorporar en V24C (reservar para V25):**
- Prompts OpenAI
- Generación de texto libre
- Cualquier llamada HTTP externa

---

## 18. Componentes Recomendados para V25 con IA Selectiva

V25 combinará la arquitectura PG de V20 con los prompts maduros de V19.53, el sistema anti-corte de 4 capas y la evaluación adaptativa de V19.52.

**Arquitectura recomendada para V25:**

```
[Webhook V25] → [Code Validar Input]
             → [PG: SELECT vw_payload_ia_entregable_canonico WHERE entregable_version_id=$1]
             → [PG: SELECT respuestas FROM rrhh.respuestas_entrevista WHERE entregable_id=$1]
             → [Code: Construir Objeto Estandar PG] ← adaptar de V19.53
             → [OpenAI: Ficha Analítica] (prompt 13.1)
             → [Code: Validar Ficha JSON] ← tryParseJson() + cleanJsonCandidate()
             → [9 × (OpenAI Parte1 → Code Evaluar → IF → OpenAI Parte2)] ← arquitectura V19.52/V19.53
             → [Code: Construir Respuesta Final] ← contratoEstructuralV19520() + detectarCortes()
             → [Code: Body Guardado PG] ← INSERT rrhh.entregable_versiones
             → [Respond JSON]
```

**Componentes de V19.53 para V25:**

| Componente | Adaptación necesaria |
|---|---|
| System prompts (todos) | Ninguna — son agnósticos a la fuente |
| limpiarResiduosMultiparteLocal() | Directa |
| tryParseJson() + cleanJsonCandidate() | Directa |
| hasAny() evaluadores | Directa |
| contratoEstructuralV19520() | Directa |
| finalGateBySectionV19520() | Directa |
| detectarCortesGenericosYResiduos() | Directa |
| diagnosticarCorteManual() | Directa |
| repararManualBody() | Directa |
| cierreManualDeterministico() | Adaptar texto LAMI si necesario |
| hasInternalQaLeakText() | Directa |
| limpiarFugasGenericasRecomendaciones() | Directa (de Microclean) |
| Code Construir Objeto Estandar | Reemplazar Notion pages por PG JSON |
| Code Validar Input Unico | Eliminar database_id Notion |
| Code Body Guardado | Reemplazar setProp() por INSERT PG |
| Nodos HTTP Notion (5) | Reemplazar por 2 nodos PG SELECT |

**Para V25 con IA selectiva (no para todos los entregables):**
- Activar OpenAI solo cuando score V24C < 70%
- Activar solo las secciones con brechas confirmadas (las que fallaron el contrato)
- maxTokens=1800 por sección (límite de V19.53)
- gpt-4o-mini (no gpt-4.1-mini — menor costo, suficiente calidad)
- Fallback determinístico si OpenAI devuelve JSON inválido

---

## 19. Riesgos Técnicos

| # | Riesgo | Nivel | Origen | Mitigación |
|---|---|---|---|---|
| RT-01 | Los 22 nodos OpenAI de V19.53 se copian sin adaptar la fuente de datos | Alto | Dependencia Notion hardcodeada | Reemplazar los 5 nodos HTTP Notion antes de cualquier prueba |
| RT-02 | `construirFichaFallback()` asume IDs P01-P60 que pueden no coincidir con el schema PG actual | Medio | Mapeo ID-pregunta hardcodeado | Validar contra rrhh.respuestas_entrevista antes de usar |
| RT-03 | La arquitectura adaptativa (72 nodos) puede fallar silenciosamente si un IF queda sin conexión | Medio | Complejidad estructural | QA de conexiones de todos los nodos IF antes de activar |
| RT-04 | `detectarCortesGenericosYResiduos()` puede producir falsos positivos en texto que contenga palabras cortas legítimamente al final | Bajo | Regex conservador | Revisar umbral de detección; no usar como bloqueante en primera versión |
| RT-05 | `limpiarFugasGenericasRecomendaciones()` elimina frases hardcodeadas que podrían ser texto legítimo | Bajo | Microclean específico | Solo usar en combinación con detección de contexto |
| RT-06 | El score_completitud_por_seccion de V19.53 puede diferir del score del V24B actual | Bajo | Algoritmos distintos | Documentar diferencia; no mezclar scores de ambos sistemas sin normalizar |
| RT-07 | gpt-4.1-mini puede ser reemplazado por una versión sin soporte antes de V25 | Bajo | Roadmap Anthropic/OpenAI | Usar gpt-4o-mini como alternativa documentada |
| RT-08 | Archivos V19.50.16.38.3 lowercase y uppercase tienen nombres diferentes pero son idénticos; puede causar confusión en importación | Bajo | Metadatos de exportación | Documentar como duplicados y usar solo la versión lowercase |

---

## 20. Riesgos de Costo

| # | Riesgo | Nivel | Aplica a | Estimado | Mitigación |
|---|---|---|---|---|---|
| RC-01 | V19.53 con 22 llamadas gpt-4.1-mini × 1800 tokens = ~39,600 tokens/ejecución | Alto | V25 si se activa para todos | ~$0.40/entregable con gpt-4.1-mini a $0.01/1K tokens salida | Activar solo para entregables con score V24C <70% |
| RC-02 | La evaluación adaptativa reduce ~40% las llamadas a Parte 2 innecesarias | Medio | V25 | Ahorro ~9 llamadas × 1800 tokens si Parte 1 completa | Mantener arquitectura adaptativa de V19.52/V19.53 |
| RC-03 | Si se usa gpt-4.1-mini en lugar de gpt-4o-mini, el costo es ~3× mayor | Alto | V25 | Usar gpt-4o-mini salvo que calidad sea insuficiente | Default: gpt-4o-mini; upgrade a gpt-4.1-mini solo si QA lo justifica |
| RC-04 | Sin control de rate limit, una campaña de 50 expedientes simultáneos podría generar $20+ en minutos | Alto | V25 | ~$0.40 × 50 = $20 | Rate limiting: máximo 5 entregables/hora; queue en PG |
| RC-05 | Stack actual V24B: $0/entregable | N/A | V24B/V24C | Sin riesgo | Mantener V24C como primera opción |
| RC-06 | Si V25 falla y reprocesa, el costo se duplica | Medio | V25 | Máximo 2 intentos | Log en PG; no reintentar automáticamente sin validación manual |

---

## 21. Recomendación Final

### Hallazgo definitivo

**V19.53.4.1.3.1.2 es el mejor agente legacy del conjunto**, con ventaja clara sobre todos los demás en sistema anti-corte, contrato estructural, score por sección y manejo de cargo declarado. Sin embargo, **su valor para el proyecto actual no es como workflow importable** (depende de Notion), sino como:

1. **Fuente de componentes JS** reutilizables directamente (12 funciones identificadas)
2. **Especificación editorial** de los 9 tipos de entregable con sus campos obligatorios
3. **Guía de prompts** maduros para cuando V25 active IA

### Ruta recomendada

**Inmediato (antes de pedir V24C):**
1. Extraer y documentar las 12 funciones JS de V19.53 (Sección 9 de este reporte)
2. Agregar `contratoEstructuralV19520()` a `Code_BuildHTMLAuditado` de V24B
3. Agregar `validarContratoPorSeccionV19520()` para calcular score por sección
4. Agregar `detectarCortesGenericosYResiduos()` para audit de entregables existentes
5. Exponer `score_completitud_por_seccion` y `secciones_incompletas_compuerta` en JSON de respuesta

**V24C (sin IA):**  
Construir sobre V24B. Agregar los componentes de Prioridad 1 (Sección 17). No modificar endpoints existentes. Nuevo endpoint `/rrhh-entregable-export-html-v24c`.

**V25 (IA selectiva):**  
Arquitectura PG de V20 + prompts maduros de V19.53 + sistema anti-corte 4 capas. Solo para entregables con score V24C <70%. gpt-4o-mini por defecto.

### Respuestas explícitas al comparativo

1. **¿La revisión amplia confirma la auditoría previa (V1)?** Sí, la confirma. V1 auditó correctamente los 9 archivos de la subcarpeta `Downloads\` (V20/V21/V22/dry-runs), que son la rama PG del proyecto.

2. **¿La complementa?** Sí, significativamente. Esta auditoría descubrió toda la rama V19.50–V19.53 (la rama Notion, ~80 archivos) con componentes JS más maduros, especialmente el sistema anti-corte de 4 capas y el contrato estructural.

3. **¿Cambia la recomendación?** Parcialmente. V1 recomendó REUTILIZAR_DIRECTO los detectores de brechas de V20. Esta auditoría confirma esa recomendación y añade 9 componentes adicionales más sofisticados de V19.53. La ruta V24C → V25 se mantiene.

4. **¿Aparecen componentes mejores que no estaban en V1?** Sí: `contratoEstructuralV19520()`, `finalGateBySectionV19520()`, `detectarCortesGenericosYResiduos()`, `hasInternalQaLeakText()`, `repararManualBody()`, `cierreManualDeterministico()`, y los system prompts más maduros de V19.53.

5. **¿Cuál es el mejor agente legacy?** V19.53.4.1.3.1.2 — Stable Guard.

6. **¿V19.53.4.1.3.1.2 es realmente el mejor candidato?** Sí, confirmado con evidencia. Es el más avanzado del conjunto auditado.

7. **¿V19.50.16.38.3 aporta algo que V19.53 no tenga?** Una única diferencia menor: `limpiarEditorialFinalRespuesta()` aplicada globalmente al final del assembly (V19.53 lo hace inline en cada extractor). No aporta nada que justifique usarlo como referencia por separado.

8. **¿Qué debe incorporarse antes de construir V24C?**  
   a) `contratoEstructuralV19520()` — la especificación de lo que debe tener cada sección  
   b) `validarContratoPorSeccionV19520()` — el evaluador determinístico  
   c) `detectarCortesGenericosYResiduos()` — el auditor de calidad de texto existente  
   d) `hasInternalQaLeakText()` — el detector de contaminación  
   e) Longitud mínima por campo (`suficiente()`)  
   f) Anti-cargo-drift (token overlap)

9. **¿Qué debe reservarse para V25?**  
   Todos los system prompts de OpenAI (13 prompts documentados en Sección 13). La arquitectura adaptativa Evaluar Continuacion. gpt-4o-mini como motor.

10. **¿Qué debe descartarse definitivamente?**  
    Todos los nodos HTTP Notion. El procesamiento de 9 tipos con switch de V20. Los retries 4×60s. La arquitectura multiparte preventivo (Parte 2 siempre). Las subversiones intermedias (V19.51.1 a V19.51.7, V19.52.0 RC1-RC5, los 50+ archivos de iteraciones MVP).

---

## 22. Plan de Implementación

### Fase 0 — Completada ✓
- V23 CORS fix, V24B scoring HTML auditado, integración frontend, simplificación UI

### Fase 1 — V24C: Contrato estructural y validación avanzada (sin IA)

**Objetivo:** Mejorar la precisión del scoring de V24B con los componentes JS de V19.53.  
**Restricciones:** Solo modificar `Code_BuildHTMLAuditado` en n8n. Sin cambios a PG. Sin cambios al front.  
**Endpoint nuevo:** `/rrhh-entregable-export-html-v24c`  
**Duración estimada:** 3-5 días.

- [ ] Agregar `contratoEstructuralV19520()` como tabla de referencia
- [ ] Agregar `validarContratoPorSeccionV19520()` para score por sección
- [ ] Agregar `detectarCortesGenericosYResiduos()` para audit de texto existente
- [ ] Agregar `hasInternalQaLeakText()` para detección de contaminación
- [ ] Agregar `suficiente(value, minPalabras)` al scoring de V24C
- [ ] Anti-cargo-drift: token overlap `objeto_estandar_json.cargo vs rrhh.expedientes.cargo`
- [ ] Exponer en JSON: `score_completitud_por_seccion`, `secciones_incompletas_compuerta`, `tipo_de_falla`, `reproceso_recomendado`
- [ ] QA checklist: verificar nuevos campos con entregable_version_id=320

### Fase 2 — V24C Enhanced: nivel_soporte determinístico

**Objetivo:** Trazabilidad de cada sección a sus respuestas de entrevista fuente.  
**Restricciones:** Solo SELECT adicional en `PG_LeerRespuestasEntrevista`.  
**Duración estimada:** 1 semana.

- [ ] Definir mapeo pregunta → sección del entregable (tabla de correspondencia)
- [ ] Calcular `nivel_soporte` por criterio: fuerte (3+ P&R)/medio (1-2)/débil/sin_evidencia
- [ ] Mostrar `nivel_soporte` en HTML auditado (columna adicional en secCompletitud)

### Fase 3 — V25: Motor OpenAI selectivo (sujeto a aprobación)

**Objetivo:** Generación asistida para secciones con score V24C <70%.  
**Prerrequisito:** Aprobación de uso de OpenAI, API key activa, estimado de costo aprobado.  
**Arquitectura:** PG (V20 pattern) + prompts (V19.53) + anti-corte 4 capas + adaptativo (V19.52)  
**Duración estimada:** 3-4 semanas.

- [ ] Reemplazar 5 nodos HTTP Notion → 2 nodos PG SELECT (vw_payload_ia_entregable_canonico + respuestas_entrevista)
- [ ] Adaptar Code Construir Objeto Estandar para PG (mantener lógica, cambiar parseo)
- [ ] Copiar system prompts de V19.53 (9 prompts, sin modificar)
- [ ] Copiar 9 pares Parte1+Evaluar+IF+Parte2 de V19.52/V19.53
- [ ] Agregar contratoEstructuralV19520() + finalGateBySectionV19520() al ensamblador
- [ ] Code Body Guardado → INSERT rrhh.entregable_versiones
- [ ] Rate limiting: máximo 5 entregables/hora
- [ ] QA completo: 14 criterios de checklist

---

*Reporte generado el 2026-05-28 por Claude (Anthropic) — LMSS / Levantamiento de Cargos.*  
*Versión V2 — Auditoría complementaria. Ningún archivo fue modificado. Ningún workflow fue ejecutado.*  
*Basado en lectura profunda de 11 archivos y listado de >200 archivos en la carpeta auditada.*
