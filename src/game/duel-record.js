// Player slots are shared by every local match. Practice is tracked separately.
const key = 'battle-net-duel-record-v1';
const fields = ['p1','p2','draws','practiceWins','practiceLosses','practiceDraws'];

export function duelRecord() {
  let stored;
  try { stored = JSON.parse(localStorage.getItem(key)); } catch {}
  return Object.fromEntries(fields.map(field => [
    field, Number.isSafeInteger(stored?.[field]) && stored[field] >= 0 ? stored[field] : 0
  ]));
}

export function recordDuel(winner, practice) {
  const record = duelRecord();
  const field = practice
    ? (winner === null ? 'practiceDraws' : winner === 0 ? 'practiceWins' : 'practiceLosses')
    : (winner === null ? 'draws' : winner === 0 ? 'p1' : 'p2');
  record[field]++;
  try { localStorage.setItem(key,JSON.stringify(record)); } catch {}
  return record;
}
