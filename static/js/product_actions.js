document.addEventListener("DOMContentLoaded", () => {
  // --- TABS FUNCTIONALITY (DESKTOP & MOBILE) ---
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

  // --- VARIATION COLOR SELECTION (Optional) ---
  const variationButtons = document.querySelectorAll(".variation-btn");
  const selectedColorInput = document.getElementById("selected-color");
  const formSelectedColorInput = document.getElementById("form-selected-color");

  variationButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Remove active class from all variation buttons
      variationButtons.forEach((b) => b.classList.remove("active"));
      // Add active class to the clicked button
      btn.classList.add("active");
      // Update the hidden inputs with the selected color
      const selectedColor = btn.getAttribute("data-color");
      selectedColorInput.value = selectedColor;
      formSelectedColorInput.value = selectedColor;
    });
  });

  // --- Toast Notification Function ---
  function showToast(message, type = "success") {
    let toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toastContainer";
      toastContainer.style.position = "fixed";
      toastContainer.style.top = "20px";
      toastContainer.style.right = "20px";
      toastContainer.style.zIndex = "9999";
      document.body.appendChild(toastContainer);
    }
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.backgroundColor = type === "success" ? "#4CAF50" : "#f44336";
    toast.style.color = "#fff";
    toast.style.padding = "10px 20px";
    toast.style.marginBottom = "10px";
    toast.style.borderRadius = "4px";
    toast.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
    toast.style.opacity = "1";
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = "opacity 0.5s";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }

  // --- Add to Cart Functionality ---
  // Ensure you have a global variable or data attribute that holds the current PRODUCT_ID
  const addToCartBtns = [
    document.getElementById("add-to-cart-btn"),
    document.getElementById("buy-now-btn"),
  ];

  // Attach the click event listener to the Add to Cart button
  const addToCartBtn = document.getElementById("add-to-cart-btn");

  addToCartBtn.addEventListener("click", (e) => {
    e.preventDefault();

    // Get the selected color (or leave it empty if no selection)
    const selectedColor = selectedColorInput.value;

    // Prepare form data for the request
    const formData = new FormData();
    formData.append("selected_color", selectedColor);
    formData.append(
      "quantity",
      document.getElementById("form-quantity").value || 1
    );

    // Add the item to the cart
    fetch(`/add_to_cart/${PRODUCT_ID}`, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          showToast(data.message, "success");
        } else {
          showToast(data.message, "error");
        }
      })
      .catch((err) => {
        console.error(err);
        showToast("Error adding to cart.", "error");
      });
  });

  // --- Add to Wishlist Functionality ---
  const wishlistBtn = document.getElementById("favorite-btn");
  wishlistBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const selectedColor = selectedColorInput.value; // may be empty if not selected
    const formData = new FormData();
    formData.append("selected_color", selectedColor);
    fetch(`/add_to_wishlist/${PRODUCT_ID}`, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          showToast(data.message, "success");
        } else {
          showToast(data.message, "error");
        }
      })
      .catch((err) => {
        console.error(err);
        showToast("Error adding to wishlist.", "error");
      });
  });

  // --- WRITE A REVIEW POPUP ---
  const writeReviewTrigger = document.getElementById("write-review-link");
  const writeReviewPopup = document.getElementById("write-review-popup");
  const closeReviewPopup = writeReviewPopup.querySelector(".close-popup");

  if (writeReviewTrigger) {
    writeReviewTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      // Global auth check assumed here
      writeReviewPopup.style.display = "flex";
    });
  }
  if (closeReviewPopup) {
    closeReviewPopup.addEventListener("click", () => {
      writeReviewPopup.style.display = "none";
    });
  }

  // --- REVIEW IMAGE POPUP ---
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

  // --- SEE MORE CATEGORY BUTTON (data-url) ---
  document.querySelectorAll(".see-more-cat").forEach((btn) => {
    btn.addEventListener("click", () => {
      const url = btn.getAttribute("data-url");
      if (url) {
        window.location.href = url;
      }
    });
  });
});
