# CLAUDE.md — strava-coach

Guía de gobierno del código para el proyecto strava-coach.
Léela antes de modificar cualquier archivo.

---

## 🧠 Arquitectura

```
src/
├── config/          # Carga y validación de env vars (Zod). Única fuente de verdad de configuración.
├── types/           # Interfaces TypeScript puras. Sin lógica, solo contratos.
├── services/
│   ├── strava/      # Comunicación con Strava API. No calcula nada.
│   ├── metrics/     # Toda la lógica de cálculo. Sin IO.
│   ├── llm/         # Llamadas a Claude. Solo interpreta datos, no los calcula.
│   ├── notification/# Envío de mensajes. Agnóstico al contenido.
│   └── storage/     # Acceso a datos. Nunca contiene lógica de negocio.
├── jobs/            # Orchestrators. Solo llaman servicios, sin lógica propia.
├── controllers/     # HTTP handlers. Parse input → call service → return response.
├── middleware/      # Express middleware transversal.
└── utils/           # Funciones puras reutilizables. Sin dependencias de servicios.
```

### Regla de dependencias (acíclica, top-down)

```
controllers → services → utils
jobs        → services → utils
services    → types, utils
types       → (nada)
```

**Prohibido**: que `services/` importe de `controllers/` o `jobs/`. Que `utils/` importe de `services/`.

---

## ⚙️ Reglas de desarrollo

### TypeScript
- `strict: true` siempre. Si el compilador protesta, arréglalo — no uses `as unknown`.
- Usa `type` para shapes de datos, `interface` para contratos implementables (proveedores, storage).
- Nunca uses `any`. Si recibes datos externos sin tipo, define la interfaz en `src/types/`.
- Los retornos de función siempre tienen tipo explícito salvo que sea obvio por inferencia.

### Funciones
- Máximo ~40 líneas. Si crece más, extrae una función con nombre descriptivo.
- Una función = una responsabilidad. El nombre debe describir completamente lo que hace.
- Funciones puras siempre que sea posible (dado X, siempre devuelve Y, sin efectos).

### Imports
- **Nunca `await import()` dinámico** dentro de métodos o funciones. Siempre imports estáticos en el top del archivo.
  - **Por qué**: los imports dinámicos dentro de métodos ocultan dependencias, complican el tree-shaking y causaron bugs reales en sqlite.storage.ts (ver historial).
- Agrupa imports: 1) externos (node_modules), 2) internos (src/), 3) types.

### Constantes mágicas
- Ningún número o string hardcodeado en lógica de negocio.
- Las constantes van en `src/config/constants.ts`.
- Valores que deberían ser configurables (p.ej. `thresholdHR = 170`) se mueven a `ATHLETE_THRESHOLD_HR` en `.env` cuando haya multi-usuario.

---

## 🔌 Integraciones

### Strava API (`src/services/strava/`)

| Archivo | Responsabilidad |
|---|---|
| `strava.auth.ts` | Token lifecycle. Refresh automático 5 min antes de expirar. |
| `strava.mapper.ts` | `StravaActivity` → `Activity` (interno). Único lugar donde se toca el raw. |
| `strava.service.ts` | Fetch paginado. Solo llama a Strava y devuelve `Activity[]`. |

**Entrada**: `Date` range + `athleteId`
**Salida**: `Activity[]` (tipo interno, nunca `StravaActivity` fuera de este módulo)
**Errores**: `withRetry()` maneja rate limits y timeouts. Si falla tras 3 intentos, propaga el error arriba — el job lo captura y loguea.

**Reglas**:
- `StravaActivity` (raw) nunca sale del módulo `strava/`. El resto del sistema usa `Activity`.
- El `raw` original se guarda en SQLite para debugging, pero ningún servicio lo lee.
- Deduplicación por `raw_hash` (SHA-256 del JSON raw). `INSERT OR IGNORE` en SQLite.

### Claude API (`src/services/llm/`)

| Archivo | Responsabilidad |
|---|---|
| `claude.provider.ts` | Llamada directa a `@anthropic-ai/sdk`. Prompt caching activado. |
| `llm.service.ts` | Orchestrator: selecciona prompt, llama provider, persiste log. |
| `prompts/*.prompt.ts` | Templates de prompts. Solo formatean datos, no llaman a nada. |

**Entrada**: `LLMContext` (métricas + goal + actividades recientes)
**Salida**: `string` (texto libre del modelo)
**Errores**: el provider propaga excepciones del SDK. `llm.service.ts` las captura, loguea y re-lanza.

**Reglas**:
- `claude.provider.ts` no conoce el dominio de entrenamiento. Solo recibe `systemPrompt` + `userPrompt`.
- El `system` prompt siempre lleva `cache_control: { type: 'ephemeral' }` — ahorra ~80% en tokens de input en llamadas repetidas.
- Toda llamada al LLM queda registrada en `llm_log` (tokens, modelo, coste implícito). No borrar este log.
- El LLM **nunca** calcula métricas. Solo interpreta los números que le pasan los prompts.

