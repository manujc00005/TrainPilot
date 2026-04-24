import Database from 'better-sqlite3';
import { logger } from '../../utils/logger.js';
import { generateId } from '../../utils/hash.utils.js';
import { endOfWeek } from '../../utils/date.utils.js';
import type { IStorage } from '../../types/storage.types.js';
import type { Activity } from '../../types/activity.types.js';
import type { WeeklyMetrics } from '../../types/metrics.types.js';
import type { TrainingGoal, PlannedSession } from '../../types/plan.types.js';
import type { StravaTokens } from '../../types/strava.types.js';
import type { LLMLogEntry } from '../../types/llm.types.js';

export class SqliteStorage implements IStorage {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  async initialize(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        strava_id INTEGER UNIQUE NOT NULL,
        athlete_id TEXT NOT NULL,
        sport TEXT NOT NULL,
        start_date TEXT NOT NULL,
        name TEXT NOT NULL,
        distance_meters REAL NOT NULL,
        moving_time_seconds INTEGER NOT NULL,
        elapsed_time_seconds INTEGER NOT NULL,
        total_elevation_gain_meters REAL NOT NULL,
        average_speed_ms REAL NOT NULL,
        average_pace_secs_per_km REAL,
        average_heart_rate REAL,
        max_heart_rate REAL,
        average_cadence REAL,
        average_watts REAL,
        suffer_score REAL,
        perceived_exertion REAL,
        raw_hash TEXT UNIQUE NOT NULL,
        weather_temp_celsius REAL,
        raw JSON NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_activities_athlete_date
        ON activities(athlete_id, start_date);

      CREATE TABLE IF NOT EXISTS weekly_metrics (
        id TEXT PRIMARY KEY,
        athlete_id TEXT NOT NULL,
        week_start TEXT NOT NULL,
        week_end TEXT NOT NULL,
        sport TEXT NOT NULL,
        activities_count INTEGER NOT NULL,
        data JSON NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(athlete_id, week_start)
      );

      CREATE TABLE IF NOT EXISTS training_goals (
        id TEXT PRIMARY KEY,
        athlete_id TEXT NOT NULL,
        sport TEXT NOT NULL,
        description TEXT NOT NULL,
        target_date TEXT,
        weekly_target_hours REAL NOT NULL,
        fitness_level TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS planned_sessions (
        id TEXT PRIMARY KEY,
        athlete_id TEXT NOT NULL,
        week_start TEXT NOT NULL,
        day_of_week INTEGER NOT NULL,
        session_type TEXT NOT NULL,
        target_distance_km REAL,
        target_duration_minutes REAL,
        target_pace_secs_per_km REAL,
        description TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        completed_activity_id TEXT,
        skipped_reason TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_planned_sessions_week
        ON planned_sessions(athlete_id, week_start);

      CREATE TABLE IF NOT EXISTS strava_tokens (
        athlete_id TEXT PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS llm_log (
        id TEXT PRIMARY KEY,
        athlete_id TEXT NOT NULL,
        context_type TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        cache_read_tokens INTEGER NOT NULL DEFAULT 0,
        cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
        response TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS subjective_fatigue (
        id TEXT PRIMARY KEY,
        athlete_id TEXT NOT NULL,
        date TEXT NOT NULL,
        score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 10),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(athlete_id, date)
      );
    `);
    logger.info('SQLite storage initialized');
  }

  close(): void {
    this.db.close();
  }

  // ── Activities ────────────────────────────────────────────

  async saveActivities(activities: Activity[]): Promise<void> {
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO activities (
        id, strava_id, athlete_id, sport, start_date, name,
        distance_meters, moving_time_seconds, elapsed_time_seconds,
        total_elevation_gain_meters, average_speed_ms, average_pace_secs_per_km,
        average_heart_rate, max_heart_rate, average_cadence, average_watts,
        suffer_score, perceived_exertion, raw_hash, weather_temp_celsius, raw
      ) VALUES (
        @id, @strava_id, @athlete_id, @sport, @start_date, @name,
        @distance_meters, @moving_time_seconds, @elapsed_time_seconds,
        @total_elevation_gain_meters, @average_speed_ms, @average_pace_secs_per_km,
        @average_heart_rate, @max_heart_rate, @average_cadence, @average_watts,
        @suffer_score, @perceived_exertion, @raw_hash, @weather_temp_celsius, @raw
      )
    `);

    const insertMany = this.db.transaction((acts: Activity[]) => {
      for (const a of acts) {
        insert.run({
          id: a.id,
          strava_id: a.stravaId,
          athlete_id: a.athleteId,
          sport: a.sport,
          start_date: a.startDate.toISOString(),
          name: a.name,
          distance_meters: a.distanceMeters,
          moving_time_seconds: a.movingTimeSeconds,
          elapsed_time_seconds: a.elapsedTimeSeconds,
          total_elevation_gain_meters: a.totalElevationGainMeters,
          average_speed_ms: a.averageSpeedMs,
          average_pace_secs_per_km: a.averagePaceSecsPerKm ?? null,
          average_heart_rate: a.averageHeartRate ?? null,
          max_heart_rate: a.maxHeartRate ?? null,
          average_cadence: a.averageCadence ?? null,
          average_watts: a.averageWatts ?? null,
          suffer_score: a.sufferScore ?? null,
          perceived_exertion: a.perceivedExertion ?? null,
          raw_hash: a.rawHash,
          weather_temp_celsius: a.weatherContext?.averageTempCelsius ?? null,
          raw: JSON.stringify(a.raw),
        });
      }
    });

    insertMany(activities);
  }

  async getActivitiesByDateRange(start: Date, end: Date, athleteId: string): Promise<Activity[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM activities
         WHERE athlete_id = ? AND start_date >= ? AND start_date <= ?
         ORDER BY start_date DESC`,
      )
      .all(athleteId, start.toISOString(), end.toISOString()) as Record<string, unknown>[];
    return rows.map(rowToActivity);
  }

  async getActivitiesByWeek(weekStart: Date, athleteId: string): Promise<Activity[]> {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    return this.getActivitiesByDateRange(weekStart, weekEnd, athleteId);
  }

  async getActivityByStravaId(stravaId: number): Promise<Activity | null> {
    const row = this.db
      .prepare('SELECT * FROM activities WHERE strava_id = ?')
      .get(stravaId) as Record<string, unknown> | undefined;
    return row ? rowToActivity(row) : null;
  }

  // ── Weekly metrics ────────────────────────────────────────

  async saveWeeklyMetrics(metrics: WeeklyMetrics): Promise<void> {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO weekly_metrics
         (id, athlete_id, week_start, week_end, sport, activities_count, data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        generateId(),
        metrics.athleteId,
        metrics.weekStart.toISOString(),
        metrics.weekEnd.toISOString(),
        metrics.sport,
        metrics.activitiesCount,
        JSON.stringify(metrics),
      );
  }

  async getWeeklyMetrics(weekStart: Date, athleteId: string): Promise<WeeklyMetrics | null> {
    const row = this.db
      .prepare('SELECT data FROM weekly_metrics WHERE athlete_id = ? AND week_start = ?')
      .get(athleteId, weekStart.toISOString()) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as WeeklyMetrics) : null;
  }

  async getRecentWeeklyMetrics(count: number, athleteId: string): Promise<WeeklyMetrics[]> {
    const rows = this.db
      .prepare(
        `SELECT data FROM weekly_metrics WHERE athlete_id = ?
         ORDER BY week_start DESC LIMIT ?`,
      )
      .all(athleteId, count) as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as WeeklyMetrics);
  }

  // ── Training goals ────────────────────────────────────────

  async saveGoal(goal: TrainingGoal): Promise<void> {
    this.db
      .prepare('UPDATE training_goals SET active = 0 WHERE athlete_id = ?')
      .run(goal.athleteId);
    this.db
      .prepare(
        `INSERT OR REPLACE INTO training_goals
         (id, athlete_id, sport, description, target_date, weekly_target_hours, fitness_level, active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      )
      .run(
        goal.id,
        goal.athleteId,
        goal.sport,
        goal.description,
        goal.targetDate?.toISOString() ?? null,
        goal.weeklyTargetHours,
        goal.fitnessLevel,
      );
  }

  async getActiveGoal(athleteId: string): Promise<TrainingGoal | null> {
    const row = this.db
      .prepare('SELECT * FROM training_goals WHERE athlete_id = ? AND active = 1 ORDER BY updated_at DESC LIMIT 1')
      .get(athleteId) as Record<string, unknown> | undefined;
    return row ? rowToGoal(row) : null;
  }

  // ── Planned sessions ──────────────────────────────────────

  async savePlannedSessions(sessions: PlannedSession[]): Promise<void> {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO planned_sessions
      (id, athlete_id, week_start, day_of_week, session_type,
       target_distance_km, target_duration_minutes, target_pace_secs_per_km,
       description, completed, completed_activity_id, skipped_reason)
      VALUES (@id, @athlete_id, @week_start, @day_of_week, @session_type,
              @target_distance_km, @target_duration_minutes, @target_pace_secs_per_km,
              @description, @completed, @completed_activity_id, @skipped_reason)
    `);

    const insertMany = this.db.transaction((s: PlannedSession[]) => {
      for (const session of s) {
        insert.run({
          id: session.id,
          athlete_id: session.athleteId,
          week_start: session.weekStart.toISOString(),
          day_of_week: session.dayOfWeek,
          session_type: session.sessionType,
          target_distance_km: session.targetDistanceKm ?? null,
          target_duration_minutes: session.targetDurationMinutes ?? null,
          target_pace_secs_per_km: session.targetPaceSecsPerKm ?? null,
          description: session.description,
          completed: session.completed ? 1 : 0,
          completed_activity_id: session.completedActivityId ?? null,
          skipped_reason: session.skippedReason ?? null,
        });
      }
    });

    insertMany(sessions);
  }

  async getPlannedSessionsByWeek(weekStart: Date, athleteId: string): Promise<PlannedSession[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM planned_sessions WHERE athlete_id = ? AND week_start = ?
         ORDER BY day_of_week`,
      )
      .all(athleteId, weekStart.toISOString()) as Record<string, unknown>[];
    return rows.map(rowToPlannedSession);
  }

  async markSessionCompleted(sessionId: string, activityId: string): Promise<void> {
    this.db
      .prepare(
        `UPDATE planned_sessions SET completed = 1, completed_activity_id = ? WHERE id = ?`,
      )
      .run(activityId, sessionId);
  }

  async markSessionSkipped(sessionId: string, reason: string): Promise<void> {
    this.db
      .prepare(`UPDATE planned_sessions SET skipped_reason = ? WHERE id = ?`)
      .run(reason, sessionId);
  }

  // ── Tokens ────────────────────────────────────────────────

  async saveTokens(athleteId: string, tokens: StravaTokens): Promise<void> {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO strava_tokens (athlete_id, access_token, refresh_token, expires_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
      )
      .run(athleteId, tokens.accessToken, tokens.refreshToken, tokens.expiresAt);
  }

  async getTokens(athleteId: string): Promise<StravaTokens | null> {
    const row = this.db
      .prepare('SELECT * FROM strava_tokens WHERE athlete_id = ?')
      .get(athleteId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      accessToken: row.access_token as string,
      refreshToken: row.refresh_token as string,
      expiresAt: row.expires_at as number,
    };
  }

  // ── LLM log ───────────────────────────────────────────────

  async saveLLMLog(entry: LLMLogEntry): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO llm_log
         (id, athlete_id, context_type, model, input_tokens, output_tokens,
          cache_read_tokens, cache_creation_tokens, response, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.id,
        entry.athleteId,
        entry.contextType,
        entry.model,
        entry.inputTokens,
        entry.outputTokens,
        entry.cacheReadTokens,
        entry.cacheCreationTokens,
        entry.response,
        entry.createdAt.toISOString(),
      );
  }

