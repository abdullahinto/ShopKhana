document.addEventListener("DOMContentLoaded", () => {
  // --- Effective Delivery Button Toggle ---
  const labelButtons = document.querySelectorAll(".label-btn");
  const effectiveDeliveryInput = document.getElementById("effective_delivery");
  if (effectiveDeliveryInput.value) {
    labelButtons.forEach((btn) => {
      if (btn.getAttribute("data-label") === effectiveDeliveryInput.value) {
        btn.classList.add("active");
      }
    });
  }
  labelButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      labelButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      effectiveDeliveryInput.value = btn.getAttribute("data-label");
    });
  });

  // --- Delivery Form AJAX Update ---
  const deliveryForm = document.getElementById("deliveryForm");
  deliveryForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const formData = new FormData(deliveryForm);
    fetch("/update_delivery_info", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        showToast(data.message, data.success ? "success" : "error");
      })
      .catch((err) => {
        console.error(err);
        showToast("Error updating delivery information.", "error");
      });
  });

  // --- Edit Invoice Email ---
  const editEmailLink = document.getElementById("editEmailLink");
  const userEmailInput = document.getElementById("userEmail");
  if (editEmailLink && userEmailInput) {
    editEmailLink.addEventListener("click", () => {
      userEmailInput.readOnly = false;
      userEmailInput.focus();
    });
  }

  // --- Coupon Application ---
  const applyCouponBtn = document.getElementById("applyCoupon");
  const couponCodeInput = document.getElementById("couponCode");
  const itemCostEl = document.getElementById("itemCost");
  const grandTotalEl = document.getElementById("grandTotal");
  if (applyCouponBtn) {
    applyCouponBtn.addEventListener("click", () => {
      const couponCode = couponCodeInput.value.trim();
      if (!couponCode) {
        return showToast("Please enter a coupon code.", "error");
      }
      const formData = new FormData();
      formData.append("couponCode", couponCode);
      const couponProductId = document.getElementById("couponProductId");
      if (couponProductId && couponProductId.value) {
        formData.append("product_id", couponProductId.value);
      }
      fetch("/apply_coupon", { method: "POST", body: formData })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            showToast(data.message, "success");
            itemCostEl.textContent = data.new_total.toFixed(2);
            grandTotalEl.textContent = data.new_total.toFixed(2);
          } else {
            showToast(data.message, "error");
          }
        })
        .catch((err) => {
          console.error(err);
          showToast("Error applying coupon.", "error");
        });
    });
  }

  // --- Order Summary Calculation ---
  const quantityInputs = document.querySelectorAll(
    "input[name='productQuantity']"
  );
  quantityInputs.forEach((input) => {
    input.addEventListener("change", updateOrderSummary);
  });

  function updateOrderSummary() {
    let totalQuantity = 0;
    let itemTotal = 0;
    quantityInputs.forEach((input) => {
      const qty = parseInt(input.value, 10) || 0;
      totalQuantity += qty;
      const price = parseFloat(input.getAttribute("data-price")) || 0;
      itemTotal += qty * price;
    });

    const itemQuantityEl = document.getElementById("itemQuantity");
    const itemCostEl = document.getElementById("itemCost");
    const grandTotalEl = document.getElementById("grandTotal");
    if (itemQuantityEl) itemQuantityEl.textContent = totalQuantity;
    if (itemCostEl) itemCostEl.textContent = itemTotal.toFixed(2);

    const deliveryFeePerUnit =
      parseFloat(document.getElementById("deliveryFee").textContent) || 0;
    const totalDeliveryFee = deliveryFeePerUnit * totalQuantity;
    const grandTotal = itemTotal + totalDeliveryFee;
    if (grandTotalEl) grandTotalEl.textContent = grandTotal.toFixed(2);
  }

  updateOrderSummary();
  function getSelectedProducts() {
    const selectedProducts = [];
    document.querySelectorAll(".package-body").forEach((container) => {
      const prodIdElem = container.querySelector(".productId");
      const titleElem = container.querySelector(".product-title");
      const colorElem = container.querySelector(".selected-color");
      const qtyElem = container.querySelector(".product-quantity"); // FIXED

      const prodId = prodIdElem ? prodIdElem.value : null;
      const title = titleElem ? titleElem.textContent.trim() : "N/A";
      const selectedColor = colorElem ? colorElem.value : "N/A";
      const quantity = qtyElem ? parseInt(qtyElem.value, 10) || 1 : 1;

      if (prodId) {
        selectedProducts.push({
          _id: prodId,
          title: title,
          selected_color: selectedColor,
          quantity: quantity,
        });
      }
    });
    return selectedProducts;
  }

  // --- Proceed to Payment ---
  const proceedPayBtn = document.getElementById("proceedPay");
  proceedPayBtn.addEventListener("click", () => {
    // Validate required delivery fields
    const requiredFields = [
      "fullName",
      "phoneNumber",
      "building",
      "colony",
      "province",
      "city",
      "area",
      "address",
    ];
    const allFilled = requiredFields.every((id) => {
      const fld = document.getElementById(id);
      return fld && fld.value.trim();
    });
    if (!allFilled) {
      return showToast(
        "Please fill in all required delivery fields before proceeding.",
        "error"
      );
    }

    // Build order_summary
    const order_summary = {
      quantity:
        parseInt(document.getElementById("itemQuantity").textContent, 10) || 0,
      item_total:
        parseFloat(document.getElementById("itemCost").textContent) || 0,
      delivery_fee:
        parseFloat(document.getElementById("deliveryFee").textContent) || 0,
      grand_total:
        parseFloat(document.getElementById("grandTotal").textContent) || 0,
    };

    // Collect user email
    const user_email = document.getElementById("userEmail").value.trim();

    // Collect selected products
    const selected_ids = getSelectedProducts();
    console.log("Proceeding with selected products:", selected_ids);

    // Send to backend
    fetch("/redirect_to_pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_summary: order_summary,
        user_email: user_email,
        selected_ids: selected_ids,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          window.location.href = data.redirect_url;
        } else {
          showToast("Error saving order summary.", "error");
        }
      })
      .catch((err) => {
        console.error(err);
        showToast("Error proceeding to payment.", "error");
      });
  });

  // --- Toast Notification ---
  function showToast(message, type = "success") {
    let tc = document.getElementById("toastContainer");
    if (!tc) {
      tc = document.createElement("div");
      tc.id = "toastContainer";
      tc.style.position = "fixed";
      tc.style.top = "20px";
      tc.style.right = "20px";
      tc.style.zIndex = "10000";
      document.body.appendChild(tc);
    }
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.backgroundColor = type === "success" ? "#4CAF50" : "#f44336";
    toast.style.color = "#fff";
    toast.style.padding = "10px 20px";
    toast.style.marginBottom = "10px";
    toast.style.borderRadius = "4px";
    toast.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
    tc.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = "opacity 0.5s";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }
});
