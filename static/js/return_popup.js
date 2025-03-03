document.addEventListener("DOMContentLoaded", () => {
  const returnItemPopup = document.getElementById("returnItemPopup");
  const closePopupBtn = returnItemPopup.querySelector(".close-popup-btn");
  const submitReturn = document.getElementById("submitReturn");
  const orderIdInput = document.getElementById("orderIdInput");
  const reasonInput = document.getElementById("reasonInput");
  const imageUpload = document.getElementById("imageUpload");
  const videoUpload = document.getElementById("videoUpload");
  const inputs = [orderIdInput, reasonInput, imageUpload, videoUpload];

  // Clear errors on input
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      const errorId = `${input.id}Error`;
      document.getElementById(errorId).style.display = "none";
    });
  });

  // Open popup
  document
    .querySelector(".search_returns-new-btn")
    .addEventListener("click", (e) => {
      e.preventDefault();
      returnItemPopup.style.display = "flex";
    });

  // Close popup
  closePopupBtn.addEventListener("click", () => {
    returnItemPopup.style.display = "none";
  });

  // Form submission
  submitReturn.addEventListener("click", () => {
    // Clear previous errors
    document
      .querySelectorAll(".error-message")
      .forEach((el) => (el.style.display = "none"));

    // Validate Order ID
    if (!orderIdInput.value.trim()) {
      showError("orderIdError", "Order ID is required");
      return;
    }

    // Validate Reason
    if (!reasonInput.value.trim()) {
      showError("reasonError", "Please explain your return reason");
      return;
    }

    // Validate Images
    if (imageUpload.files.length < 3) {
      showError("imageError", "Minimum 3 images required");
      return;
    }

    // Validate Video
    if (videoUpload.files.length < 1) {
      showError("videoError", "Video documentation is required");
      return;
    }

    // Show success message
    showSuccess("Your return request has been submitted successfully! Once approved, we'll notify you via email or SMS for further steps.");
    returnItemPopup.style.display = "none";
  });

  // Error message helper
  function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = "block";
  }

  // Success toast helper
  function showSuccess(message) {
    const toast = document.getElementById("successMessage");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 12000);
  }
});
