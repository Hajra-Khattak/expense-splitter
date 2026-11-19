// Net balance of one member, in minor units.
//   positive = the group owes this member money
//   negative = this member owes the group money
//   0        = settled
//
// expense:    { paidBy, amountMinor, splits: { uid: shareMinor } }
// settlement: { from, to, amountMinor }          (from paid to)
//
// If your tested utils/balances.js already computes this, call it from here instead.
export function getMemberBalance(uid, expenses, settlements) {
  let net = 0;

  for (const e of expenses) {
    if (e.paidBy === uid) net += e.amountMinor;
    net -= e.splits?.[uid] ?? 0;
  }

  for (const s of settlements) {
    if (s.from === uid) net += s.amountMinor;
    if (s.to === uid) net -= s.amountMinor;
  }

  return net;
}