document.addEventListener("DOMContentLoaded", function () {
  const orderCards = document.querySelectorAll(".order-card");

  // Toggle Order Details
  orderCards.forEach(function (card) {
    const summary = card.querySelector(".order-summary");
    summary.addEventListener("click", function (event) {
      const tag = event.target.tagName.toLowerCase();
      if (tag === "button" || tag === "a") {
        return;
      }
      const details = card.querySelector(".order-details");
      details.style.display =
        details.style.display === "block" ? "none" : "block";
    });
  });

  // Filter by status
  const orderFilter = document.getElementById("orderFilter");
  orderFilter.addEventListener("change", function (event) {
    const selected = event.target.value.toLowerCase();
    orderCards.forEach(function (card) {
      const status = card.getAttribute("data-status").toLowerCase();
      card.style.display =
        selected === "all" || status === selected ? "block" : "none";
    });
  });

  // Copy Tracking Info
  const copyButtons = document.querySelectorAll(".copy-tracking-btn");
  copyButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const details = btn.closest(".order-details");
      const trackingId = details.querySelector(".tracking-id").textContent;
      navigator.clipboard
        .writeText(trackingId)
        .then(function () {
          showToast("Tracking info copied!", "success");
        })
        .catch(function () {
          showToast("Copy failed", "error");
        });
    });
  });

  // Track Shipment
  const trackButtons = document.querySelectorAll(".track-btn");
  trackButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const orderId = btn.getAttribute("data-order-id");
      const message =
        "Order " + orderId + ": You can track your order on WhatsApp!";
      const url =
        "https://wa.me/+923098245609?text=" + encodeURIComponent(message);
      window.open(url, "_blank");
    });
  });

  // Cancel Order button
  const cancelButtons = document.querySelectorAll(".cancel-order-btn");
  cancelButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const orderId = btn.getAttribute("data-order-id");
      fetch("/check-cancel-order/" + orderId)
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          if (data.allowed) {
            showCancelPopup(orderId);
          } else {
            showCancelNotAllowedPopup(data.message);
          }
        })
        .catch(function () {
          showToast("Error checking cancellation eligibility.", "error");
        });
    });
  });

  // Cancel Order Popup Elements
  const cancelOrderPopup = document.getElementById("cancelOrderPopup");
  const closePopupBtn = cancelOrderPopup.querySelector(".close-popup-btn");
  const reasonButtons = cancelOrderPopup.querySelectorAll(".reason-btn");
  const otherReasonContainer = document.getElementById("otherReasonContainer");
  const otherReasonText = document.getElementById("otherReasonText");
  const submitCancelBtn = document.getElementById("submitCancel");
  let currentCancelOrderId = null;

  function showCancelPopup(orderId) {
    currentCancelOrderId = orderId;
    reasonButtons.forEach(function (b) {
      b.classList.remove("selected");
    });
    otherReasonContainer.style.display = "none";
    otherReasonText.value = "";
    cancelOrderPopup.style.display = "flex";
  }

  closePopupBtn.addEventListener("click", function () {
    cancelOrderPopup.style.display = "none";
  });

  reasonButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      reasonButtons.forEach(function (b) {
        b.classList.remove("selected");
      });
      btn.classList.add("selected");
      if (btn.getAttribute("data-reason") === "other") {
        otherReasonContainer.style.display = "block";
      } else {
        otherReasonContainer.style.display = "none";
      }
    });
  });

  submitCancelBtn.addEventListener("click", function () {
    let selectedReason = "";
    reasonButtons.forEach(function (btn) {
      if (btn.classList.contains("selected")) {
        selectedReason = btn.getAttribute("data-reason");
      }
    });
    if (otherReasonContainer.style.display === "block") {
      selectedReason = otherReasonText.value.trim();
    }
    if (!selectedReason) {
      document.getElementById("cancelError").textContent =
        "Please select a reason.";
      return;
    }
    fetch("/cancel_order/" + currentCancelOrderId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: selectedReason }),
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data.status === "success") {
          showToast(data.message, "success");
          const card = document.querySelector(
            '.order-card[data-order-id="' + currentCancelOrderId + '"]'
          );
          card.querySelector(".order-status").textContent = "Canceled";
          const cancelBtn = card.querySelector(".cancel-order-btn");
          if (cancelBtn) {
            const statusText = card
              .querySelector(".order-status")
              .textContent.trim();
            if (statusText !== "Pending") {
              cancelBtn.disabled = true;
              cancelBtn.style.pointerEvents = "none";
              cancelBtn.style.opacity = "0.5";
            }
          }
          const trackBtn = card.querySelector(".track-btn");
          trackBtn.disabled = true;
          trackBtn.style.pointerEvents = "none";
          trackBtn.style.opacity = "0.5";
          const invoiceLink = card.querySelector(".invoice-link");
          invoiceLink.style.pointerEvents = "none";
          invoiceLink.style.opacity = "0.5";
          cancelOrderPopup.style.display = "none";
        } else {
          showToast(data.message, "error");
        }
      })
      .catch(function () {
        showToast("Error canceling order.", "error");
      });
  });

  // Cancellation Not Allowed Popup
  const cancelNotAllowedPopup = document.getElementById(
    "cancelNotAllowedPopup"
  );
  const closeNotAllowedBtn =
    cancelNotAllowedPopup.querySelector(".close-dialog");

  function showCancelNotAllowedPopup(message) {
    document.getElementById("cancelNotAllowedMsg").textContent = message;
    cancelNotAllowedPopup.style.display = "flex";
  }

  closeNotAllowedBtn.addEventListener("click", function () {
    cancelNotAllowedPopup.style.display = "none";
  });

  // Toast Notification
  function showToast(message, type) {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.style.position = "fixed";
      container.style.top = "20px";
      container.style.right = "20px";
      container.style.zIndex = "10000";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "custom-toast " + type;
    toast.textContent = message;
    container.appendChild(toast);
    toast.classList.add("fade-in");
    setTimeout(function () {
      toast.classList.remove("fade-in");
      toast.classList.add("fade-out");
      toast.addEventListener("animationend", function () {
        toast.remove();
      });
    }, 3000); 
  }

  // Countdown & Auto-Process (persistent, using ISO)
  orderCards.forEach(function (card) {
    const statusEl = card.querySelector(".order-status");
    const status = statusEl.textContent.trim().toLowerCase();
    if (status !== "pending") {
      const cdC = card.querySelector(".order-countdown");
      if (cdC) cdC.style.display = "none";
      return;
    }

    const summary = card.querySelector(".order-summary");
    const countdownEl = summary.querySelector(".countdown");
    const txIso = summary.getAttribute("data-tx");
    if (!txIso || !countdownEl) return;

    const txMs = new Date(txIso).getTime(); // parse ISO correctly
    const target = txMs + 60 * 60 * 1000; // +1 hour
    let interval = null;

    function tick() {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        clearInterval(interval);

        // Server will auto-confirm this order in the background.
        // Update the UI immediately:
        statusEl.textContent = "Confirmed";
        const cdContainer = card.querySelector(".order-countdown");
        if (cdContainer) cdContainer.remove();

        return;
      }

      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      countdownEl.textContent =
        String(hrs).padStart(2, "0") +
        ":" +
        String(mins).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0");
    }

    tick();
    interval = setInterval(tick, 1000);
  });
});
