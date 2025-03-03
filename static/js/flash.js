document.addEventListener("DOMContentLoaded", function () {
    // Select all product cards in the flash sale section
    const productCards = document.querySelectorAll("#flash-sale .product-card");
  
    // Add the 'card-hidden' class by default
    productCards.forEach((card) => {
      card.classList.add("card-hidden");
    });
  
    // Create an Intersection Observer
    const observerOptions = {
      root: null,
      threshold: 0.2, // Trigger when 10% of card is visible
    };
  
    const revealOnScroll = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("card-visible");
          // Once visible, stop observing to avoid repeated triggers
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);
  
    // Observe each product card
    productCards.forEach((card) => {
      revealOnScroll.observe(card);
    });
  });
  