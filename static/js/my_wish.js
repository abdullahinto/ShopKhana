document.addEventListener("DOMContentLoaded", () => {
  /*******************
   * Hardcoded Wishlist Items (Replace with backend fetch later)
   *******************/
  let sk_wl_items = [
    {
      id: 1,
      title: "Louis Vuitton Women's Handbag in Classic Black Leather",
      brand: "Louis Vuitton",
      color: "Vibrant Red",
      discountPrice: 331,
      originalPrice: 450,
      discountPercent: "26%",
      description: "A stylish handbag made from premium leather.",
      selected: false,
      image: "static/img/anklets.jpg",
    },
    {
      id: 2,
      title: "Gucci Signature Belt with Interlocking G",
      brand: "Gucci",
      color: "Black",
      discountPrice: 500,
      originalPrice: 650,
      discountPercent: "23%",
      description: "A classic belt for every occasion.",
      selected: false,
      image: "static/img/anklets.jpg",
    },
  ];

  const wishlistContainer = document.getElementById("sk-wl-items");
  const emptyWishlistDiv = document.getElementById("sk-wl-empty");

  const selectAllBtn = document.getElementById("sk-wl-selectAll");
  const deleteSelectedBtn = document.getElementById("sk-wl-deleteSelected");
  const deleteAllBtn = document.getElementById("sk-wl-deleteAll");
  const shareGlobalBtn = document.getElementById("sk-wl-shareGlobal");
  const wishlistSort = document.getElementById("sk-wl-sort");

  // Global share popup elements
  const sharePopup = document.getElementById("sk-wl-sharePopup");
  const closeShareBtn = sharePopup.querySelector(".sk-wl-close-share");
  const wishlistLinkInput = document.getElementById("sk-wl-link");
  const copyLinkBtn = document.getElementById("sk-wl-copyLink");

  // Render Wishlist Items
  function renderWishlist() {
    wishlistContainer.innerHTML = "";
    if (sk_wl_items.length === 0) {
      emptyWishlistDiv.style.display = "block";
      return;
    } else {
      emptyWishlistDiv.style.display = "none";
    }
    sk_wl_items.forEach((item) => {
      const card = document.createElement("div");
      card.classList.add("sk-wl-card");

      // Card Header
      const headerDiv = document.createElement("div");
      headerDiv.classList.add("sk-wl-card-header");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.selected;
      checkbox.classList.add("sk-wl-checkbox");
      checkbox.addEventListener("change", () => {
        item.selected = checkbox.checked;
      });
      const removeBtn = document.createElement("button");
      removeBtn.classList.add("sk-wl-remove-btn");
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeWishlistItem(item.id);
      });
      headerDiv.appendChild(checkbox);
      headerDiv.appendChild(removeBtn);

      // Product Link & Details
      const productLink = document.createElement("a");
      productLink.href = "#"; // Replace with actual product URL
      productLink.classList.add("sk-wl-product-link");

      const productImgDiv = document.createElement("div");
      productImgDiv.classList.add("sk-wl-product-image");
      const prodImg = document.createElement("img");
      prodImg.src = item.image;
      prodImg.alt = "Product Image";
      productImgDiv.appendChild(prodImg);

      const titleEl = document.createElement("div");
      titleEl.classList.add("sk-wl-product-title");
      titleEl.textContent = item.title;

      const brandEl = document.createElement("div");
      brandEl.classList.add("sk-wl-product-brand");
      brandEl.textContent = `Brand: ${item.brand}`;

      const colorEl = document.createElement("div");
      colorEl.classList.add("sk-wl-product-color");
      colorEl.textContent = `Color: ${item.color}`;

      const pricingDiv = document.createElement("div");
      pricingDiv.classList.add("sk-wl-product-pricing");
      pricingDiv.innerHTML = `
        <span class="sk-wl-discount-price">Rs. ${item.discountPrice}</span>
        <span class="sk-wl-original-price">Rs. ${item.originalPrice}</span>
        <span class="sk-wl-discount-percent">${item.discountPercent}</span>
      `;

      const descEl = document.createElement("div");
      descEl.classList.add("sk-wl-product-description");
      descEl.textContent = item.description;

      productLink.appendChild(productImgDiv);
      productLink.appendChild(titleEl);
      productLink.appendChild(brandEl);
      productLink.appendChild(colorEl);
      productLink.appendChild(pricingDiv);
      productLink.appendChild(descEl);

      // Actions: Add to Cart & Share
      const actionsDiv = document.createElement("div");
      actionsDiv.classList.add("sk-wl-actions");
      const addToCartBtn = document.createElement("button");
      addToCartBtn.classList.add("sk-wl-add-to-cart-btn");
      addToCartBtn.textContent = "Add to Cart";
      addToCartBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        alert("Adding item to cart (placeholder).");
      });
      const shareBtn = document.createElement("button");
      shareBtn.classList.add("sk-wl-share-product-btn");
      shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
      shareBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        alert("Share product (placeholder).");
      });
      actionsDiv.appendChild(addToCartBtn);
      actionsDiv.appendChild(shareBtn);

      // Append card components
      card.appendChild(headerDiv);
      card.appendChild(productLink);
      card.appendChild(actionsDiv);

      wishlistContainer.appendChild(card);
    });
  }

  // Remove individual wishlist item
  function removeWishlistItem(id) {
    sk_wl_items = sk_wl_items.filter((item) => item.id !== id);
    renderWishlist();
  }

  /* ----- Bulk Actions ----- */
  // Select All
  document.getElementById("sk-wl-selectAll").addEventListener("click", () => {
    sk_wl_items.forEach((item) => (item.selected = true));
    renderWishlist();
  });

  // Delete Selected
  document
    .getElementById("sk-wl-deleteSelected")
    .addEventListener("click", () => {
      if (confirm("Are you sure you want to delete selected items?")) {
        sk_wl_items = sk_wl_items.filter((item) => !item.selected);
        renderWishlist();
      }
    });

  // Delete All
  document.getElementById("sk-wl-deleteAll").addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all items?")) {
      sk_wl_items = [];
      renderWishlist();
    }
  });

  /* ----- Global Wishlist Share Popup ----- */
  document.getElementById("sk-wl-shareGlobal").addEventListener("click", () => {
    sharePopup.style.display = "flex";
    wishlistLinkInput.value = window.location.href;
  });

  closeShareBtn.addEventListener("click", () => {
    sharePopup.style.display = "none";
  });

  copyLinkBtn.addEventListener("click", () => {
    wishlistLinkInput.select();
    document.execCommand("copy");
    alert("Wishlist link copied!");
  });

  /* ----- Sorting (Placeholder) ----- */
  wishlistSort.addEventListener("change", (e) => {
    alert(`Sorting wishlist by: ${e.target.value} (placeholder)`);
  });

  // Initial render
  renderWishlist();
});
