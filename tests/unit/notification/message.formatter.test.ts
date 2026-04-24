import { describe, it, expect } from 'vitest';
import { formatMessage } from '../../../src/services/notification/message.formatter.js';

describe('formatMessage — Telegram markdown conversion', () => {
  it('converts ### heading to *bold*', () => {
    const out = formatMessage('custom', '### Estado de Rendimiento');
    expect(out).toBe('*Estado de Rendimiento*');
  });

  it('converts ## and # headings to *bold*', () => {
    expect(formatMessage('custom', '## Sección')).toBe('*Sección*');
    expect(formatMessage('custom', '# Título')).toBe('*Título*');
  });

  it('converts **bold** to *bold*', () => {
    const out = formatMessage('custom', 'El atleta tiene **alto CTL**.');
    expect(out).toBe('El atleta tiene *alto CTL*.');
  });

  it('removes horizontal rules', () => {
    const out = formatMessage('custom', 'Línea 1\n---\nLínea 2');
    expect(out).toBe('Línea 1\n\nLínea 2');
  });

  it('collapses 3+ blank lines into 2', () => {
    const out = formatMessage('custom', 'A\n\n\n\nB');
    expect(out).toBe('A\n\nB');
  });

  it('prepends the correct Spanish header for daily_analysis', () => {
    const out = formatMessage('daily_analysis', 'contenido');
    expect(out).toMatch(/^📈 \*Informe de entrenamiento\*/);
  });

  it('prepends the correct Spanish header for weekly_plan', () => {
    const out = formatMessage('weekly_plan', 'contenido');
    expect(out).toMatch(/^📅 \*Plan semanal\*/);
  });

  it('prepends the correct Spanish header for compliance_check', () => {
    const out = formatMessage('compliance_check', 'contenido');
    expect(out).toMatch(/^✅ \*Revisión del día\*/);
  });

  it('handles a realistic LLM response end-to-end', () => {
    const input = `### 1. Estado de Rendimiento
- Nivel **intermedio**

---

### 2. Fortalezas
- Alta consistencia`;

    const out = formatMessage('daily_analysis', input);

    expect(out).toContain('*1. Estado de Rendimiento*');
    expect(out).toContain('*intermedio*');
    expect(out).toContain('*2. Fortalezas*');
    expect(out).not.toContain('###');
    expect(out).not.toContain('**');
    expect(out).not.toContain('---');
  });
});
