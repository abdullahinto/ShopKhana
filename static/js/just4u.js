document.addEventListener("DOMContentLoaded", function () {
  const productCards = document.querySelectorAll("#just-for-you .product-card");
  const loadMoreBtn = document.querySelector(".load-more-btn");
  const loadingOverlay = document.getElementById("loading-overlay");

  // Set initial number of visible products (20 products)
  const initialVisibleCount = 20;
  productCards.forEach((card, index) => {
    if (index >= initialVisibleCount) {
      card.style.display = "none";
    }
  });

  // Function to show loading overlay
  function showLoadingOverlay() {
    if (loadingOverlay) {
      loadingOverlay.style.display = "flex";
    }
  }

  // Function to hide loading overlay
  function hideLoadingOverlay() {
    if (loadingOverlay) {
      loadingOverlay.style.display = "none";
    }
  }

  // Event listener for the Load More button
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", async function (e) {
      e.preventDefault();
      showLoadingOverlay();

      // Simulate a loading delay (e.g., 1 second)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if there are hidden cards
      let hiddenCards = Array.from(productCards).filter(
        (card) => card.style.display === "none"
      );

      if (hiddenCards.length > 0) {
        // Expand: show all hidden cards
        productCards.forEach((card, index) => {
          if (index >= initialVisibleCount) {
            card.style.display = "block";
          }
        });
        loadMoreBtn.textContent = "Load Less";
      } else {
        // Collapse: hide cards beyond initialVisibleCount
        productCards.forEach((card, index) => {
          if (index >= initialVisibleCount) {
            card.style.display = "none";
          }
        });
        loadMoreBtn.textContent = "Load More";
      }

      hideLoadingOverlay();
    });
  }
});
