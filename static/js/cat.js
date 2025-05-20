document.addEventListener("DOMContentLoaded", () => {
  initializeCategoryCardReveal();
  initializeLoadMoreCategories();
});

/**
 * (Optional) Reveals category cards on scroll using Intersection Observer.
 */
function initializeCategoryCardReveal() {
  const categoryCards = document.querySelectorAll(
    "#categories-section .category-card"
  );
  categoryCards.forEach((card) => card.classList.add("card-hidden"));

  const observerOptions = { root: null, threshold: 0.1 };
  const observer = new IntersectionObserver((entries, observerInstance) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.remove("card-hidden");
        entry.target.classList.add("card-visible");
        observerInstance.unobserve(entry.target);
      }
    });
  }, observerOptions);

  categoryCards.forEach((card) => observer.observe(card));
}

/**
 * Initializes the "Load More" functionality for categories.
 */
function initializeLoadMoreCategories() {
  const categoryCards = document.querySelectorAll(
    "#categories-section .category-card"
  );
  const initialVisibleCount = 14;
  // Hide cards beyond the first 14 initially.
  categoryCards.forEach((card, index) => {
    if (index >= initialVisibleCount) {
      card.style.display = "none";
    }
  });

  let expanded = false;
  const loadMoreBtn = document.getElementById("cat-load-more-categories");
  const loadingOverlay = document.getElementById("loading-overlay");

  function showLoadingOverlay() {
    if (loadingOverlay) {
      loadingOverlay.style.display = "flex";
    }
  }

  function hideLoadingOverlay() {
    if (loadingOverlay) {
      loadingOverlay.style.display = "none";
    }
  }

  loadMoreBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    showLoadingOverlay();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulated delay

    const allCards = Array.from(
      document.querySelectorAll("#categories-section .category-card")
    );
    const hiddenCards = allCards.filter(
      (card) => card.style.display === "none"
    );

    if (!expanded) {
      // Reveal next 10 hidden cards
      let count = 0;
      hiddenCards.forEach((card) => {
        if (count < 10) {
          card.style.display = "block";
          count++;
        }
      });
      // If no hidden cards remain, change button text to "Load Less" and set expanded flag
      if (
        allCards.filter((card) => card.style.display === "none").length === 0
      ) {
        expanded = true;
        loadMoreBtn.textContent = "Load Less";
      }
    } else {
      // Collapse: Hide cards beyond the initial 10
      allCards.forEach((card, index) => {
        if (index >= initialVisibleCount) {
          card.style.display = "none";
        }
      });
      expanded = false;
      loadMoreBtn.textContent = "Load More";
    }

    hideLoadingOverlay();
  });
}
