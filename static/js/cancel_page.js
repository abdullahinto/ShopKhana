document.addEventListener("DOMContentLoaded", () => {
  // Toggle card details on click (excluding clicks on links)
  const cancellationCards = document.querySelectorAll(
    ".search_cancellations-card"
  );
  cancellationCards.forEach((card) => {
    card.addEventListener("click", function (e) {
      if (e.target.closest(".search_cancellations-contact-support")) {
        return;
      }
      card.classList.toggle("expanded");
    });
  });

  // Check if there are no cancellation cards and display the empty message
  const cardsContainer = document.querySelector(
    ".search_cancellations-cards-container"
  );
  const emptyMessage = document.querySelector(
    ".search_cancellations-empty-message"
  );
  if (!cardsContainer.querySelector(".search_cancellations-card")) {
    cardsContainer.style.display = "none";
    emptyMessage.style.display = "block";
  }
});
