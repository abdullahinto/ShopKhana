document.addEventListener("DOMContentLoaded", function () {
  // Select all product cards in the Category Product section
  const categoryProductCards = document.querySelectorAll(
    "#sk-category-product-page .category-product-card"
  );

  // Add the 'card-hidden' class by default
  categoryProductCards.forEach((card) => {
    card.classList.add("card-hidden");
  });

  // Create an Intersection Observer
  const observerOptions = {
    root: null,
    threshold: 0.2,
  };

  const revealOnScroll = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("card-visible");
        // Stop observing once the element is visible
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe each category product card
  categoryProductCards.forEach((card) => {
    revealOnScroll.observe(card);
  });
});

/**
 * Sets the active state for a pagination link.
 * @param {HTMLElement} activeLink - The pagination link to mark as active.
 */
function setActivePage(activeLink) {
  const pageLinks = document.querySelectorAll(
    ".search_results-pagination a.search_results-pagination-page"
  );
  pageLinks.forEach((link) => link.classList.remove("active")); // Remove active class from all links
  activeLink.classList.add("active"); // Add active class to the clicked link
}
