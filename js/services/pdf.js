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

    async generateCategoryPDF() {
        utils.showModal(
            "Info",
            '<div class="text-center"><i class="fas fa-spinner fa-spin text-2xl text-purple-500"></i><p class="mt-2">Mempersiapkan Laporan Per Kategori...</p></div>'
        );
        await new Promise((resolve) => setTimeout(resolve, 100));

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Filter journals by category
        const residentialJurnals = state.jurnals.filter(j => j.category === "Residential");
        const projectJurnals = state.jurnals.filter(j => j.category === "Project");
        const uncategorizedJurnals = state.jurnals.filter(j => !j.category);

        // Helper function to calculate financials for a specific category
        const calculateCategoryFinancials = (jurnals) => {
            let totalPendapatan = 0;
            let totalBeban = 0;
            const pendapatanDetails = {};
            const bebanDetails = {};

            jurnals.forEach((j) => {
                const akun = state.settings.akuns.find((a) => a.name === j.akun);
                if (!akun) return;

                if (akun.type === "Pendapatan") {
                    const amount = j.kredit - j.debit;
                    totalPendapatan += amount;
                    pendapatanDetails[j.akun] = (pendapatanDetails[j.akun] || 0) + amount;
                } else if (akun.type === "Beban") {
                    const amount = j.debit - j.kredit;
                    totalBeban += amount;
                    bebanDetails[j.akun] = (bebanDetails[j.akun] || 0) + amount;
                }
            });

            return {
                totalPendapatan,
                totalBeban,
                labaBersih: totalPendapatan - totalBeban,
                pendapatanDetails,
                bebanDetails
            };
        };

        // Calculate for each category
        const residentialData = calculateCategoryFinancials(residentialJurnals);
        const projectData = calculateCategoryFinancials(projectJurnals);
        const uncategorizedData = calculateCategoryFinancials(uncategorizedJurnals);

        // ========== COVER PAGE ==========
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("Laporan Keuangan Per Kategori", 105, 30, { align: "center" });

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text(`Periode: ${utils.formatMonth(state.currentMonth)}`, 105, 40, { align: "center" });

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Ringkasan:", 14, 60);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        const summaryData = [
            ["🏠 Residential", utils.formatCurrency(residentialData.labaBersih)],
            ["🏗️ Project", utils.formatCurrency(projectData.labaBersih)],
            ["📋 Tanpa Kategori", utils.formatCurrency(uncategorizedData.labaBersih)],
            [
                { content: "Total Keseluruhan", styles: { fontStyle: "bold" } },
                {
                    content: utils.formatCurrency(residentialData.labaBersih + projectData.labaBersih + uncategorizedData.labaBersih),
                    styles: { fontStyle: "bold" }
                }
            ]
        ];

        doc.autoTable({
            startY: 65,
            body: summaryData,
            theme: "striped",
            headStyles: { fillColor: "#7c3aed" },
            columnStyles: { 1: { halign: "right" } },
        });

        // Helper function to render category section
        const renderCategorySection = (categoryName, icon, data, jurnals, startNewPage = true) => {
            if (startNewPage) {
                doc.addPage();
            }

            let lastY = 20;

            // Category Header
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text(`${icon} ${categoryName}`, 14, lastY);
            lastY += 10;

            // Financial Summary
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Ringkasan Laba Rugi", 14, lastY);
            lastY += 5;

            const summaryBody = [
                ["Total Pendapatan", utils.formatCurrency(data.totalPendapatan)],
                ["Total Beban", utils.formatCurrency(data.totalBeban)],
                [
                    { content: "Laba (Rugi) Bersih", styles: { fontStyle: "bold", fillColor: data.labaBersih >= 0 ? "#dcfce7" : "#fee2e2" } },
                    { content: utils.formatCurrency(data.labaBersih), styles: { fontStyle: "bold", fillColor: data.labaBersih >= 0 ? "#dcfce7" : "#fee2e2" } }
                ]
            ];

            doc.autoTable({
                startY: lastY,
                body: summaryBody,
                theme: "plain",
                styles: { fontSize: 10 },
                columnStyles: { 1: { halign: "right" } },
            });

            lastY = doc.autoTable.previous.finalY + 15;

            // Detailed Breakdown
            if (Object.keys(data.pendapatanDetails).length > 0 || Object.keys(data.bebanDetails).length > 0) {
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text("Rincian Pendapatan & Beban", 14, lastY);
                lastY += 5;

                const detailBody = [];

                // Pendapatan
                Object.entries(data.pendapatanDetails).forEach(([key, value]) => {
                    if (value > 0) {
                        detailBody.push([`Pendapatan: ${key}`, utils.formatCurrency(value)]);
                    }
                });

                // Beban
                Object.entries(data.bebanDetails).forEach(([key, value]) => {
                    if (value > 0) {
                        detailBody.push([`Beban: ${key}`, utils.formatCurrency(value)]);
                    }
                });

                if (detailBody.length > 0) {
                    doc.autoTable({
                        startY: lastY,
                        body: detailBody,
                        theme: "striped",
                        styles: { fontSize: 9 },
                        columnStyles: { 1: { halign: "right" } },
                    });
                    lastY = doc.autoTable.previous.finalY + 15;
                }
            }

            // Journal Entries
            if (jurnals.length > 0) {
                if (lastY > 220) {
                    doc.addPage();
                    lastY = 20;
                }

                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text("Rincian Jurnal", 14, lastY);
                lastY += 5;

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
                                content: `Tanggal: ${firstEntry.tanggal} | No: ${firstEntry.noBukti}`,
                                colSpan: 3,
                                styles: { fontStyle: "bold", fillColor: "#f3e8ff", textColor: "#6b21a8" },
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
                    startY: lastY,
                    head: [["Akun & Keterangan", "Debit", "Kredit"]],
                    body: journalBody,
                    theme: "grid",
                    headStyles: { fillColor: "#7c3aed", textColor: "#ffffff", fontStyle: "bold" },
                    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
                    styles: { fontSize: 8 },
                });
            } else {
                doc.setFontSize(10);
                doc.setFont("helvetica", "italic");
                doc.text("Tidak ada transaksi untuk kategori ini.", 14, lastY);
            }
        };

        // Render each category section
        renderCategorySection("Residential", "🏠", residentialData, residentialJurnals, true);
        renderCategorySection("Project", "🏗️", projectData, projectJurnals, true);

        if (uncategorizedJurnals.length > 0) {
            renderCategorySection("Tanpa Kategori", "📋", uncategorizedData, uncategorizedJurnals, true);
        }

        doc.save(`Laporan_Per_Kategori_${state.currentMonth}.pdf`);
        utils.closeModal();
    }
};
