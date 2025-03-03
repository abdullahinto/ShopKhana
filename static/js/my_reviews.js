document.addEventListener("DOMContentLoaded", function () {
  /* ----- Pagination (Placeholder) ----- */
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const currentPageSpan = document.getElementById("currentPage");
  let currentPage = 1;
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      currentPageSpan.textContent = currentPage;
      // Trigger backend pagination (placeholder)
      alert("Loading previous page (placeholder).");
    }
  });
  nextPageBtn.addEventListener("click", () => {
    currentPage++;
    currentPageSpan.textContent = currentPage;
    // Trigger backend pagination (placeholder)
    alert("Loading next page (placeholder).");
  });

  /* ----- Read More Toggle for Review Text ----- */
  const readMoreLinks = document.querySelectorAll(".read-more");
  readMoreLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const reviewText = e.target.parentElement;
      reviewText.classList.toggle("expanded");
      e.target.textContent = reviewText.classList.contains("expanded")
        ? "Show Less"
        : "Read More";
    });
  });

  /* ----- Edit Review Modal ----- */
  const editReviewBtns = document.querySelectorAll(".edit-review-btn");
  const editReviewModal = document.getElementById("editReviewModal");
  const closeModalBtn = editReviewModal.querySelector(".close-modal");
  let currentReviewCard = null;

  editReviewBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Identify the review card being edited
      currentReviewCard = btn.closest(".review-card");
      // Pre-fill modal with current review data
      const currentRating =
        currentReviewCard.querySelector(".rating-value").textContent;
      const currentReviewText = currentReviewCard
        .querySelector(".review-text")
        .textContent.replace("Read More", "")
        .replace("Show Less", "")
        .trim();

      document.getElementById("editRating").value = currentRating;
      document.getElementById("editReviewText").value = currentReviewText;

      editReviewModal.style.display = "flex";
    });
  });

  closeModalBtn.addEventListener("click", () => {
    editReviewModal.style.display = "none";
  });

  document.getElementById("editReviewForm").addEventListener("submit", (e) => {
    e.preventDefault();
    // Simulate saving changes: update review card with new values
    const newRating = document.getElementById("editRating").value;
    const newReviewText = document.getElementById("editReviewText").value;

    if (currentReviewCard) {
      currentReviewCard.querySelector(".rating-value").textContent = newRating;
      let reviewTextEl = currentReviewCard.querySelector(".review-text");
      reviewTextEl.textContent = newReviewText + " ";
      // Append a read-more toggle again
      const readMoreSpan = document.createElement("span");
      readMoreSpan.className = "read-more";
      readMoreSpan.textContent = "Read More";
      reviewTextEl.appendChild(readMoreSpan);

      // Re-attach the read-more event listener
      readMoreSpan.addEventListener("click", (e) => {
        reviewTextEl.classList.toggle("expanded");
        readMoreSpan.textContent = reviewTextEl.classList.contains("expanded")
          ? "Show Less"
          : "Read More";
      });
    }

    editReviewModal.style.display = "none";
    alert("Review updated (placeholder).");
  });

  /* ----- Delete Review with Confirmation ----- */
  const deleteReviewBtns = document.querySelectorAll(".delete-review-btn");
  deleteReviewBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Are you sure you want to delete this review?")) {
        const reviewCard = btn.closest(".review-card");
        reviewCard.remove();
        if (document.querySelectorAll(".review-card").length === 0) {
          document.getElementById("emptyReviews").style.display = "block";
        }
      }
    });
  });

  /* ----- Sorting & Filtering (Placeholders) ----- */
  document.getElementById("sortReviews").addEventListener("change", (e) => {
    alert("Sorting by: " + e.target.value + " (placeholder)");
  });
  document.getElementById("filterCategory").addEventListener("change", (e) => {
    alert("Filtering by category: " + e.target.value + " (placeholder)");
  });
});
