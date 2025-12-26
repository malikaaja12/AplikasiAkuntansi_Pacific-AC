import { state } from '../state.js';
import { utils } from '../utils.js';
import { storage } from '../storage.js';
import { pdfService } from '../services/pdf.js';

export function renderDataPiutangTab() {
    const container = document.getElementById("dataPiutang-tab");
    const today = new Date();
    const activePiutangs = state.piutangs.filter((p) => {
        const totalPaid = (p.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
        return p.jumlah - totalPaid > 0.01;
    });

    const piutangCards = activePiutangs
        .sort((a, b) => new Date(a.tanggalJatuhTempo) - new Date(b.tanggalJatuhTempo))
        .map((p) => {
            const jatuhTempo = new Date(p.tanggalJatuhTempo + "T23:59:59");
            const diffTime = jatuhTempo - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            let statusClass = "bg-green-600";
            let statusText = `Jatuh tempo dalam ${diffDays} hari`;
            if (diffDays < 0) {
                statusClass = "bg-red-600";
                statusText = `Terlambat ${Math.abs(diffDays)} hari`;
            } else if (diffDays <= 7) {
                statusClass = "bg-yellow-500";
            }
            const totalPaid = (p.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
            const remainingAmount = p.jumlah - totalPaid;

            return `
                <div class="p-4 rounded-lg text-white shadow-md ${statusClass} group relative">
                    <div class="absolute top-2 right-2 flex gap-2">
                         <button data-action="pay" data-id="${p.id}" class="text-white hover:text-blue-200 text-xs font-bold">BAYAR</button>
                         <button data-action="pdf" data-id="${p.id}" class="text-white hover:text-yellow-300 text-xs" title="Buat Invoice PDF"><i class="fas fa-file-invoice"></i></button>
                         <button data-action="delete" data-id="${p.id}" class="text-white hover:text-red-200 text-xs">Hapus</button>
                    </div>
                    <p class="font-bold text-lg">${p.namaPelanggan}</p>
                    <p class="text-sm">${p.keterangan}</p>
                    <p class="text-2xl font-bold my-1">${utils.formatCurrency(remainingAmount)}</p>
                    <p class="text-xs opacity-80">Sisa dari ${utils.formatCurrency(p.jumlah)}</p>
                    <p class="text-xs mt-2">Tgl Beli: ${p.tanggalPembelian} | Jatuh Tempo: ${p.tanggalJatuhTempo}</p>
                    <div class="absolute bottom-2 right-2 text-xs bg-black bg-opacity-20 px-2 py-1 rounded-full">${statusText}</div>
                </div>`;
        })
        .join("");

    container.innerHTML = `
        <section class="bg-white p-6 rounded-lg shadow-sm">
            <h2 class="text-xl font-semibold mb-4">Manajemen Piutang</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="md:col-span-1">
                    <form id="add-piutang-form" class="bg-gray-50 p-4 rounded-lg border space-y-4">
                        <h3 class="font-semibold text-lg">Tambah Piutang Baru</h3>
                        <div><label for="piutang-nama" class="block text-sm font-medium text-gray-700">Nama Pelanggan</label><input type="text" id="piutang-nama" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></div>
                        <div><label for="piutang-jumlah" class="block text-sm font-medium text-gray-700">Jumlah (Rp)</label><input type="number" id="piutang-jumlah" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required min="0"></div>
                        <div><label for="piutang-keterangan" class="block text-sm font-medium text-gray-700">Keterangan</label><textarea id="piutang-keterangan" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></textarea></div>
                        <div><label for="piutang-tanggal-beli" class="block text-sm font-medium text-gray-700">Tanggal Pembelian</label><input type="date" id="piutang-tanggal-beli" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></div>
                        <div><label for="piutang-jatuh-tempo" class="block text-sm font-medium text-gray-700">Tanggal Jatuh Tempo</label><input type="date" id="piutang-jatuh-tempo" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></div>
                        <button type="submit" class="w-full py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"><i class="fas fa-plus mr-2"></i>Tambah Data</button>
                    </form>
                </div>
                <div class="md:col-span-2">
                     <h3 class="font-semibold text-lg mb-4">Daftar Piutang Aktif</h3>
                     <div id="piutang-list" class="space-y-4 h-[60vh] overflow-y-auto pr-2">${piutangCards || '<div class="text-center py-8 text-gray-500">Belum ada piutang aktif.</div>'}</div>
                </div>
            </div>
        </section>`;

    document.getElementById("add-piutang-form").addEventListener("submit", (e) => {
        e.preventDefault();
        addPiutang();
    });

    // Event delegation for cards
    document.getElementById("piutang-list").addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const id = parseInt(btn.dataset.id);
        const action = btn.dataset.action;
        if (action === "pay") showPaymentModal(id);
        else if (action === "pdf") pdfService.generateInvoicePDF(id);
        else if (action === "delete") deletePiutang(id);
    });
}

