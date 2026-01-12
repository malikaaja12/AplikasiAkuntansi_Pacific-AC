import { utils } from "../utils.js";

export const geminiService = {
  async callAPI(prompt, buttonElement) {
    if (buttonElement) buttonElement.classList.add("loading");
    utils.showModal(
      "✨ Analisis AI",
      `<div class="text-center"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i><p class="mt-2">Menghubungi Gemini...</p></div>`
    );

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };
    const apiKey = "YOUR_GOOGLE_API_KEY_HERE"; // Ganti dengan API key Anda
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (
        result.candidates &&
        result.candidates.length > 0 &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0
      ) {
        let text = result.candidates[0].content.parts[0].text;
        text = text.replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="font-semibold text-gray-900">$1</strong>'
        );
        text = text.replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>');
        text = text.replace(/(\r\n|\n|\r)/gm, "<br>");
        text = text.replace(/<br><li/g, "<li");
        utils.showModal(
          "✨ Analisis AI",
          `<div class="gemini-response-content text-left space-y-2">${text}</div>`
        );
      } else {
        utils.showModal(
          "Error",
          "Gagal mendapatkan respons dari AI. Struktur data tidak terduga."
        );
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      utils.showModal(
        "Error",
        "Gagal menghubungi AI. Silakan periksa koneksi internet Anda dan coba lagi."
      );
    } finally {
      if (buttonElement) buttonElement.classList.remove("loading");
    }
  },
};