### Telegram (`src/services/notification/`)

| Archivo | Responsabilidad |
|---|---|
| `telegram.provider.ts` | Envío de mensajes + parsing de updates entrantes. |
| `notification.service.ts` | Factory: devuelve el provider configurado en `NOTIFICATION_PROVIDER`. |
| `message.formatter.ts` | Añade headers y formatea Markdown. Sin lógica de negocio. |

**Entrada**: `NotificationPayload { type, text, athleteId }`
**Salida**: `void` (efecto lateral puro)
**Errores**: `withRetry()` en cada chunk enviado. Telegram limita a 4096 chars — `splitMessage()` maneja el corte.

**Comando de usuario**: `/fatiga [1-10]` → `webhook.controller.ts` → `storage.saveSubjectiveFatigue()`.
El webhook siempre devuelve HTTP 200, aunque falle internamente (Telegram reintentaría si recibe error).

---

## 🧠 Lógica de negocio

### Fuentes de verdad

| Qué | Dónde vive |
|---|---|
| Cálculos de volumen | `volume.calculator.ts` |
| Cálculos de intensidad / TSS | `intensity.calculator.ts` |
| Modelo ATL/CTL/TSB | `fatigue.detector.ts` |
| Compliance sesión vs. actividad | `compliance.checker.ts` |
| Orquestación de todos los anteriores | `metrics.service.ts` |

**Regla absoluta**: ningún servicio fuera de `src/services/metrics/` calcula métricas de entrenamiento.
Los jobs, controllers y el LLM reciben métricas ya calculadas — nunca las computan ellos.

### TSS y zonas de intensidad

Actualmente hay valores hardcodeados en `intensity.calculator.ts`:
- `thresholdHR = 170` bpm
- `thresholdPace = 270` s/km (4:30/km)
- Zona easy: HR < 140, pace > 5:30/km

Estos son defaults razonables. Cuando se implemente multi-usuario, moverlos a `TrainingGoal` o perfil de atleta. **No mover antes** — YAGNI.

---

## ⏱️ Jobs (cron)

Los jobs son orchestrators puros. No contienen lógica de dominio.

```
job correcto:
  1. obtener datos del storage
  2. llamar a un service con esos datos
  3. guardar resultado en el storage
  4. enviar notificación si procede

job incorrecto:
  1. calcular métricas inline
  2. construir prompts directamente
  3. formatear mensajes
```

**Todos los jobs son idempotentes**: ejecutar el mismo job dos veces el mismo día produce el mismo resultado observable (gracias a `INSERT OR IGNORE` y `INSERT OR REPLACE` en storage).

**Horario cron**:

| Job | Cron | Por qué ese horario |
|---|---|---|
| `token-refresh` | `0 */5 * * *` | Tokens Strava expiran cada 6h |
| `daily-sync` | `0 6 * * *` | Descarga actividades de ayer completas |
| `daily-analysis` | `30 6 * * *` | 30 min después del sync para asegurar datos |
| `compliance-check` | `0 20 * * *` | Noche, tiempo para que el atleta entrene |
| `weekly-planning` | `0 8 * * 0` | Domingo para tener plan antes del lunes |

**Testing manual** (sin esperar cron):
```bash
curl -X POST http://localhost:3000/api/status/run/<job-name> -H "x-api-key: <API_KEY>"
curl -X POST "http://localhost:3000/api/status/run/<job-name>?dry=true" -H "x-api-key: <API_KEY>"
```

---

## 🚨 Manejo de errores

- **Nunca `console.log`**. Siempre `logger` de `src/utils/logger.ts` (Pino).
- Niveles: `logger.debug` para trazas de desarrollo, `logger.info` para eventos de negocio, `logger.warn` para situaciones recuperables, `logger.error` para fallos que necesitan atención.
- Incluye siempre contexto estructurado: `logger.error({ err, job: 'daily-sync' }, 'mensaje')`.
- Los jobs capturan excepciones en `safeRun()` del scheduler. Nunca crashes el proceso por un job fallido.
- Las APIs externas (Strava, Claude, Telegram) pueden fallar. `withRetry()` en `utils/retry.utils.ts` maneja backoff exponencial con 3 intentos por defecto.

---

## 📦 Performance

### Llamadas a Strava
- Solo se llama a Strava en `daily-sync.job.ts`. Ningún otro job ni controller hace fetch directo.
- `INSERT OR IGNORE` con `raw_hash` previene procesar la misma actividad dos veces.
- La paginación está implementada en `strava.service.ts` — nunca hagas un fetch sin paginación.

