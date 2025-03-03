document.addEventListener("DOMContentLoaded", () => {
  const cancelOrderPopup = document.getElementById("cancelOrderPopup");
  const closePopupBtn = cancelOrderPopup.querySelector(".close-popup-btn");
  const reasonButtons = document.querySelectorAll(".reason-btn");
  const otherReasonContainer = document.getElementById("otherReasonContainer");
  const otherReasonText = document.getElementById("otherReasonText");
  const submitCancel = document.getElementById("submitCancel");
  const confirmDialog = document.getElementById("confirmDialog");
  const confirmMessage = document.getElementById("confirmMessage");
  const confirmYes = document.getElementById("confirmYes");
  const confirmNo = document.getElementById("confirmNo");
  let selectedReason = null;

  // Open popup
  document.querySelectorAll(".cancel-order-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      cancelOrderPopup.style.display = "flex";
    });
  });

  // Close popup
  closePopupBtn.addEventListener("click", () => {
    cancelOrderPopup.style.display = "none";
  });

  // Handle reason selection
  reasonButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      reasonButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedReason = btn.dataset.reason;

      if (selectedReason === "other") {
        otherReasonContainer.style.display = "block";
      } else {
        otherReasonContainer.style.display = "none";
        otherReasonText.value = "";
      }
    });
  });

  // Form submission
  submitCancel.addEventListener("click", () => {
    // Clear errors
    document
      .querySelectorAll(".error-message")
      .forEach((el) => (el.style.display = "none"));

    if (!selectedReason) {
      showError("cancelError", "Please select a cancellation reason");
      return;
    }

    if (selectedReason === "other" && !otherReasonText.value.trim()) {
      showError("otherReasonError", "Please specify your reason");
      return;
    }

    // Show confirmation
    const finalReason =
      selectedReason === "other"
        ? otherReasonText.value.trim()
        : selectedReason;

    confirmMessage.textContent = `Are you sure you want to cancel the order?\nReason: ${finalReason}`;
    confirmDialog.style.display = "flex";
  });

  // Confirmation handlers
  confirmYes.addEventListener("click", () => {
    confirmDialog.style.display = "none";
    showSuccess("Order cancelled successfully");
    cancelOrderPopup.style.display = "none";

    // Reset form
    reasonButtons.forEach((b) => b.classList.remove("active"));
    otherReasonContainer.style.display = "none";
    otherReasonText.value = "";
    selectedReason = null;
  });

  confirmNo.addEventListener("click", () => {
    confirmDialog.style.display = "none";
  });

  // Error handling
  function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = "block";
  }

  // Success toast
  function showSuccess(message) {
    const toast = document.getElementById("successMessage");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 5000);
  }
});
