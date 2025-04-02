document.addEventListener("DOMContentLoaded", () => {
  const returnItemPopup = document.getElementById("returnItemPopup");
  const closePopupBtn = returnItemPopup.querySelector(".close-popup-btn");
  const submitReturn = document.getElementById("submitReturn");
  const orderIdInput = document.getElementById("orderIdInput");
  const reasonInput = document.getElementById("reasonInput");
  const imageUpload = document.getElementById("imageUpload");
  const videoUpload = document.getElementById("videoUpload");
  const inputs = [orderIdInput, reasonInput, imageUpload, videoUpload];
  const loadingOverlay = document.getElementById("return-loading-overlay");

  // Clear error messages on input.
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      const errorElement = document.getElementById(input.id + "Error");
      if (errorElement) {
        errorElement.style.display = "none";
      }
    });
  });

  // Validate Order ID on blur.
  orderIdInput.addEventListener("blur", () => {
    const orderId = orderIdInput.value.trim();
    if (orderId) {
      fetch(`/check_return_eligibility/${orderId}`)
        .then((response) => response.json())
        .then((data) => {
          if (!data.eligible) {
            returnItemPopup.style.display = "none";
            showReturnErrorPopup(data.message);
          }
        })
        .catch((err) =>
          console.error("Error checking return eligibility:", err)
        );
    }
  });

  // Open return popup.
  const searchReturnsBtn = document.querySelector("#search_returns-new-btn");
  if (searchReturnsBtn) {
    searchReturnsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      returnItemPopup.style.display = "flex";
    });
  }

  // Close return popup.
  closePopupBtn.addEventListener("click", () => {
    returnItemPopup.style.display = "none";
  });

  // Confirmation overlay elements.
  const returnConfirmOverlay = document.getElementById("returnConfirmOverlay");
  const returnConfirmYes = document.getElementById("returnConfirmYes");
  const returnConfirmNo = document.getElementById("returnConfirmNo");

  // When user clicks "Submit Return", validate inputs and re-check eligibility.
  submitReturn.addEventListener("click", () => {
    // Hide previous error messages.
    document
      .querySelectorAll(".error-message")
      .forEach((el) => (el.style.display = "none"));

    // Validate required fields.
    if (!orderIdInput.value.trim()) {
      showError("orderIdError", "Order ID is required");
      return;
    }
    if (!reasonInput.value.trim()) {
      showError("reasonError", "Please explain your return reason");
      return;
    }
    if (imageUpload.files.length < 3) {
      showError("imageError", "Minimum 3 images required");
      return;
    }
    if (videoUpload.files.length < 1) {
      showError("videoError", "Video documentation is required");
      return;
    }

    // Re-check eligibility before submission.
    const orderId = orderIdInput.value.trim();
    fetch(`/check_return_eligibility/${orderId}`)
      .then((response) => response.json())
      .then((data) => {
        if (!data.eligible) {
          returnItemPopup.style.display = "none";
          showReturnErrorPopup(data.message);
          return;
        }
        // If eligible, show confirmation overlay.
        returnConfirmOverlay.style.display = "flex";
      })
      .catch((err) => {
        console.error("Error checking return eligibility:", err);
        showReturnErrorPopup("Error checking return eligibility.");
      });
  });

  // When user confirms submission.
  returnConfirmYes.addEventListener("click", () => {
    returnConfirmOverlay.style.display = "none";
    // Show the loading overlay using your existing element.
    loadingOverlay.style.display = "flex";

    const formData = new FormData();
    formData.append("orderId", orderIdInput.value.trim());
    formData.append("reason", reasonInput.value.trim());
    Array.from(imageUpload.files).forEach((file) => {
      formData.append("imageUpload", file);
    });
    formData.append("videoUpload", videoUpload.files[0]);

    fetch("/submit_return", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        // Hide loading overlay after response.
        loadingOverlay.style.display = "none";
        if (data.status === "success") {
          showSuccess("Your return request has been submitted successfully!");
          returnItemPopup.style.display = "none";
          setTimeout(() => location.reload(), 3000);
        } else {
          showReturnErrorPopup(data.message);
        }
      })
      .catch((err) => {
        console.error("Error submitting return request:", err);
        loadingOverlay.style.display = "none";
        showReturnErrorPopup("Error submitting return request.");
      });
  });

  // If user cancels confirmation.
  returnConfirmNo.addEventListener("click", () => {
    returnConfirmOverlay.style.display = "none";
  });

  function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = "block";
    }
  }

  // Error popup for ineligible return.
  const returnErrorPopup = document.getElementById("returnErrorPopup");
  const closeErrorPopupBtn = returnErrorPopup.querySelector(".close-dialog");
  function showReturnErrorPopup(message) {
    const errorMsgEl = document.getElementById("returnErrorMsg");
    if (errorMsgEl) {
      errorMsgEl.textContent = message;
    }
    returnErrorPopup.style.display = "flex";
  }
  closeErrorPopupBtn.addEventListener("click", () => {
    returnErrorPopup.style.display = "none";
  });

  function showSuccess(message) {
    const toast = document.getElementById("successMessage");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 12000);
  }
});
