document.addEventListener("DOMContentLoaded", function () {
    const categoryCards = document.querySelectorAll("#categories-section .category-card");
  
    // Initially hide them
    categoryCards.forEach((card) => {
      card.classList.add("card-hidden");
    });
  
    // Intersection Observer setup
    const observerOptions = {
      root: null,
      threshold: 0.1, // 10% visible triggers
    };
  
    const revealCards = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("card-visible");
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);
  
    // Observe each card
    categoryCards.forEach((card) => {
      revealCards.observe(card);
    });
  
    // "Load More" button (placeholder functionality)
    const loadMoreBtn = document.querySelector(".load-more-btn");
    loadMoreBtn.addEventListener("click", () => {
      // Placeholder logic for loading more categories
      alert("Load more categories coming soon!");
    });
  });
  