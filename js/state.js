export const state = {
    activeTab: "jurnal",
    currentMonth: new Date().toISOString().slice(0, 7), // YYYY-MM format
    jurnals: [],
    settings: { akuns: [], kelompoks: [] },
    stock: { items: [], transactions: [] },
    piutangs: [],
};
