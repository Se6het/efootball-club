const DEFAULT_RULES = Object.freeze({
  yellowLimit: 3,
  yellowBanMatches: 1,
  redBanMatches: 1,
});

function playerKey(team, name) {
  return `${team}::${String(name ?? '').trim()}`;
}

function positiveInteger(value) {
  const count = Number(value ?? 0);
  return Number.isInteger(count) && count > 0 ? count : 0;
}

function entriesFor(match, side) {
  const entries = match?.[`${side}PlayerCards`];
  return Array.isArray(entries) ? entries : [];
}

export function normalizeDisciplineRules(rules = {}) {
  const result = {};
  for (const key of Object.keys(DEFAULT_RULES)) {
    const value = Number(rules[key] ?? DEFAULT_RULES[key]);
    result[key] = Number.isInteger(value) && value > 0 ? value : DEFAULT_RULES[key];
  }
  return result;
}

function serveSuspensions(records, teams) {
  for (const [key, record] of records) {
    if (teams.has(record.team) && record.pendingSuspension > 0) {
      records.set(key, {
        ...record,
        pendingSuspension: record.pendingSuspension - 1,
        servedSuspensions: record.servedSuspensions + 1,
      });
    }
  }
}

function applyCards(records, match, rules) {
  for (const side of ['home', 'away']) {
    const team = match?.[`${side}Team`];
    for (const card of entriesFor(match, side)) {
      const name = String(card?.name ?? '').trim();
      if (!team || !name) continue;
      const key = playerKey(team, name);
      const current = records.get(key) ?? {
        name,
        team,
        yellowCards: 0,
        redCards: 0,
        pendingSuspension: 0,
        servedSuspensions: 0,
      };
      const yellow = positiveInteger(card?.yellow);
      const red = positiveInteger(card?.red);
      const nextYellow = current.yellowCards + yellow;
      const yellowBans = Math.floor(nextYellow / rules.yellowLimit) - Math.floor(current.yellowCards / rules.yellowLimit);
      records.set(key, {
        ...current,
        yellowCards: nextYellow,
        redCards: current.redCards + red,
        pendingSuspension: current.pendingSuspension + yellowBans * rules.yellowBanMatches + red * rules.redBanMatches,
      });
    }
  }
}

function replayUntil(matches, targetNumber, rules) {
  const records = new Map();
  const ordered = [...(Array.isArray(matches) ? matches : [])].sort(
    (left, right) => Number(left?.matchNumber ?? 0) - Number(right?.matchNumber ?? 0)
  );

  for (const match of ordered) {
    if (Number(match?.matchNumber ?? 0) >= targetNumber) break;
    if (match?.isPlayed) {
      const teams = new Set([match?.homeTeam, match?.awayTeam].filter(Boolean));
      serveSuspensions(records, teams);
      applyCards(records, match, rules);
    }
  }
  return records;
}

export function getSuspensionsBeforeMatch(matches, targetMatch, customRules = {}) {
  const rules = normalizeDisciplineRules(customRules);
  const records = replayUntil(matches, Number(targetMatch?.matchNumber ?? Infinity), rules);
  const teams = new Set([targetMatch?.homeTeam, targetMatch?.awayTeam].filter(Boolean));
  return [...records.values()]
    .filter((record) => teams.has(record.team) && record.pendingSuspension > 0)
    .sort((left, right) => left.team.localeCompare(right.team, 'zh-Hans-CN') || left.name.localeCompare(right.name, 'zh-Hans-CN'));
}

export function computeDisciplineStats(matches, customRules = {}) {
  const rules = normalizeDisciplineRules(customRules);
  const records = replayUntil(matches, Infinity, rules);
  return [...records.values()];
}

export function cardTotals(entries = []) {
  return (Array.isArray(entries) ? entries : []).reduce(
    (totals, entry) => ({
      yellow: totals.yellow + positiveInteger(entry?.yellow),
      red: totals.red + positiveInteger(entry?.red),
    }),
    { yellow: 0, red: 0 }
  );
}

export { DEFAULT_RULES };
