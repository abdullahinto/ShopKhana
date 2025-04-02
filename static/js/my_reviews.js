document.addEventListener("DOMContentLoaded", function () {
  // Variables for modal editing.
  let currentReviewCard = null;
  const editReviewModal = document.getElementById("editReviewModal");
  const closeModalBtn = editReviewModal.querySelector(".close-modal");
  const editReviewForm = document.getElementById("editReviewForm");

  // Read More Toggle.
  document.querySelectorAll(".read-more").forEach((link) => {
    link.addEventListener("click", function (e) {
      const reviewTextEl = this.parentElement;
      reviewTextEl.classList.toggle("expanded");
      if (reviewTextEl.classList.contains("expanded")) {
        this.textContent = "Show Less";
        // Optionally, replace truncated text with full review text by reloading from a data attribute.
      } else {
        this.textContent = "Read More";
      }
    });
  });

  // Attach event listeners for edit buttons.
  document.querySelectorAll(".edit-review-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      currentReviewCard = this.closest(".review-card");
      // Get current rating and review text.
      const currentRating =
        currentReviewCard.querySelector(".rating-value").textContent;
      // Assuming the review text is in the .review-text element (without the "Read More" text)
      let currentReviewText =
        currentReviewCard.querySelector(".review-text").textContent;
      // Remove any "Read More" or "Show Less" text.
      currentReviewText = currentReviewText
        .replace("Read More", "")
        .replace("Show Less", "")
        .trim();
      document.getElementById("editRating").value = currentRating;
      document.getElementById("editReviewText").value = currentReviewText;
      editReviewModal.style.display = "flex";
    });
  });

  // Close modal.
  closeModalBtn.addEventListener("click", () => {
    editReviewModal.style.display = "none";
  });

  // Submit edit review form.
  editReviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const reviewId = currentReviewCard.dataset.reviewId;
    const newRating = document.getElementById("editRating").value;
    const newReviewText = document.getElementById("editReviewText").value;
    try {
      const response = await fetch(`/edit-review/${reviewId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: newRating, review: newReviewText }),
      });
      const result = await response.json();
      if (response.ok) {
        currentReviewCard.querySelector(".rating-value").textContent =
          newRating;
        const reviewTextEl = currentReviewCard.querySelector(".review-text");
        reviewTextEl.textContent = newReviewText + " ";
        const readMoreSpan = document.createElement("span");
        readMoreSpan.className = "read-more";
        readMoreSpan.textContent = "Read More";
        readMoreSpan.addEventListener("click", function () {
          reviewTextEl.classList.toggle("expanded");
          this.textContent = reviewTextEl.classList.contains("expanded")
            ? "Show Less"
            : "Read More";
        });
        reviewTextEl.appendChild(readMoreSpan);
        showToast(result.message, "success");
      } else {
        showToast(result.message, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating review.", "error");
    }
    editReviewModal.style.display = "none";
  });

  // Attach event listeners for delete buttons.
  document.querySelectorAll(".delete-review-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const reviewCard = btn.closest(".review-card");
      const reviewId = reviewCard.dataset.reviewId;
      styledConfirm(
        "Are you sure you want to DELETE this review?",
        async () => {
          try {
            const response = await fetch(`/delete-review/${reviewId}`, {
              method: "DELETE",
            });
            const result = await response.json();
            if (response.ok) {
              reviewCard.remove();
              if (document.querySelectorAll(".review-card").length === 0) {
                document.getElementById("emptyReviews").style.display = "block";
              }
              showToast(result.message, "success");
            } else {
              showToast(result.message, "error");
            }
          } catch (err) {
            console.error(err);
            showToast("Error deleting review.", "error");
          }
        }
      );
    });
  });

  // --- Styled Confirmation Dialog Function ---
  function styledConfirm(message, callback) {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog";
    dialog.innerHTML = `
      <p>${message}</p>
      <div class="confirm-buttons">
        <button class="confirm-btn yes-btn">Yes</button>
        <button class="confirm-btn no-btn">No</button>
      </div>
    `;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    dialog.querySelector(".yes-btn").addEventListener("click", () => {
      callback();
      overlay.remove();
    });
    dialog.querySelector(".no-btn").addEventListener("click", () => {
      overlay.remove();
    });
  }

  // --- Elegant Toast Notification Function ---
  function showToast(message, type) {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.style.position = "fixed";
      container.style.top = "20px";
      container.style.right = "20px";
      container.style.zIndex = 10000;
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "custom-toast " + type;
    toast.textContent = message;
    container.appendChild(toast);
    toast.classList.add("fade-in");
    setTimeout(() => {
      toast.classList.remove("fade-in");
      toast.classList.add("fade-out");
      toast.addEventListener("animationend", () => {
        toast.remove();
      });
    }, 3000);
  }
});
