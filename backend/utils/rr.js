function computeRr(direction, entry, stopLoss, target) {
  if (
    !direction ||
    typeof entry !== 'number' ||
    typeof stopLoss !== 'number' ||
    typeof target !== 'number'
  ) {
    return undefined;
  }

  const risk = direction === 'Sell' ? stopLoss - entry : entry - stopLoss;
  if (!(risk > 0)) return 0;

  const reward = direction === 'Sell' ? entry - target : target - entry;
  return Math.round((Math.max(reward, 0) / risk) * 10000) / 10000;
}

module.exports = { computeRr };