function addPiutang() {
    const namaPelanggan = document.getElementById("piutang-nama").value.trim();
    const jumlah = parseFloat(document.getElementById("piutang-jumlah").value);
    const keterangan = document.getElementById("piutang-keterangan").value.trim();
    const tanggalPembelian = document.getElementById("piutang-tanggal-beli").value;
    const tanggalJatuhTempo = document.getElementById("piutang-jatuh-tempo").value;

    if (!namaPelanggan || !jumlah || !keterangan || !tanggalPembelian || !tanggalJatuhTempo) {
        utils.showModal("Peringatan", "Harap isi semua kolom piutang dengan benar.");
        return;
    }

    const piutangId = Date.now();
    const newPiutang = {
        id: piutangId,
        namaPelanggan,
        jumlah,
        keterangan,
        tanggalPembelian,
        tanggalJatuhTempo,
        noBuktiJurnal: `PIUT-${piutangId}`,
        payments: [],
    };

    state.piutangs.push(newPiutang);
    const newJurnals = [
        {
            id: Date.now() + Math.random(),
            tanggal: tanggalPembelian,
            noBukti: `PIUT-${piutangId}`,
            keterangan: `Piutang ${namaPelanggan}: ${keterangan}`,
            kelompok: "Umum",
            akun: "Piutang Usaha",
            debit: jumlah,
            kredit: 0,
        },
        {
            id: Date.now() + Math.random(),
            tanggal: tanggalPembelian,
            noBukti: `PIUT-${piutangId}`,
            keterangan: `Penjualan kepada ${namaPelanggan}`,
            kelompok: "Umum",
            akun: "Pendapatan Penjualan",
            debit: 0,
            kredit: jumlah,
        },
    ];
    state.jurnals.push(...newJurnals);
    storage.saveData();
    renderDataPiutangTab();
    document.getElementById("add-piutang-form").reset();
    utils.showModal("Sukses", "Piutang baru berhasil ditambahkan dan jurnal telah dibuat.");
}

