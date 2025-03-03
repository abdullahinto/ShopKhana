document.addEventListener("DOMContentLoaded", () => {
  // Hardcoded values for demonstration
  const totalPriceEl = document.getElementById("skFinalTotalPrice");
  const remindPriceEl = document.getElementById("skFinalRemindPrice");
  const orderNumEl = document.getElementById("skFinalOrderNum");

  // For example
  totalPriceEl.textContent = "1157";
  remindPriceEl.textContent = "1157";
  orderNumEl.textContent = "209282801928274";

  // Toggle Order Summary
  const summaryToggleBtn = document.getElementById("skFinalSummaryToggle");
  const summaryContent = document.getElementById("skFinalSummaryContent");
  let isSummaryOpen = false;

  summaryToggleBtn.addEventListener("click", () => {
    isSummaryOpen = !isSummaryOpen;
    summaryContent.style.display = isSummaryOpen ? "block" : "none";
    const icon = summaryToggleBtn.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-chevron-down", !isSummaryOpen);
      icon.classList.toggle("fa-chevron-up", isSummaryOpen);
    }
  });

  // "View Order" button inside the second mini-section
  const viewOrderBtn = document.querySelector(".sk-final-view-order-btn");
  viewOrderBtn.addEventListener("click", () => {
    alert("Navigating to My Orders page (placeholder).");
  });

  // "Continue Shopping" button
  const continueBtn = document.getElementById("skFinalContinueBtn");
  continueBtn.addEventListener("click", () => {
    alert("Continuing shopping (placeholder).");
  });
});
