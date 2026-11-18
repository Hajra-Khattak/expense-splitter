// The same two uids always give the same id, so a pair can only ever have one friendship doc.
export function pairId(a, b) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}