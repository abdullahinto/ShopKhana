document.addEventListener("DOMContentLoaded", function () {
    // Select all product cards in the Recommended Products section
    const productCards = document.querySelectorAll("#recommended-products .product-card");
  
    // Add the 'card-hidden' class by default
    productCards.forEach((card) => {
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
  
    // Observe each product card
    productCards.forEach((card) => {
      revealOnScroll.observe(card);
    });
  });
  