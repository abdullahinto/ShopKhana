document.addEventListener("DOMContentLoaded", () => {
  const returnCards = document.querySelectorAll(".search_returns-card");
  returnCards.forEach((card) => {
    card.addEventListener("click", function (e) {
      if (e.target.closest(".search_returns-contact-support")) return;
      this.classList.toggle("expanded");
    });
  });

  const cardsContainer = document.querySelector(
    ".search_returns-cards-container"
  );
  const emptyMessage = document.getElementById("emptyReturns");
  if (!cardsContainer.querySelector(".search_returns-card")) {
    cardsContainer.style.display = "none";
    emptyMessage.style.display = "block";
  }
});
