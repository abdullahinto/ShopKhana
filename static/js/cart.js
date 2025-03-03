document.addEventListener("DOMContentLoaded", () => {
  /*******************
   * Hardcoded Cart Items
   *******************/
  let cartItems = [
    {
      id: 1,
      title: "Louis Vuitton Women's Handbag in Classic Black Leather",
      brand: "Louis Vuitton",
      color: "Vibrant Red",
      discountPrice: 331,
      originalPrice: 450,
      discountPercent: "26%",
      quantity: 1,
      selected: false,
      image: "https://via.placeholder.com/60?text=Handbag"
    },
    {
      id: 2,
      title: "Louis Vuitton Women's Handbag in Classic Black Leather",
      brand: "Louis Vuitton",
      color: "Rose Gold",
      discountPrice: 331,
      originalPrice: 450,
      discountPercent: "26%",
      quantity: 1,
      selected: false,
      image: "https://via.placeholder.com/60?text=Handbag2"
    }
  ];

  // Constants
  const SHIPPING_FEE = 150; // Rs. 150
  const productCartContainer = document.getElementById("productCartContainer");
  const subTotalEl = document.getElementById("subTotal");
  const shippingFeeEl = document.getElementById("shippingFee");
  const grandTotalEl = document.getElementById("grandTotal");
  const itemCountEl = document.getElementById("itemCount");
  const proceedCheckoutBtn = document.getElementById("proceedCheckoutBtn");

  const selectAllBtn = document.getElementById("selectAllBtn");
  const deleteAllBtn = document.getElementById("deleteAllBtn");
  const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

  const couponInput = document.getElementById("couponInput");
  const applyCouponBtn = document.getElementById("applyCouponBtn");

  // Render cart items
  function renderCartItems() {
    productCartContainer.innerHTML = "";

    if (cartItems.length === 0) {
      // Show empty cart message
      const emptyDiv = document.createElement("div");
      emptyDiv.classList.add("empty-cart-message");
      emptyDiv.innerHTML = `
        <i class="fas fa-shopping-cart"></i>
        <p>Your cart is empty. Start exploring our amazing products and add them to your cart by clicking the <b> "Add to cart"</b> button. Happy shopping! 😊</p>

      `;
      productCartContainer.appendChild(emptyDiv);
      return;
    }

    cartItems.forEach(item => {
      const row = document.createElement("div");
      row.classList.add("cart-item-row");

      // Checkbox
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.selected;
      checkbox.classList.add("cart-item-checkbox");
      checkbox.addEventListener("change", () => {
        item.selected = checkbox.checked;
        recalcCart();
      });

      // Image
      const imgDiv = document.createElement("div");
      imgDiv.classList.add("cart-item-image");
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = "Product Image";
      imgDiv.appendChild(img);

      // Details
      const detailsDiv = document.createElement("div");
      detailsDiv.classList.add("cart-item-details");
      const titleEl = document.createElement("div");
      titleEl.classList.add("cart-item-title");
      titleEl.textContent = item.title;
      const brandEl = document.createElement("div");
      brandEl.classList.add("cart-item-brand");
      brandEl.textContent = `Brand: ${item.brand}`;
      const colorEl = document.createElement("div");
      colorEl.classList.add("cart-item-color");
      colorEl.textContent = `Color: ${item.color}`;
      const pricingDiv = document.createElement("div");
      pricingDiv.classList.add("cart-item-pricing");
      pricingDiv.innerHTML = `
        <span class="cart-discount-price">Rs. ${item.discountPrice}</span>
        <span class="cart-original-price">Rs. ${item.originalPrice}</span>
        <span class="cart-discount-percent">${item.discountPercent}</span>
      `;

      detailsDiv.appendChild(titleEl);
      detailsDiv.appendChild(brandEl);
      detailsDiv.appendChild(colorEl);
      detailsDiv.appendChild(pricingDiv);

      // Actions
      const actionsDiv = document.createElement("div");
      actionsDiv.classList.add("cart-item-actions");

      // Quantity
      const qtyDiv = document.createElement("div");
      qtyDiv.classList.add("quantity-control");
      const minusBtn = document.createElement("button");
      minusBtn.classList.add("qty-btn");
      minusBtn.textContent = "-";
      minusBtn.addEventListener("click", () => {
        if (item.quantity > 1) {
          item.quantity--;
          qtyInput.value = item.quantity;
          recalcCart();
        }
      });
      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.value = item.quantity;
      qtyInput.classList.add("qty-input");
      qtyInput.addEventListener("change", () => {
        let val = parseInt(qtyInput.value);
        if (isNaN(val) || val < 1) val = 1;
        item.quantity = val;
        qtyInput.value = val;
        recalcCart();
      });
      const plusBtn = document.createElement("button");
      plusBtn.classList.add("qty-btn");
      plusBtn.textContent = "+";
      plusBtn.addEventListener("click", () => {
        item.quantity++;
        qtyInput.value = item.quantity;
        recalcCart();
      });

      qtyDiv.appendChild(minusBtn);
      qtyDiv.appendChild(qtyInput);
      qtyDiv.appendChild(plusBtn);

      // Icons (heart, trash)
      const iconsDiv = document.createElement("div");
      iconsDiv.classList.add("action-icons");
      const heartIcon = document.createElement("i");
      heartIcon.classList.add("fas", "fa-heart");
      heartIcon.addEventListener("click", () => {
        alert("Add to wishlist (placeholder).");
      });
      const trashIcon = document.createElement("i");
      trashIcon.classList.add("fas", "fa-trash");
      trashIcon.addEventListener("click", () => {
        removeItem(item.id);
      });

      iconsDiv.appendChild(heartIcon);
      iconsDiv.appendChild(trashIcon);

      actionsDiv.appendChild(qtyDiv);
      actionsDiv.appendChild(iconsDiv);

      // Append to row
      row.appendChild(checkbox);
      row.appendChild(imgDiv);
      row.appendChild(detailsDiv);
      row.appendChild(actionsDiv);

      productCartContainer.appendChild(row);
    });
  }

  // Recalculate cart totals
  function recalcCart() {
    let subTotal = 0;
    let itemCount = 0;
    cartItems.forEach(item => {
      if (item.selected) {
        subTotal += item.discountPrice * item.quantity;
        itemCount += item.quantity;
      }
    });

    // Dynamic shipping fee calculation:
    // For instance: Rs.150 for the first item + Rs.50 for each additional item.
    let shipping = itemCount > 0 ? (150 + (itemCount - 1) * 50) : 0;
    let total = subTotal + shipping;

    // Update UI
    subTotalEl.textContent = subTotal;
    shippingFeeEl.textContent = shipping;
    grandTotalEl.textContent = total;
    itemCountEl.textContent = itemCount;
    proceedCheckoutBtn.textContent = `PROCEED TO CHECKOUT(${itemCount})`;
  }

  // Remove item from cart
  function removeItem(id) {
    cartItems = cartItems.filter(item => item.id !== id);
    renderCartItems();
    recalcCart();
  }

  // Initial render
  renderCartItems();
  recalcCart();

  /********** CTA Buttons **********/
  // Select All
  selectAllBtn.addEventListener("click", () => {
    cartItems.forEach(item => (item.selected = true));
    renderCartItems();
    recalcCart();
  });

  // Delete All
  deleteAllBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete ALL items?")) {
      cartItems = [];
      renderCartItems();
      recalcCart();
    }
  });

  // Delete Selected
  deleteSelectedBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete SELECTED items?")) {
      cartItems = cartItems.filter(item => !item.selected);
      renderCartItems();
      recalcCart();
    }
  });

  /********** Coupon Code **********/
  applyCouponBtn.addEventListener("click", () => {
    const code = couponInput.value.trim();
    if (!code) {
      alert("Please enter a coupon code.");
      return;
    }
    // Placeholder approach
    alert(`Applying coupon: ${code} (placeholder)`);
  });

  /********** Proceed to Checkout **********/
  proceedCheckoutBtn.addEventListener("click", () => {
    alert("Proceeding to checkout (placeholder).");
  });
});
