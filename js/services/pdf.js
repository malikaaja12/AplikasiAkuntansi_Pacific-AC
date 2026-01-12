import { state } from '../state.js';
import { utils } from '../utils.js';
import { calculateFinancials } from '../modules/labaRugi.js';

export const pdfService = {
    async generatePDF() {
        utils.showModal(
            "Info",
            '<div class="text-center"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i><p class="mt-2">Mempersiapkan PDF canggih Anda...</p></div>'
        );
        await new Promise((resolve) => setTimeout(resolve, 100));

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const { jurnals } = state;
        const {
            pendapatanDetails,
            bebanDetails,
            totalPendapatan,
            totalBeban,
            labaBersih,
        } = calculateFinancials();

        const monthlyData = jurnals.reduce((acc, j) => {
            const month = j.tanggal.substring(0, 7);
            if (!acc[month]) {
                acc[month] = { pendapatan: 0, beban: 0 };
            }
            if (state.settings.akuns.find((a) => a.name === j.akun && a.type === "Pendapatan")) {
                acc[month].pendapatan += j.kredit - j.debit;
            }
            if (state.settings.akuns.find((a) => a.name === j.akun && a.type === "Beban")) {
                acc[month].beban += j.debit - j.kredit;
            }
            return acc;
        }, {});

        const sortedMonths = Object.keys(monthlyData).sort();
        const chartLabels = sortedMonths.map((m) =>
            new Date(m + "-02").toLocaleString("id-ID", { month: "short", year: "2-digit" })
        );
        const chartData = sortedMonths.map(
            (m) => monthlyData[m].pendapatan - monthlyData[m].beban
        );

        let lineChartImage = null;
        if (chartData.length > 0) {
            const ctx = document.getElementById("pdf-chart").getContext("2d");
            const pdfChart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: chartLabels,
                    datasets: [
                        {
                            label: "Laba (Rugi) Bersih",
                            data: chartData,
                            borderColor: "#3b82f6",
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            fill: true,
                            tension: 0.1,
                        },
                    ],
                },
                options: {
                    animation: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { ticks: { callback: (value) => utils.formatCurrency(value) } },
                    },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 50));
            lineChartImage = pdfChart.toBase64Image();
            pdfChart.destroy();
        }

        let pieChartImage = null;
        const filteredBeban = Object.entries(bebanDetails).filter(([, val]) => val > 0);
        const pieChartColors = [
            "#3b82f6", "#ef4444", "#f97316", "#84cc16", "#14b8a6", "#a855f7", "#ec4899",
        ];
        if (filteredBeban.length > 0) {
            const pieCtx = document.getElementById("pdf-pie-chart").getContext("2d");
            const pdfPieChart = new Chart(pieCtx, {
                type: "pie",
                data: {
                    labels: filteredBeban.map(([key]) => key),
                    datasets: [
                        {
                            data: filteredBeban.map(([, val]) => val),
                            backgroundColor: pieChartColors,
                            borderColor: "#ffffff",
                            borderWidth: 2,
                        },
                    ],
                },
                options: {
                    animation: false,
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 50));
            pieChartImage = pdfPieChart.toBase64Image();
            pdfPieChart.destroy();
        }

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Laporan Keuangan Komprehensif", 105, 22, { align: "center" });
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Periode: ${utils.formatMonth(state.currentMonth)}`, 105, 30, { align: "center" });

        let lastY = 40;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Ringkasan Laba Rugi", 14, lastY);

        const labaRugiBody = [
            ["Total Pendapatan", utils.formatCurrency(totalPendapatan)],
            ["Total Beban", utils.formatCurrency(totalBeban)],
            [
                { content: "Laba (Rugi) Bersih", styles: { fontStyle: "bold" } },
                { content: utils.formatCurrency(labaBersih), styles: { fontStyle: "bold" } },
            ],
        ];

        doc.autoTable({
            startY: lastY + 5,
            body: labaRugiBody,
            theme: "plain",
            styles: { fontSize: 10 },
            columnStyles: { 1: { halign: "right" } },
        });

        lastY = doc.autoTable.previous.finalY + 15;

        if (lineChartImage) {
            if (lastY + 105 > 280) {
                doc.addPage();
                lastY = 22;
            }
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Diagram Tren Laba (Rugi) Bersih Bulanan", 14, lastY);
            doc.addImage(lineChartImage, "PNG", 14, lastY + 5, 180, 90);
            lastY += 105;
        }

        if (pieChartImage) {
            if (lastY + 115 > 280) {
                doc.addPage();
                lastY = 22;
            }
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Visualisasi Komposisi Beban", 14, lastY);
            lastY += 5;
            doc.addImage(pieChartImage, "PNG", 14, lastY, 100, 100);
            let legendY = lastY + 105;
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            filteredBeban.forEach(([key], index) => {
                if (legendY > 280) {
                    doc.addPage();
                    legendY = 22;
                }
                const color = pieChartColors[index % pieChartColors.length];
                doc.setFillColor(color);
                doc.rect(14, legendY, 3, 3, "F");
                doc.text(`${key}`, 20, legendY + 2.5);
                legendY += 6;
            });
            lastY = legendY + 5;
            if (lastY > 250) {
                doc.addPage();
                lastY = 22;
            }
            const bebanBody = filteredBeban.map(([key, value]) => [key, utils.formatCurrency(value)]);
            bebanBody.push([
                { content: "Total Beban", styles: { fontStyle: "bold" } },
                { content: utils.formatCurrency(totalBeban), styles: { fontStyle: "bold" } },
            ]);
            doc.autoTable({
                startY: lastY,
                head: [["Rincian Kategori Beban", "Jumlah"]],
                body: bebanBody,
                theme: "striped",
                headStyles: { fillColor: "#374151" },
            });
            lastY = doc.autoTable.previous.finalY + 15;
        }

        doc.addPage();
        let journalY = 22;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Rincian Jurnal Umum", 14, journalY);
        const journalBody = [];
        const groupedJurnals = jurnals.reduce((acc, j) => {
            (acc[j.noBukti] = acc[j.noBukti] || []).push(j);
            return acc;
        }, {});

        Object.values(groupedJurnals)
            .sort((a, b) => new Date(b[0].tanggal) - new Date(a[0].tanggal))
            .forEach((entries) => {
                const firstEntry = entries[0];
                journalBody.push([
                    {
                        content: `Tanggal: ${firstEntry.tanggal} | No: ${firstEntry.noBukti} | Kelompok: ${firstEntry.kelompok || "Lainnya"}`,
                        colSpan: 3,
                        styles: { fontStyle: "bold", fillColor: "#e8f0fe", textColor: "#1e3a8a" },
                    },
                ]);
                entries.forEach((entry) => {
                    if (entry.debit > 0 || entry.kredit > 0) {
                        let akunCell = entry.kredit > 0
                            ? `    ${entry.akun}\n    (${entry.keterangan})`
                            : `${entry.akun}\n(${entry.keterangan})`;
                        journalBody.push([
                            akunCell,
                            entry.debit ? utils.formatCurrency(entry.debit) : "",
                            entry.kredit ? utils.formatCurrency(entry.kredit) : "",
                        ]);
                    }
                });
            });

        doc.autoTable({
            startY: journalY + 5,
            head: [["Akun & Keterangan", "Debit", "Kredit"]],
            body: journalBody,
            theme: "grid",
            headStyles: { fillColor: "#1e40af", textColor: "#ffffff", fontStyle: "bold" },
            columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
            didDrawCell: (data) => {
                if (data.cell && data.cell.raw && data.cell.raw.colSpan === 3) {
                    doc.setFontSize(9);
                    doc.setTextColor(100);
                }
            },
        });

        doc.save(`Laporan_Keuangan_${state.currentMonth}.pdf`);
        utils.closeModal();
    },

    async generateInvoicePDF(piutangId) {
        const piutang = state.piutangs.find((p) => p.id === piutangId);
        if (!piutang) {
            utils.showModal("Error", "Data piutang tidak ditemukan.");
            return;
        }

        utils.showModal(
            "Info",
            '<div class="text-center"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i><p class="mt-2">Membuat Invoice PDF...</p></div>'
        );
        await new Promise((resolve) => setTimeout(resolve, 50));

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const totalPaid = (piutang.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const remainingAmount = piutang.jumlah - totalPaid;

        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("INVOICE", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("DARI:", 14, 40);
        doc.setFont("helvetica", "normal");
        doc.text("Perusahaan Anda", 14, 46);
        doc.text("Jalan Contoh No. 123", 14, 51);
        doc.text("Kota, 12345", 14, 56);

        doc.setFont("helvetica", "bold");
        doc.text("KEPADA:", 130, 40);
        doc.setFont("helvetica", "normal");
        doc.text(piutang.namaPelanggan, 130, 46);

        doc.setFont("helvetica", "bold");
        doc.text("Invoice #:", 130, 60);
        doc.setFont("helvetica", "normal");
        doc.text(`INV-${piutang.id}`, 160, 60);

        doc.setFont("helvetica", "bold");
        doc.text("Tanggal Terbit:", 130, 65);
        doc.setFont("helvetica", "normal");
        doc.text(piutang.tanggalPembelian, 160, 65);

        doc.setFont("helvetica", "bold");
        doc.text("Jatuh Tempo:", 130, 70);
        doc.setFont("helvetica", "normal");
        doc.text(piutang.tanggalJatuhTempo, 160, 70);

        let lastY = 85;

        doc.autoTable({
            startY: lastY,
            head: [["Deskripsi", "Kuantitas", "Harga Satuan", "Total"]],
            body: [
                [piutang.keterangan, 1, utils.formatCurrency(piutang.jumlah), utils.formatCurrency(piutang.jumlah)],
            ],
            theme: "striped",
            headStyles: { fillColor: "#374151" },
            columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" } },
        });
        lastY = doc.autoTable.previous.finalY;

        const totalX = 150;
        const totalYStart = lastY + 10;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");

        doc.text("Subtotal:", totalX, totalYStart, { align: "right" });
        doc.text(utils.formatCurrency(piutang.jumlah), 200, totalYStart, { align: "right" });

        doc.text("Total Pembayaran:", totalX, totalYStart + 7, { align: "right" });
        doc.text(`(${utils.formatCurrency(totalPaid)})`, 200, totalYStart + 7, { align: "right" });

        doc.setFont("helvetica", "bold");
        doc.text("SISA TAGIHAN:", totalX, totalYStart + 14, { align: "right" });
        doc.text(utils.formatCurrency(remainingAmount), 200, totalYStart + 14, { align: "right" });

        lastY = totalYStart + 25;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Catatan:", 14, lastY);
        doc.text("Mohon lakukan pembayaran sebelum tanggal jatuh tempo.", 14, lastY + 5);
        doc.text("Terima kasih atas bisnis Anda.", 105, lastY + 20, { align: "center" });

        doc.save(`Invoice_${piutang.namaPelanggan.replace(/\s+/g, "_")}_${piutang.id}.pdf`);
        utils.closeModal();
    },

    async generateComprehensiveFinancialPDF() {
        utils.showModal(
            "Info",
            '<div class="text-center"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i><p class="mt-2">Mempersiapkan Laporan Keuangan Komprehensif...</p></div>'
        );
        await new Promise((resolve) => setTimeout(resolve, 100));

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const { jurnals } = state;
        const {
            pendapatanDetails,
            bebanDetails,
            totalPendapatan,
            totalBeban,
            labaBersih,
        } = calculateFinancials();

        // ========== HALAMAN 1: CHART LABA RUGI BULANAN ==========
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Laporan Keuangan Komprehensif", 105, 15, { align: "center" });
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Periode: ${utils.formatMonth(state.currentMonth)}`, 105, 22, { align: "center" });

        // Prepare monthly data for line chart
        const monthlyData = jurnals.reduce((acc, j) => {
            const month = j.tanggal.substring(0, 7);
            if (!acc[month]) {
                acc[month] = { pendapatan: 0, beban: 0 };
            }
            if (state.settings.akuns.find((a) => a.name === j.akun && a.type === "Pendapatan")) {
                acc[month].pendapatan += j.kredit - j.debit;
            }
            if (state.settings.akuns.find((a) => a.name === j.akun && a.type === "Beban")) {
                acc[month].beban += j.debit - j.kredit;
            }
            return acc;
        }, {});

        const sortedMonths = Object.keys(monthlyData).sort();
        const chartLabels = sortedMonths.map((m) =>
            new Date(m + "-02").toLocaleString("id-ID", { month: "short", year: "2-digit" })
        );
        const chartData = sortedMonths.map(
            (m) => monthlyData[m].pendapatan - monthlyData[m].beban
        );

        let lineChartImage = null;
        if (chartData.length > 0) {
            const ctx = document.getElementById("pdf-chart").getContext("2d");
            const pdfChart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: chartLabels,
                    datasets: [
                        {
                            label: "Laba (Rugi) Bersih",
                            data: chartData,
                            borderColor: "#3b82f6",
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            fill: true,
                            tension: 0.1,
                        },
                    ],
                },
                options: {
                    animation: false,
                    plugins: { legend: { display: true, position: 'top' } },
                    scales: {
                        y: { ticks: { callback: (value) => utils.formatCurrency(value) } },
                    },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 50));
            lineChartImage = pdfChart.toBase64Image();
            pdfChart.destroy();
        }

        let lastY = 30;
        if (lineChartImage) {
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("1. Tren Laba (Rugi) Bersih Bulanan", 14, lastY);
            doc.addImage(lineChartImage, "PNG", 14, lastY + 5, 180, 90);
            lastY += 100;
        }

        // Add monthly data table
        if (sortedMonths.length > 0) {
            const monthlyTableBody = sortedMonths.map((m, idx) => [
                chartLabels[idx],
                utils.formatCurrency(monthlyData[m].pendapatan),
                utils.formatCurrency(monthlyData[m].beban),
                utils.formatCurrency(monthlyData[m].pendapatan - monthlyData[m].beban)
            ]);

            doc.autoTable({
                startY: lastY,
                head: [["Bulan", "Pendapatan", "Beban", "Laba Bersih"]],
                body: monthlyTableBody,
                theme: "striped",
                headStyles: { fillColor: "#1e40af", textColor: "#ffffff" },
                columnStyles: {
                    1: { halign: "right" },
                    2: { halign: "right" },
                    3: { halign: "right" }
                },
            });
        }

        // ========== HALAMAN 2: RINGKASAN LABA RUGI ==========
        doc.addPage();
        lastY = 20;

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("2. Ringkasan Laba Rugi", 14, lastY);
        lastY += 10;

        // Pendapatan Section
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Pendapatan", 14, lastY);
        lastY += 5;

        const pendapatanBody = Object.entries(pendapatanDetails)
            .filter(([, val]) => val > 0)
            .map(([key, value]) => [key, utils.formatCurrency(value)]);

        if (pendapatanBody.length > 0) {
            pendapatanBody.push([
                { content: "Total Pendapatan", styles: { fontStyle: "bold", fillColor: "#dbeafe" } },
                { content: utils.formatCurrency(totalPendapatan), styles: { fontStyle: "bold", fillColor: "#dbeafe" } },
            ]);

            doc.autoTable({
                startY: lastY,
                body: pendapatanBody,
                theme: "plain",
                styles: { fontSize: 10 },
                columnStyles: { 1: { halign: "right" } },
            });
            lastY = doc.autoTable.previous.finalY + 10;
        }

        // Beban Section
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Beban", 14, lastY);
        lastY += 5;

        const bebanBody = Object.entries(bebanDetails)
            .filter(([, val]) => val > 0)
            .map(([key, value]) => [key, utils.formatCurrency(value)]);

        if (bebanBody.length > 0) {
            bebanBody.push([
                { content: "Total Beban", styles: { fontStyle: "bold", fillColor: "#fee2e2" } },
                { content: utils.formatCurrency(totalBeban), styles: { fontStyle: "bold", fillColor: "#fee2e2" } },
            ]);

            doc.autoTable({
                startY: lastY,
                body: bebanBody,
                theme: "plain",
                styles: { fontSize: 10 },
                columnStyles: { 1: { halign: "right" } },
            });
            lastY = doc.autoTable.previous.finalY + 10;
        }

        // Laba Bersih Summary
        const labaBersihColor = labaBersih >= 0 ? "#dcfce7" : "#fee2e2";
        doc.autoTable({
            startY: lastY,
            body: [
                [
                    { content: "Laba (Rugi) Bersih", styles: { fontStyle: "bold", fontSize: 12, fillColor: labaBersihColor } },
                    { content: utils.formatCurrency(labaBersih), styles: { fontStyle: "bold", fontSize: 12, fillColor: labaBersihColor } },
                ],
            ],
            theme: "plain",
            columnStyles: { 1: { halign: "right" } },
        });

        // ========== HALAMAN 3: CHART ARUS KAS ==========
        doc.addPage();
        lastY = 20;

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("3. Laporan Arus Kas", 14, lastY);
        lastY += 10;

        // Calculate cash flow data
        const grouped = jurnals.reduce((acc, curr) => {
            if (!acc[curr.noBukti]) acc[curr.noBukti] = [];
            acc[curr.noBukti].push(curr);
            return acc;
        }, {});

        const cashAccounts = ["Kas", "Bank", "Kas Kecil"];
        const activities = { operasi: [], investasi: [], pendanaan: [] };

        let totalOperasi = 0;
        let totalInvestasi = 0;
        let totalPendanaan = 0;

        Object.values(grouped).forEach((group) => {
            let cashChange = 0;
            group.forEach((entry) => {
                if (cashAccounts.includes(entry.akun)) {
                    cashChange += entry.debit - entry.kredit;
                }
            });

            if (Math.abs(cashChange) < 0.01) return;

            const contraEntries = group.filter((entry) => !cashAccounts.includes(entry.akun));

            if (contraEntries.length > 0) {
                const contra = contraEntries[0];
                const akunName = contra.akun;
                const description = contra.keterangan || "Transaksi Kas";
                let category = "operasi";

                if (/peralatan|kendaraan|gedung|tanah|mesin|investasi/i.test(akunName)) {
                    category = "investasi";
                } else if (/modal|prive|bank|pinjaman|deviden/i.test(akunName)) {
                    if (akunName.includes("Beban") || akunName.includes("Biaya")) {
                        category = "operasi";
                    } else {
                        category = "pendanaan";
                    }
                }

                const item = { keterangan: `${description} (${akunName})`, jumlah: cashChange };

                if (category === "operasi") {
                    activities.operasi.push(item);
                    totalOperasi += cashChange;
                } else if (category === "investasi") {
                    activities.investasi.push(item);
                    totalInvestasi += cashChange;
                } else {
                    activities.pendanaan.push(item);
                    totalPendanaan += cashChange;
                }
            }
        });

        // Aktivitas Operasi
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Arus Kas dari Aktivitas Operasi", 14, lastY);
        lastY += 5;

        const operasiBody = activities.operasi.map(item => [
            item.keterangan,
            utils.formatCurrency(item.jumlah)
        ]);

        if (operasiBody.length > 0) {
            operasiBody.push([
                { content: "Total Arus Kas Operasi", styles: { fontStyle: "bold", fillColor: "#dbeafe" } },
                { content: utils.formatCurrency(totalOperasi), styles: { fontStyle: "bold", fillColor: "#dbeafe" } },
            ]);

            doc.autoTable({
                startY: lastY,
                body: operasiBody,
                theme: "plain",
                styles: { fontSize: 9 },
                columnStyles: { 1: { halign: "right" } },
            });
            lastY = doc.autoTable.previous.finalY + 8;
        } else {
            doc.setFontSize(9);
            doc.setFont("helvetica", "italic");
            doc.text("Tidak ada aktivitas operasi", 14, lastY);
            lastY += 10;
        }

        // Aktivitas Investasi
        if (lastY > 250) {
            doc.addPage();
            lastY = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Arus Kas dari Aktivitas Investasi", 14, lastY);
        lastY += 5;

        const investasiBody = activities.investasi.map(item => [
            item.keterangan,
            utils.formatCurrency(item.jumlah)
        ]);

        if (investasiBody.length > 0) {
            investasiBody.push([
                { content: "Total Arus Kas Investasi", styles: { fontStyle: "bold", fillColor: "#fef3c7" } },
                { content: utils.formatCurrency(totalInvestasi), styles: { fontStyle: "bold", fillColor: "#fef3c7" } },
            ]);

            doc.autoTable({
                startY: lastY,
                body: investasiBody,
                theme: "plain",
                styles: { fontSize: 9 },
                columnStyles: { 1: { halign: "right" } },
            });
            lastY = doc.autoTable.previous.finalY + 8;
        } else {
            doc.setFontSize(9);
            doc.setFont("helvetica", "italic");
            doc.text("Tidak ada aktivitas investasi", 14, lastY);
            lastY += 10;
        }

        // Aktivitas Pendanaan
        if (lastY > 250) {
            doc.addPage();
            lastY = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Arus Kas dari Aktivitas Pendanaan", 14, lastY);
        lastY += 5;

        const pendanaanBody = activities.pendanaan.map(item => [
            item.keterangan,
            utils.formatCurrency(item.jumlah)
        ]);

        if (pendanaanBody.length > 0) {
            pendanaanBody.push([
                { content: "Total Arus Kas Pendanaan", styles: { fontStyle: "bold", fillColor: "#e9d5ff" } },
                { content: utils.formatCurrency(totalPendanaan), styles: { fontStyle: "bold", fillColor: "#e9d5ff" } },
            ]);

            doc.autoTable({
                startY: lastY,
                body: pendanaanBody,
                theme: "plain",
                styles: { fontSize: 9 },
                columnStyles: { 1: { halign: "right" } },
            });
            lastY = doc.autoTable.previous.finalY + 10;
        } else {
            doc.setFontSize(9);
            doc.setFont("helvetica", "italic");
            doc.text("Tidak ada aktivitas pendanaan", 14, lastY);
            lastY += 10;
        }

        // Net Cash Flow Summary
        const netCashFlow = totalOperasi + totalInvestasi + totalPendanaan;
        const netCashColor = netCashFlow >= 0 ? "#dcfce7" : "#fee2e2";

        doc.autoTable({
            startY: lastY,
            body: [
                [
                    { content: "Perubahan Bersih Kas", styles: { fontStyle: "bold", fontSize: 12, fillColor: netCashColor } },
                    { content: utils.formatCurrency(netCashFlow), styles: { fontStyle: "bold", fontSize: 12, fillColor: netCashColor } },
                ],
            ],
            theme: "plain",
            columnStyles: { 1: { halign: "right" } },
        });

        // Create cash flow chart
        const cashFlowData = [totalOperasi, totalInvestasi, totalPendanaan];
        const cashFlowLabels = ["Operasi", "Investasi", "Pendanaan"];

        let cashFlowChartImage = null;
        if (cashFlowData.some(val => Math.abs(val) > 0)) {
            const barCtx = document.getElementById("pdf-pie-chart").getContext("2d");
            const cashFlowChart = new Chart(barCtx, {
                type: "bar",
                data: {
                    labels: cashFlowLabels,
                    datasets: [
                        {
                            label: "Arus Kas",
                            data: cashFlowData,
                            backgroundColor: ["#3b82f6", "#f59e0b", "#8b5cf6"],
                            borderColor: ["#1e40af", "#d97706", "#6d28d9"],
                            borderWidth: 2,
                        },
                    ],
                },
                options: {
                    animation: false,
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            ticks: { callback: (value) => utils.formatCurrency(value) },
                            beginAtZero: true
                        },
                    },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 50));
            cashFlowChartImage = cashFlowChart.toBase64Image();
            cashFlowChart.destroy();
        }

        if (cashFlowChartImage) {
            doc.addPage();
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Visualisasi Arus Kas", 14, 20);
            doc.addImage(cashFlowChartImage, "PNG", 14, 30, 180, 100);
        }

        doc.save(`Laporan_Keuangan_Komprehensif_${state.currentMonth}.pdf`);
        utils.closeModal();
    }
};
