const state = {
  activeTab: "jurnal",
  currentMonth: new Date().toISOString().slice(0, 7), // YYYY-MM format
  fiscalYear: new Date().getFullYear(), // Tahun buku berjalan
  jurnals: [],
  settings: {
    akuns: [], // Will have: {code, name, type, normalBalance}
    kelompoks: [],
    openingBalances: {}, // {accountCode: {amount, period}}
    journalCounter: {} // {period: lastNumber} for sequential numbering
  },
  stock: { items: [], transactions: [] },
  piutangs: [],
};
export { state };
