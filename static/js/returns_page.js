document.addEventListener("DOMContentLoaded", () => {
  // Toggle card details on click (excluding clicks on buttons/links)
  const returnCards = document.querySelectorAll(".search_returns-card");
  returnCards.forEach((card) => {
    card.addEventListener("click", function (e) {
      if (
        e.target.closest(".search_returns-initiate-btn") ||
        e.target.closest(".search_returns-contact-support")
      ) {
        return;
      }
      card.classList.toggle("expanded");
    });
  });

  // Check if there are no return cards and display the empty message
  const cardsContainer = document.querySelector(
    ".search_returns-cards-container"
  );
  const emptyMessage = document.querySelector(".search_returns-empty-message");
  if (!cardsContainer.querySelector(".search_returns-card")) {
    cardsContainer.style.display = "none";
    emptyMessage.style.display = "block";
  }
});
