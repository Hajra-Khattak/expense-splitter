
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