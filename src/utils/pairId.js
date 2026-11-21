export function pairId(a, b) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}