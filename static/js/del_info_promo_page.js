document.addEventListener("DOMContentLoaded", () => {
  // --- Effective Delivery Button Toggle ---
  const labelButtons = document.querySelectorAll(".label-btn");
  const effectiveDeliveryInput = document.getElementById("effective_delivery");
  // Pre-select saved label if exists
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
        if (data.success) {
          showToast(data.message, "success");
        } else {
          showToast(data.message, "error");
        }
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
        showToast("Please enter a coupon code.", "error");
        return;
      }
      const formData = new FormData();
      formData.append("couponCode", couponCode);
      // Include product_id if applicable
      const couponProductId = document.getElementById("couponProductId");
      if (couponProductId && couponProductId.value) {
        formData.append("product_id", couponProductId.value);
      }
      fetch("/apply_coupon", {
        method: "POST",
        body: formData,
      })
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
  
  // --- Real-Time Order Summary Updates on Quantity Change ---
  const quantityInputs = document.querySelectorAll(
    "input[name='productQuantity']"
  );

  quantityInputs.forEach((input) => {
    input.addEventListener("change", updateOrderSummary);
  });

  function updateOrderSummary() {
    let totalQuantity = 0; // Total quantity of all products
    let itemTotal = 0; // Total cost of all items

    // Loop through each input to calculate total quantity and item total
    quantityInputs.forEach((input) => {
      const qty = parseInt(input.value) || 0; // Parse quantity
      totalQuantity += qty; // Add to total quantity
      const price = parseFloat(input.getAttribute("data-price")) || 0; // Parse price
      itemTotal += qty * price; // Add to item total
    });

    // Update quantity and item total in the UI
    const itemQuantityEl = document.getElementById("itemQuantity");
    const itemCostEl = document.getElementById("itemCost");
    const grandTotalEl = document.getElementById("grandTotal");

    if (itemQuantityEl) itemQuantityEl.textContent = totalQuantity;
    if (itemCostEl) itemCostEl.textContent = itemTotal.toFixed(2);

    // Fetch delivery fee per unit
    const deliveryFeePerUnit =
      parseFloat(document.getElementById("deliveryFee").textContent) || 0;

    // Calculate total delivery fee based on total quantity
    const totalDeliveryFee = deliveryFeePerUnit * totalQuantity;

    // Calculate grand total
    const grandTotal = itemTotal + totalDeliveryFee;

    // Update grand total in the UI
    if (grandTotalEl) grandTotalEl.textContent = grandTotal.toFixed(2);
  }

  updateOrderSummary(); // initial call

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
    let valid = true;
    requiredFields.forEach((id) => {
      const field = document.getElementById(id);
      if (!field.value.trim()) {
        valid = false;
      }
    });
    if (!valid) {
      showToast(
        "Please fill in all required delivery fields before proceeding.",
        "error"
      );
      return;
    }

    // Gather order summary data from the page
    const order_summary = {
      quantity:
        parseInt(document.getElementById("itemQuantity").textContent) || 0,
      item_total:
        parseFloat(document.getElementById("itemCost").textContent) || 0,
      delivery_fee:
        parseFloat(document.getElementById("deliveryFee").textContent) || 0,
      grand_total:
        parseFloat(document.getElementById("grandTotal").textContent) || 0,
    };

    // Get the current contact email (editable field)
    const user_email = document.getElementById("userEmail").value.trim();

    // Send order summary and user email to backend to store in session
    fetch("/redirect_to_pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_summary: order_summary,
        user_email: user_email,
      }),
    })
      .then((response) => response.json())
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

  // --- Toast Notification Function ---
  function showToast(message, type = "success") {
    let toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toastContainer";
      toastContainer.style.position = "fixed";
      toastContainer.style.top = "20px";
      toastContainer.style.right = "20px";
      toastContainer.style.zIndex = "10000";
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
});
