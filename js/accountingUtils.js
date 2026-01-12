import { state } from "./state.js";

/**
 * Accounting Utilities
 * Helper functions untuk standar akuntansi
 */

export const accountingUtils = {
  /**
   * Generate nomor referensi jurnal dengan format: JU-XXX/MM/YYYY
   * @param {string} type - Tipe jurnal: 'JU' (Umum), 'JP' (Penyesuaian), 'JT' (Penutup)
   * @param {string} period - Format YYYY-MM
   * @returns {string} Nomor referensi
   */
  generateJournalNumber(type = "JU", period = state.currentMonth) {
    const key = `${type}-${period}`;

    // Initialize counter if not exists
    if (!state.settings.journalCounter) {
      state.settings.journalCounter = {};
    }

    if (!state.settings.journalCounter[key]) {
      state.settings.journalCounter[key] = 0;
    }

    // Increment counter
    state.settings.journalCounter[key]++;
    const number = state.settings.journalCounter[key];

    // Format: JU-001/01/2026
    const [year, month] = period.split("-");
    const paddedNumber = String(number).padStart(3, "0");

    return `${type}-${paddedNumber}/${month}/${year}`;
  },

  /**
   * Generate kode akun otomatis berdasarkan tipe
   * @param {string} type - Tipe akun (Aset, Liabilitas, Ekuitas, Pendapatan, Beban)
   * @returns {string} Kode akun
   */
  generateAccountCode(type) {
    const prefixes = {
      Aset: "1",
      Liabilitas: "2",
      Ekuitas: "3",
      Pendapatan: "4",
      Beban: "5",
    };

    const prefix = prefixes[type] || "9";

    // Find highest number for this type
    const existingCodes = state.settings.akuns
      .filter((a) => a.code && a.code.startsWith(prefix))
      .map((a) => parseInt(a.code.split("-")[1] || "0"))
      .filter((n) => !isNaN(n));

    const nextNumber =
      existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;

    // Format: 1-01-01 (Type-Group-Sequence)
    return `${prefix}-01-${String(nextNumber).padStart(2, "0")}`;
  },

  /**
   * Get normal balance untuk tipe akun
   * @param {string} type - Tipe akun
   * @returns {string} 'debit' atau 'kredit'
   */
  getNormalBalance(type) {
    const normalBalances = {
      Aset: "debit",
      Beban: "debit",
      Liabilitas: "kredit",
      Ekuitas: "kredit",
      Pendapatan: "kredit",
    };

    return normalBalances[type] || "debit";
  },

  /**
   * Calculate account balance dengan opening balance
   * @param {string} accountCode - Kode akun
   * @param {string} period - Periode (YYYY-MM)
   * @param {array} journals - Array of journal entries
   * @returns {number} Saldo akun
   */
  calculateAccountBalance(
    accountCode,
    period = state.currentMonth,
    journals = state.jurnals
  ) {
    const account = state.settings.akuns.find((a) => a.code === accountCode);
    if (!account) return 0;

    // Get opening balance
    let balance = 0;
    const openingBalance = state.settings.openingBalances?.[accountCode];
    if (openingBalance && openingBalance.period === period) {
      balance = openingBalance.amount;
    }

    // Add transactions
    const accountJournals = journals.filter((j) => {
      const jAccount = state.settings.akuns.find((a) => a.name === j.akun);
      return jAccount && jAccount.code === accountCode;
    });

    const normalBalance =
      account.normalBalance || this.getNormalBalance(account.type);

    accountJournals.forEach((j) => {
      if (normalBalance === "debit") {
        balance += j.debit - j.kredit;
      } else {
        balance += j.kredit - j.debit;
      }
    });

    return balance;
  },

  /**
   * Validate if trial balance is balanced
   * @returns {object} {isBalanced, totalDebit, totalKredit, difference}
   */
  validateTrialBalance() {
    let totalDebit = 0;
    let totalKredit = 0;

    state.jurnals.forEach((j) => {
      totalDebit += j.debit;
      totalKredit += j.kredit;
    });

    // Add opening balances
    Object.entries(state.settings.openingBalances || {}).forEach(
      ([code, data]) => {
        const account = state.settings.akuns.find((a) => a.code === code);
        if (account && data.period === state.currentMonth) {
          const normalBalance =
            account.normalBalance || this.getNormalBalance(account.type);
          if (normalBalance === "debit") {
            totalDebit += data.amount;
          } else {
            totalKredit += data.amount;
          }
        }
      }
    );

    const difference = Math.abs(totalDebit - totalKredit);
    const isBalanced = difference < 0.01; // Allow for rounding errors

    return {
      isBalanced,
      totalDebit,
      totalKredit,
      difference,
    };
  },

  /**
   * Get fiscal year from period
   * @param {string} period - Format YYYY-MM
   * @returns {number} Year
   */
  getFiscalYear(period = state.currentMonth) {
    return parseInt(period.split("-")[0]);
  },

  /**
   * Check if period is closed
   * @param {string} period - Format YYYY-MM
   * @returns {boolean}
   */
  isPeriodClosed(period) {
    // TODO: Implement period closing logic
    return false;
  },

  /**
   * Format account code for display
   * @param {string} code - Account code
   * @returns {string} Formatted code
   */
  formatAccountCode(code) {
    if (!code) return "";
    return code.replace(/-/g, ".");
  },
};
