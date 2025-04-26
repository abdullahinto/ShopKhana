document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded. Initializing Ask Question functionality...");

  /* ===== ANIMATE PRODUCT DETAILS SECTION ===== */
  const productSection = document.getElementById("product-details-section");
  if (productSection) {
    const observerOptions = { root: null, threshold: 0.1 };
    const sectionObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          productSection.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);
    sectionObserver.observe(productSection);
  }

  /* ===== PRICE CALCULATION ===== */
  const discountPriceEl = document.getElementById("discount-price");
  const originalPriceEl = document.getElementById("original-price");
  const discountBadgeEl = document.getElementById("discount-badge");

  // let originalPrice = {{ product.originalPrice or 3000 }};
  // let discountPrice = {{ product.discountedPrice }};

  // if (discountPriceEl) {
  //   discountPriceEl.textContent = `Rs. ${discountPrice.toFixed(2)}`;
  // }
  // if (originalPriceEl) {
  //   originalPriceEl.textContent = `Rs. ${originalPrice.toFixed(2)}`;
  // }
  // if (discountBadgeEl) {
  //   let discountPercent =
  //     ((originalPrice - discountPrice) / originalPrice) * 100;
  //   discountBadgeEl.textContent = `${discountPercent.toFixed(0)}% OFF`;
  // }

  /* ===== IMAGE GALLERY & TRANSITIONS ===== */
  const thumbnails = document.querySelectorAll(".thumbnails img");
  const mainImage = document.getElementById("main-product-image");
  let currentImageIndex = 0;
  let imageUrls = [];

  thumbnails.forEach((thumb, index) => {
    imageUrls.push(thumb.dataset.full);
    thumb.addEventListener("click", () => {
      currentImageIndex = index;
      updateMainImage();
    });
  });

  function updateMainImage() {
    mainImage.style.opacity = 0;
    setTimeout(() => {
      mainImage.src = imageUrls[currentImageIndex];
      thumbnails.forEach((thumb) => thumb.classList.remove("active-thumb"));
      if (thumbnails[currentImageIndex]) {
        thumbnails[currentImageIndex].classList.add("active-thumb");
      }
      // Update zoom modal image if visible
      const zoomImg = document.getElementById("zoom-img");
      if (zoomImg) {
        zoomImg.src = imageUrls[currentImageIndex];
      }
      mainImage.style.opacity = 1;
    }, 200);
  }

  /* ===== NAVIGATION BUTTONS ===== */
  const prevBtn = document.querySelector(".prev-btn");
  const nextBtn = document.querySelector(".next-btn");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      currentImageIndex =
        (currentImageIndex - 1 + imageUrls.length) % imageUrls.length;
      updateMainImage();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      currentImageIndex = (currentImageIndex + 1) % imageUrls.length;
      updateMainImage();
    });
  }

  /* ===== MOBILE SWIPE FUNCTIONALITY ===== */
  const mainImageContainer = document.querySelector(".main-image");
  let touchStartX = 0;
  let touchEndX = 0;
  const swipeThreshold = 50;

  if (mainImageContainer) {
    mainImageContainer.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });
    mainImageContainer.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    });
  }
  function handleSwipe() {
    let diff = touchStartX - touchEndX;
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        currentImageIndex = (currentImageIndex + 1) % imageUrls.length;
      } else {
        currentImageIndex =
          (currentImageIndex - 1 + imageUrls.length) % imageUrls.length;
      }
      updateMainImage();
    }
  }

  /* ===== ZOOM FUNCTIONALITY ===== */
  const zoomModal = document.getElementById("zoom-modal");
  const zoomImg = document.getElementById("zoom-img");
  const zoomFactor = 2;
  if (mainImage && zoomModal && zoomImg) {
    const zoomModalWidth = zoomModal.offsetWidth;
    const zoomModalHeight = zoomModal.offsetHeight;

    mainImage.addEventListener("mouseenter", () => {
      zoomModal.style.display = "block";
      zoomImg.src = mainImage.src;
    });
    mainImage.addEventListener("mousemove", (e) => {
      const rect = mainImage.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const posX = -(x * zoomFactor - zoomModalWidth / 2);
      const posY = -(y * zoomFactor - zoomModalHeight / 2);
      zoomImg.style.left = posX + "px";
      zoomImg.style.top = posY + "px";
    });
    mainImage.addEventListener("mouseleave", () => {
      zoomModal.style.display = "none";
    });
  }

  /* ===== SHARE POPUP ===== */
  const shareTrigger = document.getElementById("share-trigger");
  const sharePopup = document.getElementById("share-popup");
  const closeShare = document.querySelector(".close-share");
  const productLinkInput = document.getElementById("product-link");
  const copyLinkBtn = document.getElementById("copy-link-btn");

  if (
    shareTrigger &&
    sharePopup &&
    productLinkInput &&
    copyLinkBtn &&
    closeShare
  ) {
    shareTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      sharePopup.style.display = "flex";
      productLinkInput.value = window.location.href;
    });
    closeShare.addEventListener("click", () => {
      sharePopup.style.display = "none";
    });
    copyLinkBtn.addEventListener("click", () => {
      productLinkInput.select();
      try {
        document.execCommand("copy");
        showToast("Product link copied!", "success");
      } catch (err) {
        console.error("Copy failed", err);
        showToast("Failed to copy link.", "error");
      }
    });
  }

  /* ===== ASK A QUESTION MODAL ===== */
  const askQuestionTrigger = document.getElementById("ask-question-trigger");
  const askQuestionModal = document.getElementById("ask-question-modal");
  const closeModal = document.querySelector(".close-modal");
  const sendQuestionBtn = document.getElementById("send-question-btn");
  const questionInput = document.getElementById("question-input");
  const productLinkModal = document.getElementById("product-link-modal");

  if (askQuestionTrigger && askQuestionModal && closeModal && sendQuestionBtn) {
    // Open the modal and ensure the product link is pre-filled
    askQuestionTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      productLinkModal.value = window.location.href; // Populate product link automatically
      askQuestionModal.style.display = "flex";
    });

    // Close modal
    closeModal.addEventListener("click", () => {
      askQuestionModal.style.display = "none";
    });

    // Handle form submission
    sendQuestionBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const question = questionInput.value.trim();
      const productLink = productLinkModal.value.trim();
      if (!productLink || !question) {
        showToast("Please add both the product link and question.", "error");
        return;
      }
      // Send POST request to the /ask_question endpoint
      fetch("/ask_question", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `product_link=${encodeURIComponent(
          productLink
        )}&question=${encodeURIComponent(question)}`,
      })
        .then((response) => response.text())
        .then(() => {
          showToast("Your question has been submitted!", "success");
          questionInput.value = "";
          askQuestionModal.style.display = "none";
        })
        .catch((err) => {
          console.error(err);
          showToast("Error submitting your question.", "error");
        });
    });
  }

  // Example of a simple toast function for charming notifications
  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }

  /* ===== QUANTITY SELECTION ===== */
  const qtyDecrease = document.getElementById("qty-decrease");
  const qtyIncrease = document.getElementById("qty-increase");
  const qtyInput = document.getElementById("quantity-input");
  if (qtyInput) {
    const maxQty = parseInt(qtyInput.max) || Infinity;
    if (qtyDecrease) {
      qtyDecrease.addEventListener("click", () => {
        let current = parseInt(qtyInput.value);
        if (current > 1) qtyInput.value = current - 1;
        updateFormQuantity();
      });
    }
    if (qtyIncrease) {
      qtyIncrease.addEventListener("click", () => {
        let current = parseInt(qtyInput.value);
        if (current < maxQty) qtyInput.value = current + 1;
        updateFormQuantity();
      });
    }
  }
  function updateFormQuantity() {
    const formQtyInput = document.getElementById("form-quantity");
    if (formQtyInput) {
      formQtyInput.value = qtyInput.value;
    }
  }

  /* ===== FAVORITE TOGGLE ===== */
  const favoriteBtn = document.getElementById("favorite-btn");
  if (favoriteBtn) {
    let isFavorited = false;
    favoriteBtn.addEventListener("click", () => {
      // Global auth check is assumed to intercept non-authenticated clicks on requires-auth elements.
      isFavorited = !isFavorited;
      if (isFavorited) {
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
        favoriteBtn.title = "Remove from favorites";
        // AJAX POST to add product to wishlist
        fetch("/add_to_wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `product_id=${encodeURIComponent("{{ product._id }}")}`,
        })
          .then((response) => response.text())
          .then(() => {
            showToast("Added to wishlist!", "success");
          })
          .catch((err) => {
            console.error(err);
            showToast("Error adding to wishlist.", "error");
          });
      } else {
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        favoriteBtn.title = "Add to favorites";
        // Optional: AJAX to remove from wishlist can be added here
        showToast("Removed from wishlist.", "success");
      }
    });
  }

  /* ===== VARIATION CAROUSEL NAVIGATION ===== */
  document.querySelectorAll(".variation-carousel").forEach((carousel) => {
    const variationList = carousel.querySelector(".variation-list");
    if (!variationList) return;
    const scrollAmount = 50;
    const leftArrow = carousel.querySelector(".variation-arrow-left");
    if (leftArrow) {
      leftArrow.addEventListener("click", () => {
        variationList.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      });
    }
    const rightArrow = carousel.querySelector(".variation-arrow-right");
    if (rightArrow) {
      rightArrow.addEventListener("click", () => {
        variationList.scrollBy({ left: scrollAmount, behavior: "smooth" });
      });
    }
  });

  /* ===== BUY NOW BUTTON ===== */
  document.querySelectorAll(".PD_buy-now-btn").forEach((item) => {
    item.addEventListener("click", () => {
      const targetUrl = item.getAttribute("data-href");
      console.log("Button Clicked!");
      if (targetUrl) {
        window.location.href = targetUrl;
      }
    });
  });

  /* ===== GLOBAL TOAST FUNCTIONALITY ===== */
  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }
});
