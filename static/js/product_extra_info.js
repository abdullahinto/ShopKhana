document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================================================
     1. TABS FUNCTIONALITY (DESKTOP & MOBILE)
     ========================================================================== */
  const tabsNav = document.getElementById("tabsNav");
  const tabs = tabsNav.querySelectorAll("li");
  const tabContents = document.querySelectorAll(".tab-content");
  const tabsDropdown = document.getElementById("tabsDropdown");
  const dropdownSelect = tabsDropdown.querySelector("select");

  // Desktop tab click handler
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setActiveTab(tab);
      showTabContent(tab.getAttribute("data-tab"));
    });
  });

  // Mobile dropdown change handler
  dropdownSelect.addEventListener("change", (e) => {
    const selectedTabId = e.target.value;
    const selectedTab = document.querySelector(`[data-tab="${selectedTabId}"]`);

    setActiveTab(selectedTab);
    showTabContent(selectedTabId);
  });

  function setActiveTab(activeTab) {
    tabs.forEach((t) => t.classList.remove("active"));
    activeTab.classList.add("active");
  }

  function showTabContent(targetId) {
    tabContents.forEach((tc) => tc.classList.remove("active"));
    document.getElementById(targetId).classList.add("active");
  }

  /* ==========================================================================
     2. REVIEWS EXPANSION
     ========================================================================== */
  const reviewsContainer = document.getElementById("reviewsContainer");
  const seeMoreReviewsBtn = document.getElementById("seeMoreReviewsBtn");
  let reviewsExpanded = false;

  seeMoreReviewsBtn.addEventListener("click", () => {
    reviewsExpanded = !reviewsExpanded;
    reviewsContainer.classList.toggle("expanded", reviewsExpanded);
    seeMoreReviewsBtn.textContent = reviewsExpanded
      ? "Show Less Reviews"
      : "See More Reviews";
  });

  /* ==========================================================================
     3. FAQ ACCORDION
     ========================================================================== */
  document.querySelectorAll(".faq-item").forEach((item) => {
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    const arrow = item.querySelector(".faq-arrow i");

    question.addEventListener("click", () => {
      const isOpen = answer.classList.contains("open");

      if (isOpen) {
        // Close the accordion
        answer.style.maxHeight = "0";
        arrow.classList.remove("fa-rotate-90");
        setTimeout(() => answer.classList.remove("open"), 400);
      } else {
        // Open the accordion
        answer.classList.add("open");
        answer.style.maxHeight = `${answer.scrollHeight}px`;
        arrow.classList.add("fa-rotate-90");
      }

      arrow.parentElement.classList.toggle("rotate", !isOpen);
    });
  });

  /* ==========================================================================
     4. NO REVIEWS HANDLING
     ========================================================================== */
  const reviewItems = reviewsContainer.querySelectorAll(".review-item");

  if (reviewItems.length === 0) {
    const noReviewMsg = document.createElement("div");
    noReviewMsg.className = "no-reviews-message";
    noReviewMsg.innerHTML = `
      <i class="fas fa-star"></i>
      <p>No reviews yet. Be the first to share your thoughts and help others! 🌟</p>
    `;

    reviewsContainer.appendChild(noReviewMsg);
    seeMoreReviewsBtn.style.display = "none";
  }

  /* ==========================================================================
     5. IMAGE POPUP GALLERY
     ========================================================================== */
  const popup = document.getElementById("imagePopup");
  const popupImage = document.getElementById("popupImage");
  const closeBtn = document.querySelector(".close-popup");

  // Open popup when a thumbnail is clicked
  document.querySelectorAll(".review-image-thumbnail").forEach((img) => {
    img.addEventListener("click", (e) => {
      popup.classList.add("active");
      popupImage.src = e.target.src.replace("-thumb", ""); // Replace "-thumb" for full-size images
    });
  });

  // Close popup when clicking the close button
  closeBtn.addEventListener("click", () => {
    popup.classList.remove("active");
  });

  // Close popup when clicking outside the popup content
  window.addEventListener("click", (e) => {
    if (e.target === popup) {
      popup.classList.remove("active");
    }
  });
});
