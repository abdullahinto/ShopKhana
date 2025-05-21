// product_actions.js

document.addEventListener("DOMContentLoaded", () => {
  // --- TABS FUNCTIONALITY (DESKTOP & MOBILE) ---
  const tabsNav = document.getElementById("tabsNav");
  const tabs = tabsNav ? tabsNav.querySelectorAll("li") : [];
  const tabContents = document.querySelectorAll(".tab-content");
  const tabsDropdown = document.getElementById("tabsDropdown");
  const dropdownSelect = tabsDropdown
    ? tabsDropdown.querySelector("select")
    : null;

  // Desktop tab click handler
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.getAttribute("data-tab");
      tabContents.forEach((tc) => tc.classList.remove("active"));
      document.getElementById(target)?.classList.add("active");
    });
  });

  // Mobile dropdown change handler
  if (dropdownSelect) {
    dropdownSelect.addEventListener("change", (e) => {
      const target = e.target.value;
      tabs.forEach((t) => t.classList.remove("active"));
      const activeTab = document.querySelector(`[data-tab=\"${target}\"]`);
      activeTab?.classList.add("active");
      tabContents.forEach((tc) => tc.classList.remove("active"));
      document.getElementById(target)?.classList.add("active");
    });
  }

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
  const addToCartBtn = document.getElementById("add-to-cart-btn");
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const selectedColor =
        document.getElementById("selected-color")?.value || "";
      const selectedSize =
        document.getElementById("selected-size")?.value || "";
      const quantity = document.getElementById("form-quantity")?.value || 1;

      const formData = new FormData();
      formData.append("selected_color", selectedColor);
      formData.append("selected_size", selectedSize);
      formData.append("quantity", quantity);

      fetch(`/add_to_cart/${PRODUCT_ID}`, {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          showToast(data.message, data.success ? "success" : "error");
        })
        .catch((err) => {
          console.error(err);
          showToast("Error adding to cart.", "error");
        });
    });
  }

  // --- Unified Variation Selection (Color & Size) ---
  const colorBtns = document.querySelectorAll(".color-btn");
  const sizeBtns = document.querySelectorAll(".size-btn");
  const colorInput = document.getElementById("selected-color");
  const sizeInput = document.getElementById("selected-size");
  const formColor = document.getElementById("form-selected-color");
  const formSize = document.getElementById("form-selected-size");
  const buyNowLink = document.querySelector(".PD_buy-now-btn");
  const originalBuyNowHref =
    buyNowLink?.getAttribute("href").split("?")[0] || "";

  function updateBuyNowHref() {
    const c = encodeURIComponent(colorInput?.value || "");
    const s = encodeURIComponent(sizeInput?.value || "");
    if (buyNowLink) {
      buyNowLink.href =
        `${originalBuyNowHref}?product_id=${PRODUCT_ID}` +
        `&selected_color=${c}` +
        `&selected_size=${s}`;
    }
  }

  function bindGroup(btns, dataAttr, hiddenEl, formHiddenEl) {
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        // toggle active within group
        btns.forEach((b) => b.classList.toggle("active", b === btn));
        // set values
        const val = btn.dataset[dataAttr];
        if (hiddenEl) hiddenEl.value = val;
        if (formHiddenEl) formHiddenEl.value = val;
        updateBuyNowHref();
      });
    });
    // auto-select first
    if (btns.length && hiddenEl && !hiddenEl.value) btns[0].click();
  }

  bindGroup(colorBtns, "color", colorInput, formColor);
  bindGroup(sizeBtns, "size", sizeInput, formSize);

  // --- WRITE A REVIEW POPUP ---
  const writeReviewTrigger = document.getElementById("write-review-link");
  const writeReviewPopup = document.getElementById("write-review-popup");
  const closeReviewPopup = writeReviewPopup?.querySelector(".close-popup");

  if (writeReviewTrigger && writeReviewPopup) {
    writeReviewTrigger.addEventListener("click", async (e) => {
      e.preventDefault();
      writeReviewPopup.style.display = "none";
      try {
        const resp = await fetch(
          `/check-delivered-orders?product_id=${PRODUCT_ID}`
        );
        const data = await resp.json();
        if (data.hasDelivered) writeReviewPopup.style.display = "flex";
        else
          showToast("You can only review products you've received.", "error");
      } catch (err) {
        console.error(err);
        showToast("Error verifying order status.", "error");
      }
    });
  }
  closeReviewPopup?.addEventListener("click", () => {
    writeReviewPopup.style.display = "none";
  });

  // --- REVIEW IMAGE POPUP ---
  const imagePopup = document.getElementById("sk-img-popup");
  const popupImage = document.getElementById("skImgDisplay");
  const closeImagePopup = imagePopup?.querySelector(".sk-img-close");

  document.querySelectorAll(".review-image-thumbnail").forEach((img) => {
    img.addEventListener("click", (e) => {
      e.preventDefault();
      if (imagePopup && popupImage) {
        imagePopup.style.display = "flex";
        popupImage.src = img.src;
      }
    });
  });
  closeImagePopup?.addEventListener("click", () => {
    imagePopup.style.display = "none";
  });
  window.addEventListener("click", (e) => {
    if (e.target === imagePopup) imagePopup.style.display = "none";
  });

  // --- SEE MORE CATEGORY BUTTON ---
  document.querySelectorAll(".see-more-cat").forEach((btn) => {
    btn.addEventListener("click", () => {
      const url = btn.getAttribute("data-url");
      if (url) window.location.href = url;
    });
  });
});