  // ── Subjective fatigue ────────────────────────────────────

  async saveSubjectiveFatigue(athleteId: string, date: Date, score: number): Promise<void> {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO subjective_fatigue (id, athlete_id, date, score)
         VALUES (?, ?, ?, ?)`,
      )
      .run(generateId(), athleteId, date.toISOString().split('T')[0], score);
  }

  async getSubjectiveFatigue(athleteId: string, date: Date): Promise<number | null> {
    const row = this.db
      .prepare('SELECT score FROM subjective_fatigue WHERE athlete_id = ? AND date = ?')
      .get(athleteId, date.toISOString().split('T')[0]) as { score: number } | undefined;
    return row?.score ?? null;
  }
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function rowToActivity(row: Record<string, unknown>): Activity {
  return {
    id: row.id as string,
    stravaId: row.strava_id as number,
    athleteId: row.athlete_id as string,
    sport: row.sport as Activity['sport'],
    startDate: new Date(row.start_date as string),
    name: row.name as string,
    distanceMeters: row.distance_meters as number,
    movingTimeSeconds: row.moving_time_seconds as number,
    elapsedTimeSeconds: row.elapsed_time_seconds as number,
    totalElevationGainMeters: row.total_elevation_gain_meters as number,
    averageSpeedMs: row.average_speed_ms as number,
    averagePaceSecsPerKm: (row.average_pace_secs_per_km as number | null) ?? undefined,
    averageHeartRate: (row.average_heart_rate as number | null) ?? undefined,
    maxHeartRate: (row.max_heart_rate as number | null) ?? undefined,
    averageCadence: (row.average_cadence as number | null) ?? undefined,
    averageWatts: (row.average_watts as number | null) ?? undefined,
    sufferScore: (row.suffer_score as number | null) ?? undefined,
    perceivedExertion: (row.perceived_exertion as number | null) ?? undefined,
    rawHash: row.raw_hash as string,
    weatherContext:
      row.weather_temp_celsius != null
        ? { averageTempCelsius: row.weather_temp_celsius as number, paceAdjustmentFactor: 1 }
        : undefined,
    raw: JSON.parse(row.raw as string),
  };
}

function rowToGoal(row: Record<string, unknown>): TrainingGoal {
  return {
    id: row.id as string,
    athleteId: row.athlete_id as string,
    sport: row.sport as TrainingGoal['sport'],
    description: row.description as string,
    targetDate: row.target_date ? new Date(row.target_date as string) : undefined,
    weeklyTargetHours: row.weekly_target_hours as number,
    fitnessLevel: row.fitness_level as TrainingGoal['fitnessLevel'],
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function rowToPlannedSession(row: Record<string, unknown>): PlannedSession {
  return {
    id: row.id as string,
    athleteId: row.athlete_id as string,
    weekStart: new Date(row.week_start as string),
    dayOfWeek: row.day_of_week as number,
    sessionType: row.session_type as PlannedSession['sessionType'],
    targetDistanceKm: (row.target_distance_km as number | null) ?? undefined,
    targetDurationMinutes: (row.target_duration_minutes as number | null) ?? undefined,
    targetPaceSecsPerKm: (row.target_pace_secs_per_km as number | null) ?? undefined,
    description: row.description as string,
    completed: Boolean(row.completed),
    completedActivityId: (row.completed_activity_id as string | null) ?? undefined,
    skippedReason: (row.skipped_reason as string | null) ?? undefined,
  };
}
