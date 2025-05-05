document.addEventListener("DOMContentLoaded", () => {
  // Toggle Order Details on clicking order summary.
  const orderCards = document.querySelectorAll(".order-card");
  orderCards.forEach((card) => {
    const summary = card.querySelector(".order-summary");
    summary.addEventListener("click", (e) => {
      if (["button", "a"].includes(e.target.tagName.toLowerCase())) return;
      const details = card.querySelector(".order-details");
      details.style.display =
        details.style.display === "block" ? "none" : "block";
    });
  });

  // Filter orders by status.
  const orderFilter = document.getElementById("orderFilter");
  orderFilter.addEventListener("change", () => {
    const selected = orderFilter.value.toLowerCase();
    orderCards.forEach((card) => {
      const status = card.getAttribute("data-status").toLowerCase();
      card.style.display =
        selected === "all" || status === selected ? "block" : "none";
    });
  });

  // Copy Tracking Info.
  document.querySelectorAll(".copy-tracking-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const trackingId =
        btn.parentElement.querySelector(".tracking-id").textContent;
      copyToClipboard(trackingId);
      showToast("Tracking info copied!", "success");
    });
  });

  function copyToClipboard(text) {
    const tempInput = document.createElement("input");
    tempInput.style.position = "absolute";
    tempInput.style.left = "-9999px";
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
  }

  // Track Shipment: Redirect to WhatsApp.
  document.querySelectorAll(".track-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const orderId = btn.getAttribute("data-order-id");
      const message = `Order ${orderId}: You can track your order status on WhatsApp!`;
      window.open(
        `https://wa.me/+923098245609?text=${encodeURIComponent(message)}`,
        "_blank"
      );
    });
  });

  // Cancel Order: Check eligibility and show appropriate popup.
  document.querySelectorAll(".cancel-order-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const orderId = btn.getAttribute("data-order-id");
      fetch(`/check-cancel-order/${orderId}`)
        .then((response) => response.json())
        .then((data) => {
          if (!data.allowed) {
            showCancelNotAllowedPopup(data.message);
            return;
          } else {
            showCancelPopup(orderId);
          }
        })
        .catch((err) => {
          console.error(err);
          showToast("Error checking cancellation eligibility.", "error");
        });
    });
  });

  // Cancel Order Popup (Confirmation Overlay)
  const cancelOrderPopup = document.getElementById("cancelOrderPopup");
  const closePopupBtn = cancelOrderPopup.querySelector(".close-popup-btn");
  const reasonButtons = document.querySelectorAll("#reasonButtons .reason-btn");
  const otherReasonContainer = document.getElementById("otherReasonContainer");
  const otherReasonText = document.getElementById("otherReasonText");
  const submitCancelBtn = document.getElementById("submitCancel");
  let currentCancelOrderId = null;

  function showCancelPopup(orderId) {
    currentCancelOrderId = orderId;
    reasonButtons.forEach((btn) => btn.classList.remove("selected"));
    otherReasonContainer.style.display = "none";
    otherReasonText.value = "";
    cancelOrderPopup.style.display = "flex";
  }

  closePopupBtn.addEventListener("click", () => {
    cancelOrderPopup.style.display = "none";
  });

  reasonButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      reasonButtons.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      if (btn.getAttribute("data-reason") === "other") {
        otherReasonContainer.style.display = "block";
      } else {
        otherReasonContainer.style.display = "none";
      }
    });
  });

  submitCancelBtn.addEventListener("click", () => {
    let selectedReason = "";
    reasonButtons.forEach((btn) => {
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
    fetch(`/cancel_order/${currentCancelOrderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: selectedReason }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          showToast(data.message, "success");
          const orderCard = document.querySelector(
            `[data-order-id="${currentCancelOrderId}"]`
          );
          if (orderCard) {
            orderCard.querySelector(".order-status").textContent = "Canceled";
            const cancelBtn = orderCard.querySelector(".cancel-order-btn");
            if (cancelBtn) {
              cancelBtn.disabled = true;
            }
            const trackBtn = orderCard.querySelector(".track-btn");
            if (trackBtn) {
              trackBtn.disabled = true;
              trackBtn.style.pointerEvents = "none";
              trackBtn.style.opacity = "0.5";
            }
            const invoiceLink = orderCard.querySelector(".invoice-link");
            if (invoiceLink) {
              invoiceLink.style.pointerEvents = "none";
              invoiceLink.style.opacity = "0.5";
            }
          }
          cancelOrderPopup.style.display = "none";
        } else {
          showToast(data.message, "error");
        }
      })
      .catch((err) => {
        console.error(err);
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
    document.getElementById("cancelNotAllowedMsg").textContent =
      "Order cancellations are available within the first 1 hour. Since that time has passed, your order is being processed with care 🤗✨. We hope it brings you joy 😊💖, and we’re here if you need us! 💌";
    cancelNotAllowedPopup.style.display = "flex";
  }

  closeNotAllowedBtn.addEventListener("click", () => {
    cancelNotAllowedPopup.style.display = "none";
  });

  /* ----- Elegant Toast Notification Function ----- */
  function showToast(message, type) {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.style.position = "fixed";
      container.style.top = "20px";
      container.style.right = "20px";
      container.style.zIndex = 10000;
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "custom-toast " + type;
    toast.textContent = message;
    container.appendChild(toast);
    toast.classList.add("fade-in");
    setTimeout(() => {
      toast.classList.remove("fade-in");
      toast.classList.add("fade-out");
      toast.addEventListener("animationend", () => {
        toast.remove();
      });
    }, 3000);
  }
});

// ---- Countdown & auto‑process logic ----
document.querySelectorAll(".order-summary").forEach((summary) => {
  const orderId = summary.dataset.orderId;
  const txIso = summary.dataset.tx;
  if (!txIso) return;
  const countdownEl = summary.querySelector(".countdown");

  // compute the target = tx + 1 hour (3600 s)
  const startTime = new Date(txIso).getTime();
  const targetTime = startTime + 60 * 60 * 1000;

  const tick = () => {
    const now = Date.now();
    let diff = targetTime - now;
    if (diff <= 0) {
      // time’s up → mark Processing & clear interval
      clearInterval(intervalId);
      fetch(`/mark-processing/${orderId}`, { method: "POST" })
        .then((r) => r.json())
        .then((json) => {
          if (json.status === "ok") {
            // you could either reload entire page:
            // window.location.reload();
            // —or— just update this card’s status:
            const card = document.querySelector(
              `.order-card[data-order-id="${orderId}"]`
            );
            card.querySelector(".order-status").textContent = "Processing";
            summary.querySelector(".order-countdown").remove();
          }
        });
      return;
    }
    // format HH:MM:SS
    const hrs = Math.floor(diff / 3600000);
    diff %= 3600000;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    countdownEl.textContent =
      String(hrs).padStart(2, "0") +
      ":" +
      String(mins).padStart(2, "0") +
      ":" +
      String(secs).padStart(2, "0");
  };

  tick(); // initial
  const intervalId = setInterval(tick, 1000);
});