function deletePiutang(id) {
    const piutang = state.piutangs.find((p) => p.id === id);
    if (!piutang) return;
    const totalPaid = (piutang.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
    if (totalPaid > 0) {
        utils.showModal("Peringatan", "Piutang yang sudah memiliki pembayaran tidak dapat dihapus. Buat jurnal pembalik secara manual jika diperlukan.");
        return;
    }
    utils.showModal(
        "Konfirmasi Hapus Piutang",
        `Apakah Anda yakin ingin menghapus piutang untuk <strong>${piutang.namaPelanggan}</strong> senilai <strong>${utils.formatCurrency(piutang.jumlah)}</strong>? Ini juga akan membuat jurnal pembalik.`,
        [
            {
                text: "Ya, Hapus",
                class: "bg-red-600 hover:bg-red-700",
                callback: () => {
                    state.piutangs = state.piutangs.filter((p) => p.id !== id);
                    const reversingJurnals = [
                        {
                            id: Date.now() + Math.random(),
                            tanggal: new Date().toISOString().slice(0, 10),
                            noBukti: `REV-${piutang.noBuktiJurnal}`,
                            keterangan: `Pembatalan Piutang ${piutang.namaPelanggan}`,
                            kelompok: "Umum",
                            akun: "Pendapatan Penjualan",
                            debit: piutang.jumlah,
                            kredit: 0,
                        },
                        {
                            id: Date.now() + Math.random(),
                            tanggal: new Date().toISOString().slice(0, 10),
                            noBukti: `REV-${piutang.noBuktiJurnal}`,
                            keterangan: `Pembatalan Piutang ${piutang.namaPelanggan}`,
                            kelompok: "Umum",
                            akun: "Piutang Usaha",
                            debit: 0,
                            kredit: piutang.jumlah,
                        },
                    ];
                    state.jurnals.push(...reversingJurnals);
                    storage.saveData();
                    renderDataPiutangTab();
                    utils.closeModal();
                },
            },
            {
                text: "Batal",
                class: "bg-gray-600 hover:bg-gray-700",
                callback: () => utils.closeModal(),
            },
        ]
    );
}

function showPaymentModal(piutangId) {
    const piutang = state.piutangs.find((p) => p.id === piutangId);
    if (!piutang) return;
    const totalPaid = (piutang.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = piutang.jumlah - totalPaid;
    const body = `
        <p class="mb-2">Mencatat pembayaran untuk <strong>${piutang.namaPelanggan}</strong></p>
        <p class="text-sm text-gray-600 mb-4">Sisa piutang: <strong>${utils.formatCurrency(remainingAmount)}</strong></p>
        <form id="payment-form" class="space-y-4">
                <div><label for="payment-amount" class="block text-sm font-medium text-gray-700">Nominal Pembayaran (Rp)</label><input type="number" id="payment-amount" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required min="0" max="${remainingAmount}" value="${remainingAmount}"></div>
                <div><label for="payment-date" class="block text-sm font-medium text-gray-700">Tanggal Pembayaran</label><input type="date" id="payment-date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required value="${new Date().toISOString().slice(0, 10)}"></div>
                <div><label for="payment-desc" class="block text-sm font-medium text-gray-700">Deskripsi</label><input type="text" id="payment-desc" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Contoh: Pembayaran via transfer Bank" required></div>
        </form>`;
    utils.showModal("Input Pembayaran Piutang", body, [
        {
            text: "Simpan Pembayaran",
            class: "bg-blue-600 hover:bg-blue-700",
            callback: () => addPayment(piutangId),
        },
        {
            text: "Batal",
            class: "bg-gray-600 hover:bg-gray-700",
            callback: () => utils.closeModal(),
        },
    ]);
}

function addPayment(piutangId) {
    const amount = parseFloat(document.getElementById("payment-amount").value);
    const date = document.getElementById("payment-date").value;
    const description = document.getElementById("payment-desc").value.trim();
    const piutang = state.piutangs.find((p) => p.id === piutangId);
    if (!piutang) return;

    const totalPaid = (piutang.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = piutang.jumlah - totalPaid;

    if (!amount || !date || !description || amount <= 0 || amount > remainingAmount + 0.01) {
        utils.showModal("Peringatan", "Data pembayaran tidak valid. Pastikan nominal tidak melebihi sisa piutang.");
        return;
    }

    piutang.payments.push({ amount, date, description });
    const paymentJurnals = [
        {
            id: Date.now() + Math.random(),
            tanggal: date,
            noBukti: `PEL-${piutang.id}-${Date.now()}`,
            keterangan: `Pelunasan piutang dari ${piutang.namaPelanggan}`,
            kelompok: "Umum",
            akun: "Kas",
            debit: amount,
            kredit: 0,
        },
        {
            id: Date.now() + Math.random(),
            tanggal: date,
            noBukti: `PEL-${piutang.id}-${Date.now()}`,
            keterangan: description,
            kelompok: "Umum",
            akun: "Piutang Usaha",
            debit: 0,
            kredit: amount,
        },
    ];
    state.jurnals.push(...paymentJurnals);
    storage.saveData();
    renderDataPiutangTab();
    utils.closeModal();
    utils.showModal("Sukses", `Pembayaran sebesar ${utils.formatCurrency(amount)} berhasil dicatat.`);
}
