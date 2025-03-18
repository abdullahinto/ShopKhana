document.addEventListener("DOMContentLoaded", () => {
  /* ===== TABS FUNCTIONALITY (DESKTOP & MOBILE) ===== */
  const tabsNav = document.getElementById("tabsNav");
  const tabs = tabsNav.querySelectorAll("li");
  const tabContents = document.querySelectorAll(".tab-content");
  const tabsDropdown = document.getElementById("tabsDropdown");
  const dropdownSelect = tabsDropdown.querySelector("select");

  // Desktop tab click handler
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.getAttribute("data-tab");
      tabContents.forEach((tc) => tc.classList.remove("active"));
      document.getElementById(target).classList.add("active");
    });
  });

  // Mobile dropdown change handler
  dropdownSelect.addEventListener("change", (e) => {
    const target = e.target.value;
    tabs.forEach((t) => t.classList.remove("active"));
    const activeTab = document.querySelector(`[data-tab="${target}"]`);
    if (activeTab) activeTab.classList.add("active");
    tabContents.forEach((tc) => tc.classList.remove("active"));
    document.getElementById(target).classList.add("active");
  });

  /* ===== REVIEWS "SEE MORE"/"SHOW LESS" FUNCTIONALITY ===== */
  const reviewsContainer = document.getElementById("reviewsContainer");
  let reviewItems = Array.from(
    reviewsContainer.querySelectorAll(".review-item")
  );
  const seeMoreReviewsBtn = document.getElementById("seeMoreReviewsBtn");

  // On page load, hide review items beyond the first 10
  reviewItems.forEach((item, index) => {
    if (index >= 10) {
      item.classList.add("hidden");
    }
  });

  // Unified event listener for "See More Reviews" button
  seeMoreReviewsBtn.addEventListener("click", () => {
    reviewItems = Array.from(reviewsContainer.querySelectorAll(".review-item"));
    const hiddenReviews = reviewItems.filter((item) =>
      item.classList.contains("hidden")
    );
    if (hiddenReviews.length > 0) {
      // Reveal next 10 hidden items
      hiddenReviews
        .slice(0, 10)
        .forEach((item) => item.classList.remove("hidden"));
      // If no hidden reviews remain, change button text to "Show Less Reviews"
      if (
        reviewsContainer.querySelectorAll(".review-item.hidden").length === 0
      ) {
        seeMoreReviewsBtn.textContent = "Show Less Reviews";
      }
    } else {
      // Collapse: hide all review items beyond the first 10
      reviewItems.forEach((item, index) => {
        if (index >= 10) {
          item.classList.add("hidden");
        }
      });
      seeMoreReviewsBtn.textContent = "See More Reviews";
    }
  });

  /* ===== FAQ ACCORDION ===== */
  document.querySelectorAll(".faq-item").forEach((item) => {
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    const arrow = item.querySelector(".faq-arrow i");
    question.addEventListener("click", () => {
      const isOpen = answer.classList.contains("open");
      if (isOpen) {
        answer.style.maxHeight = "0";
        arrow.classList.remove("fa-rotate-90");
        setTimeout(() => answer.classList.remove("open"), 400);
      } else {
        answer.classList.add("open");
        answer.style.maxHeight = `${answer.scrollHeight}px`;
        arrow.classList.add("fa-rotate-90");
      }
      arrow.parentElement.classList.toggle("rotate", !isOpen);
    });
  });

  /* ===== WRITE A REVIEW POPUP ===== */
  const writeReviewTrigger = document.getElementById("write-review-link");
  const writeReviewPopup = document.getElementById("write-review-popup");
  const closeReviewPopup = writeReviewPopup.querySelector(".close-popup");

  if (writeReviewTrigger) {
    writeReviewTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      // Global auth check assumed here.
      writeReviewPopup.style.display = "flex";
    });
  }
  if (closeReviewPopup) {
    closeReviewPopup.addEventListener("click", () => {
      writeReviewPopup.style.display = "none";
    });
  }

  /* ===== REVIEW IMAGE POPUP ===== */
  const imagePopup = document.getElementById("sk-img-popup");
  const popupImage = document.getElementById("skImgDisplay");
  const closeImagePopup = imagePopup
    ? imagePopup.querySelector(".sk-img-close")
    : null;

  // Attach event listener to all review image thumbnails
  const reviewImageThumbnails = document.querySelectorAll(
    ".review-image-thumbnail"
  );
  reviewImageThumbnails.forEach((img) => {
    img.addEventListener("click", (e) => {
      e.preventDefault();
      if (imagePopup && popupImage) {
        imagePopup.style.display = "flex";
        popupImage.src = img.src;
      }
    });
  });

  if (closeImagePopup) {
    closeImagePopup.addEventListener("click", () => {
      imagePopup.style.display = "none";
    });
  }
  window.addEventListener("click", (e) => {
    if (imagePopup && e.target === imagePopup) {
      imagePopup.style.display = "none";
    }
  });

  /* ===== SEE MORE CATEGORY BUTTON (data-url) ===== */
  document.querySelectorAll(".see-more-cat").forEach((btn) => {
    btn.addEventListener("click", () => {
      const url = btn.getAttribute("data-url");
      if (url) {
        window.location.href = url;
      }
    });
  });
});
