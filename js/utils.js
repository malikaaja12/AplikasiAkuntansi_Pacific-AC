const utils = {
  formatCurrency(value) {
    if (isNaN(parseFloat(value))) return "";
    return `Rp ${parseFloat(value).toLocaleString("id-ID")}`;
  },

  formatMonth(monthString) {
    const date = new Date(monthString + "-02");
    return date.toLocaleString("id-ID", {
      month: "long",
      year: "numeric",
    });
  },

  showModal(title, message, actions = []) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-body").innerHTML = message;
    const actionsContainer = document.getElementById("modal-actions");
    actionsContainer.innerHTML = "";

    if (actions.length === 0) {
      actions.push({
        text: "Tutup",
        class: "bg-blue-600 hover:bg-blue-700",
        callback: () => this.closeModal(),
      });
    }

    actions.forEach((action) => {
      const button = document.createElement("button");
      button.textContent = action.text;
      button.className = `py-2 px-4 text-white rounded-md text-sm font-medium ${action.class}`;
      button.onclick = action.callback;
      actionsContainer.appendChild(button);
    });

    document.getElementById("modal").classList.remove("hidden");
  },

  closeModal() {
    document.getElementById("modal").classList.add("hidden");
  },
};
export { utils };
