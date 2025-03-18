document.addEventListener("DOMContentLoaded", () => {
  // Use cart data from the global variable.
  let cartItems = window.cartData && window.cartData.products ? window.cartData.products : [];

  // Constants & element references.
  const SHIPPING_FEE_DEFAULT = window.cartData.deliveryFee || 0;
  const productCartContainer = document.getElementById("productCartContainer");
  const subTotalEl = document.getElementById("subTotal");
  const shippingFeeEl = document.getElementById("shippingFee");
  const grandTotalEl = document.getElementById("grandTotal");
  const itemCountEl = document.getElementById("itemCount");
  const proceedCheckoutBtn = document.getElementById("proceedCheckoutBtn");
  const proceedCountEl = document.getElementById("proceedCount");

  const selectAllBtn = document.getElementById("selectAllBtn");
  const deleteAllBtn = document.getElementById("deleteAllBtn");
  const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

  const couponInput = document.getElementById("couponInput");
  const applyCouponBtn = document.getElementById("applyCouponBtn");

  // Render the cart items.
  function renderCartItems() {
    productCartContainer.innerHTML = "";
    if (cartItems.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.classList.add("empty-cart-message");
      emptyDiv.innerHTML = `
        <i class="fas fa-shopping-cart"></i>
        <p>Your cart is empty. Start exploring our amazing products and add them to your cart by clicking the <b>"Add to Cart"</b> button. Happy shopping! 😊</p>
      `;
      productCartContainer.appendChild(emptyDiv);
      return;
    }
    cartItems.forEach((item, index) => {
      const row = document.createElement("div");
      row.classList.add("cart-item-row");
      row.setAttribute("data-index", index);

      // Checkbox.
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.selected || false;
      checkbox.classList.add("cart-item-checkbox");
      checkbox.addEventListener("change", () => {
        item.selected = checkbox.checked;
        recalcCart();
        // Optionally update selection in DB.
      });

      // Product Image.
      const imgDiv = document.createElement("div");
      imgDiv.classList.add("cart-item-image");
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = "Product Image";
      imgDiv.appendChild(img);

      // Details.
      const detailsDiv = document.createElement("div");
      detailsDiv.classList.add("cart-item-details");
      const titleEl = document.createElement("div");
      titleEl.classList.add("cart-item-title");
      titleEl.textContent = item.title;
      const brandEl = document.createElement("div");
      brandEl.classList.add("cart-item-brand");
      brandEl.textContent = `Brand: ${item.brand || "N/A"}`;
      const colorEl = document.createElement("div");
      colorEl.classList.add("cart-item-color");
      colorEl.textContent = `Color: ${item.selected_color}`;
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

      // Actions.
      const actionsDiv = document.createElement("div");
      actionsDiv.classList.add("cart-item-actions");

      // Quantity controls.
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
          updateCartItem(item);
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
        updateCartItem(item);
      });
      const plusBtn = document.createElement("button");
      plusBtn.classList.add("qty-btn");
      plusBtn.textContent = "+";
      plusBtn.addEventListener("click", () => {
        item.quantity++;
        qtyInput.value = item.quantity;
        recalcCart();
        updateCartItem(item);
      });
      qtyDiv.appendChild(minusBtn);
      qtyDiv.appendChild(qtyInput);
      qtyDiv.appendChild(plusBtn);

      // Icons: Wishlist and Remove.
      const iconsDiv = document.createElement("div");
      iconsDiv.classList.add("action-icons");
      const heartIcon = document.createElement("i");
      heartIcon.classList.add("fas", "fa-heart");
      heartIcon.addEventListener("click", () => {
        // Call wishlist endpoint.
        fetch(`/add_to_wishlist/${item._id}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `selected_color=${encodeURIComponent(item.selected_color)}`,
        })
          .then((response) => response.json())
          .then((data) => {
            showToast(data.message, data.success ? "success" : "error");
          })
          .catch((err) => {
            console.error(err);
            showToast("Error adding to wishlist.", "error");
          });
      });
      const trashIcon = document.createElement("i");
      trashIcon.classList.add("fas", "fa-trash");
      trashIcon.addEventListener("click", () => {
        // Use a styled confirmation modal instead of the default confirm dialog.
        styledConfirm("Are you sure you want to delete this item?", () => {
          deleteCartItem(item);
        });
      });
      iconsDiv.appendChild(heartIcon);
      iconsDiv.appendChild(trashIcon);

      actionsDiv.appendChild(qtyDiv);
      actionsDiv.appendChild(iconsDiv);

      row.appendChild(checkbox);
      row.appendChild(imgDiv);
      row.appendChild(detailsDiv);
      row.appendChild(actionsDiv);

      productCartContainer.appendChild(row);
    });
  }

  // Recalculate cart totals.
  function recalcCart() {
    let subTotal = 0;
    let itemCount = 0;
    cartItems.forEach(item => {
      if (item.selected) {
        subTotal += item.discountPrice * item.quantity;
        itemCount += item.quantity;
      }
    });
    let shipping = itemCount * SHIPPING_FEE_DEFAULT;
    let total = subTotal + shipping;
    subTotalEl.textContent = subTotal.toFixed(2);
    shippingFeeEl.textContent = shipping.toFixed(2);
    grandTotalEl.textContent = total.toFixed(2);
    itemCountEl.textContent = itemCount;
    proceedCheckoutBtn.textContent = `PROCEED TO CHECKOUT(${itemCount})`;
    proceedCountEl.textContent = itemCount;
  }

  // Update a single cart item via endpoint.
  function updateCartItem(item) {
    fetch("/update_cart_item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_email: window.cartData.user_email,
        product_id: item._id,
        selected_color: item.selected_color,
        quantity: item.quantity,
      }),
    })
      .then(response => response.json())
      .then(data => {
        console.log("Cart item updated:", data);
      })
      .catch(err => console.error("Error updating cart item:", err));
  }

  // Delete a single cart item via endpoint.
  function deleteCartItem(item) {
    fetch("/delete_cart_item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_email: window.cartData.user_email,
        product_id: item._id,
        selected_color: item.selected_color,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          cartItems = cartItems.filter(i =>
            i._id !== item._id || i.selected_color !== item.selected_color
          );
          renderCartItems();
          recalcCart();
        }
        showToast(data.message, data.success ? "success" : "error");
      })
      .catch(err => {
        console.error(err);
        showToast("Error removing cart item.", "error");
      });
  }

  // Bulk: Delete Selected Items.
  deleteSelectedBtn.addEventListener("click", () => {
    const itemsToRemove = cartItems.filter(item => item.selected);
    if (itemsToRemove.length === 0) {
      showToast("No items selected.", "error");
      return;
    }
    styledConfirm("Are you sure you want to delete SELECTED items?", () => {
      fetch("/delete_cart_selected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: window.cartData.user_email,
          items: itemsToRemove.map(item => ({
            product_id: item._id,
            selected_color: item.selected_color,
          })),
        }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            cartItems = cartItems.filter(item => !item.selected);
            renderCartItems();
            recalcCart();
          }
          showToast(data.message, data.success ? "success" : "error");
        })
        .catch(err => {
          console.error(err);
          showToast("Error deleting selected items.", "error");
        });
    });
  });

  // Bulk: Delete All Items.
  deleteAllBtn.addEventListener("click", () => {
    styledConfirm("Are you sure you want to delete ALL items?", () => {
      fetch("/delete_cart_all", { method: "POST" })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            cartItems = [];
            renderCartItems();
            recalcCart();
          }
          showToast(data.message, data.success ? "success" : "error");
        })
        .catch(err => {
          console.error(err);
          showToast("Error deleting all items.", "error");
        });
    });
  });

  // Bulk: Select All.
  selectAllBtn.addEventListener("click", () => {
    cartItems.forEach(item => (item.selected = true));
    renderCartItems();
    recalcCart();
    updateCartInDB();
  });

  // Update the entire cart in the database.
  function updateCartInDB() {
    fetch("/update_cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: cartItems, user_email: window.cartData.user_email })
    })
      .then(response => response.json())
      .then(data => {
        console.log("Cart updated:", data);
      })
      .catch(err => console.error("Error updating cart:", err));
  }

  // Coupon Code (placeholder).
  applyCouponBtn.addEventListener("click", () => {
    const code = couponInput.value.trim();
    if (!code) {
      showToast("Please enter a coupon code.", "error");
      return;
    }
    // Implement coupon logic here.
    showToast(`Applying coupon: ${code} (placeholder)`, "info");
  });

  // Proceed to Checkout: Only include selected items.
  proceedCheckoutBtn.addEventListener("click", () => {
    const selectedItems = cartItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      showToast("Please select at least one item to proceed to checkout.", "error");
      return;
    }
    updateCartInDB();
    // Pass selected items as a query parameter.
    const selectedParam = encodeURIComponent(JSON.stringify(selectedItems));
    window.location.href = "/del_info_promo_page?selected_ids=" + selectedParam;
  });

  // Initial render.
  renderCartItems();
  recalcCart();

  /************ Elegant Toast Notification Function ************/
  function showToast(message, type) {
    // Ensure a toast container exists.
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
    // Create toast element.
    const toast = document.createElement("div");
    toast.className = "custom-toast " + type;
    toast.textContent = message;
    // Instead of inline styles, use CSS classes.
    container.appendChild(toast);
    // Trigger CSS animation (assumes you have defined .fade-in and .fade-out in your CSS).
    toast.classList.add("fade-in");
    // Remove after 3 seconds.
    setTimeout(() => {
      toast.classList.remove("fade-in");
      toast.classList.add("fade-out");
      toast.addEventListener("animationend", () => {
        toast.remove();
      });
    }, 3000);
  }

  /************ Styled Confirmation Dialog ************/
  function styledConfirm(message, callback) {
    // Create overlay.
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    // Create dialog.
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
    // Event listeners.
    dialog.querySelector(".yes-btn").addEventListener("click", () => {
      callback();
      overlay.remove();
    });
    dialog.querySelector(".no-btn").addEventListener("click", () => {
      overlay.remove();
    });
  }
});