### Llamadas a Claude
- Prompt caching activo: el system prompt (que incluye el rol del coach) se cachea con TTL de 5 min en la API de Anthropic. Las llamadas repetidas en el mismo periodo cuestan ~10% del precio normal.
- El log en `llm_log` permite auditar qué se envía al modelo. Revísalo si los costes son altos.
- Nunca llames al LLM más de una vez por job. Si necesitas dos análisis distintos, usa un solo prompt con ambas secciones.

### SQLite
- WAL mode activado (`PRAGMA journal_mode = WAL`): lecturas y escrituras concurrentes sin bloqueos.
- Los índices críticos ya existen: `idx_activities_athlete_date`. Si añades queries nuevas con `WHERE`, añade el índice correspondiente.

---

## 🧪 Testing

Los servicios de métricas (`volume.calculator.ts`, `intensity.calculator.ts`, `fatigue.detector.ts`, `compliance.checker.ts`) son funciones puras: dado `Activity[]`, devuelven métricas. Son trivialmente testeables:

```typescript
// tests/unit/metrics/volume.test.ts
import { calculateVolume } from '../../../src/services/metrics/volume.calculator';

test('empty activities returns zero volume', () => {
  expect(calculateVolume([])).toMatchObject({ totalDistanceKm: 0 });
});
```

**Para testear servicios con IO** (storage, Strava, LLM): usa el patrón de inyección implícita vía `IStorage`. En tests, pasa un mock que implemente la interfaz.

No testees los prompts (demasiado volátiles). Sí testea los mappers y calculators.

---

## 🧩 Escalabilidad futura

### Multi-usuario
- `athleteId` ya está en todas las tablas y queries. El cambio principal sería:
  1. Añadir tabla `users` con OAuth de Strava
  2. Leer `athleteId` del JWT en cada request en lugar de `config.STRAVA_ATHLETE_ID`
  3. Cada job recibe `athleteId` como parámetro en lugar de leerlo de config

### Base de datos en producción
- Cambiar `STORAGE_BACKEND=postgres` en `.env`.
- Implementar `src/services/storage/postgres.storage.ts` implementando `IStorage`.
- El resto del código no cambia.

### Hosting en cloud
- Los cron jobs actuales (node-cron in-process) se pueden migrar a cron endpoints HTTP.
- Cada job ya es una función independiente en `src/jobs/`. El scheduler solo cambia de llamante.
- Ver `controllers/status.controller.ts` — `POST /api/status/run/:job` ya existe para invocación externa.

---

## 🐛 Bugs conocidos y corregidos

### Imports dinámicos dentro de métodos (corregido)
**Síntoma**: `await import('../../utils/hash.utils.js')` dentro de `saveWeeklyMetrics()`, `saveSubjectiveFatigue()`, `bootstrap()` y `getActivityDetail()`.
**Problema**: oculta dependencias al lector, complica el análisis estático, y no hay beneficio real de lazy loading en un servidor Node.
**Fix**: convertidos a imports estáticos en el top del archivo.
**Regla**: nunca usar `await import()` salvo que sea un plugin verdaderamente opcional que nunca se carga en producción normal.

### `endOfWeek`/`startOfWeek` no re-exportados (corregido)
**Síntoma**: `sqlite.storage.ts` importaba `endOfWeek` de `../../utils/date.utils.js` pero no estaba re-exportado, causando error en runtime.
**Fix**: añadidos `startOfWeek` y `endOfWeek` al re-export de `date.utils.ts`.
**Regla**: si un módulo utils re-exporta funciones de una librería, hacerlo de forma explícita. No asumir que están disponibles.

### Tipo malformado en `buildTrendSummary` (corregido)
**Síntoma**: `function buildTrendSummary(weeks: typeof [] extends never[] ? never : unknown[])` — tipo condicional que siempre resuelve a `never`, haciendo el parámetro inútil para el compilador.
**Fix**: tipado correcto con `WeeklyMetrics[]`.
**Regla**: no uses tipos condicionales complejos donde un tipo directo funciona. Si el tipo viene de una interfaz ya definida, úsala.

### `mapStravaActivity` importado dinámicamente (corregido)
**Síntoma**: `getActivityDetail()` en `strava.service.ts` hacía `await import('./strava.mapper.js')` para un import que ya estaba disponible estáticamente.
**Fix**: import estático de `mapStravaActivity` junto al ya existente `mapStravaActivities`.

---

## 📁 Añadir nuevas funcionalidades — checklist

Antes de añadir código nuevo:

- [ ] ¿El cálculo va en `services/metrics/`? Si toca datos de entrenamiento, sí.
- [ ] ¿La nueva entidad de datos tiene su interface en `src/types/`?
- [ ] ¿El nuevo método de storage está definido primero en `IStorage`?
- [ ] ¿Los imports son estáticos (no `await import()`)?
- [ ] ¿Las constantes nuevas van a `constants.ts`?
- [ ] ¿Usas `logger.*` en lugar de `console.*`?
- [ ] ¿La función tiene menos de ~40 líneas?
