document.addEventListener("DOMContentLoaded", () => {
  // Toggle Order Details on clicking the order summary
  const orderCards = document.querySelectorAll(".order-card");
  orderCards.forEach((card) => {
    const summary = card.querySelector(".order-summary");
    summary.addEventListener("click", (e) => {
      // Prevent triggering on clicks of buttons or links
      if (
        e.target.tagName.toLowerCase() === "button" ||
        e.target.tagName.toLowerCase() === "a"
      ) {
        return;
      }
      const details = card.querySelector(".order-details");
      details.style.display =
        details.style.display === "block" ? "none" : "block";
    });
  });

  // Filter orders by status
  const orderFilter = document.getElementById("orderFilter");
  orderFilter.addEventListener("change", () => {
    const selected = orderFilter.value;
    orderCards.forEach((card) => {
      if (selected === "all" || card.getAttribute("data-status") === selected) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  });

  // Load More Orders (simulate by duplicating first order card)
  const loadMoreBtn = document.getElementById("loadMoreOrders");
  loadMoreBtn.addEventListener("click", () => {
    const ordersContainer = document.querySelector(".orders-container");
    const firstOrder = ordersContainer.querySelector(".order-card");
    const clone = firstOrder.cloneNode(true);
    // Optionally update order details for the clone here
    ordersContainer.appendChild(clone);

    // Reattach toggle event for the new card
    clone.querySelector(".order-summary").addEventListener("click", (e) => {
      if (
        e.target.tagName.toLowerCase() === "button" ||
        e.target.tagName.toLowerCase() === "a"
      ) {
        return;
      }
      const details = clone.querySelector(".order-details");
      details.style.display =
        details.style.display === "block" ? "none" : "block";
    });
  });
});
