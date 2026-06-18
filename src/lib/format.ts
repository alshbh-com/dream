export const fmtEGP = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(v);
};

export const fmtNum = (n: number | string | null | undefined) => {
  return new Intl.NumberFormat("ar-EG").format(Number(n ?? 0));
};

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date(d));
};

export const fmtDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
};

export const providerLabel = (p: string) => ({
  vodafone_cash: "فودافون كاش",
  etisalat_cash: "اتصالات كاش",
  orange_cash: "أورانج كاش",
  we_pay: "وي باي",
}[p] ?? p);

export const txTypeLabel = (t: string) => ({
  withdrawal: "سحب",
  transfer: "تحويل",
  deposit: "إيداع",
  pos_payment: "دفع POS",
  adjustment: "تسوية",
}[t] ?? t);

export const roleLabel = (r: string) => ({
  owner: "مالك",
  admin: "أدمن",
  supervisor: "مسؤول",
  cashier: "كاشير",
  accountant: "محاسب",
  agent: "مندوب",
  branch_manager: "مدير فرع",
}[r] ?? r);

export const gatewayLabel = (g: string) => ({
  dashboard: "الرئيسية",
  pos: "نقاط البيع",
  wallets: "المحافظ",
  treasury: "الخزينة",
  inventory: "المخزون",
  customers: "العملاء",
  installments: "الأقساط",
  agents: "المندوبون",
  expenses: "المصروفات",
  users: "المستخدمون",
}[g] ?? g);

export const ALL_GATEWAYS = [
  "dashboard","pos","wallets","treasury","inventory",
  "customers","installments","agents","expenses","users",
] as const;

export const ALL_ROLES = [
  "owner","admin","supervisor","cashier","accountant","agent","branch_manager",
] as const;
