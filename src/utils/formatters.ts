export function safeFormatTime(dateStr?: string): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export function safeFormatDate(dateStr?: string): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function safeFormatDateTime(dateStr?: string): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateStr;
  }
}

/** Date + heure lisibles pour une validation ; les anciennes valeurs "HH:MM" sont affichées telles quelles. */
export function formatCompletedAt(value?: string): string {
  if (!value) return '--';
  if (/^\d{1,2}:\d{2}$/.test(value)) return value;
  return safeFormatDateTime(value);
}

/** Une machine validée doit-elle repasser "à faire" (nouveau jour / semaine / mois) ? */
export function isCleaningDueAgain(task: { completedAt?: string; frequency: string }, now: Date = new Date()): boolean {
  if (!task.completedAt) return true;
  const done = new Date(task.completedAt);
  if (isNaN(done.getTime())) return true; // ancien format sans date
  if (task.frequency === 'Mensuel') {
    return done.getFullYear() !== now.getFullYear() || done.getMonth() !== now.getMonth();
  }
  if (task.frequency === 'Hebdomadaire') {
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7)); // lundi
    return done < startOfWeek;
  }
  return done.toDateString() !== now.toDateString();
}
