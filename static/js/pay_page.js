document.addEventListener("DOMContentLoaded", () => {
  // Payment method elements
  const methodElems = document.querySelectorAll(".sk-pay-method");
  const infoContainer = document.getElementById("skPayInfoContainer");
  const confirmOrderBtn = document.getElementById("skPayConfirmOrder");

  // Order summary elements
  const paySubtotalEl = document.getElementById("skPaySubtotal");
  const payCODFeeEl = document.getElementById("skPayCODFee");
  const payTotalEl = document.getElementById("skPayTotal");

  // Hardcoded for demo
  let subTotal = 750; // e.g., item total + shipping
  let isCODSelected = false;
  let codFee = 0; // dynamic if COD is chosen

  // Render initial summary
  recalcSummary();

  // Payment method selection
  methodElems.forEach((elem) => {
    elem.addEventListener("click", () => {
      // Remove active from all
      methodElems.forEach((m) => m.classList.remove("active"));

      // Add active to the clicked one
      elem.classList.add("active");
      const method = elem.getAttribute("data-method");
      // Update the info container
      renderPaymentInfo(method);
    });
  });

  // Renders dynamic info in the orange-border container
  function renderPaymentInfo(method) {
    infoContainer.innerHTML = ""; // Clear old content
    switch (method) {
      case "easypaisa":
        isCODSelected = false;
        infoContainer.innerHTML = `
            <h4>EasyPaisa Payment</h4>
            <p>Please enter your EasyPaisa account details below:</p>
            <label>EasyPaisa Number</label>
            <input type="text" class="sk-pay-input" placeholder="e.g. 03xx-xxxxxxx" />
            <label>Account PIN</label>
            <input type="password" class="sk-pay-input" placeholder="******" />
            <p style="margin-top:10px; font-size:12px; color:#555;">
              We will redirect you to confirm the transaction via EasyPaisa.
            </p>
          `;
        break;
      case "jazzcash":
        isCODSelected = false;
        infoContainer.innerHTML = `
            <h4>JazzCash Payment</h4>
            <p>Please enter your JazzCash account details below:</p>
            <label>JazzCash Number</label>
            <input type="text" class="sk-pay-input" placeholder="e.g. 03xx-xxxxxxx" />
            <label>Account PIN</label>
            <input type="password" class="sk-pay-input" placeholder="******" />
            <p style="margin-top:10px; font-size:12px; color:#555;">
              You will be asked to confirm the payment on your JazzCash app.
            </p>
          `;
        break;
      case "card":
        isCODSelected = false;
        infoContainer.innerHTML = `
            <h4>Credit/Debit Card</h4>
            <p>Please enter your card details below:</p>
            <label>Card Number</label>
            <input type="text" class="sk-pay-input" placeholder="XXXX-XXXX-XXXX-XXXX" />
            <label>Expiry Date</label>
            <input type="text" class="sk-pay-input" placeholder="MM/YY" />
            <label>CVV</label>
            <input type="password" class="sk-pay-input" placeholder="***" />
            <p style="margin-top:10px; font-size:12px; color:#555;">
              We will securely process your card information.
            </p>
          `;
        break;
      case "hbl":
        isCODSelected = false;
        infoContainer.innerHTML = `
            <h4>HBL Bank Account</h4>
            <p>Please enter your HBL account details below:</p>
            <label>Account Title</label>
            <input type="text" class="sk-pay-input" placeholder="Your account title" />
            <label>Account Number</label>
            <input type="text" class="sk-pay-input" placeholder="e.g. 1234-5678-..." />
            <p style="margin-top:10px; font-size:12px; color:#555;">
              We will initiate a direct bank transfer from your HBL account.
            </p>
          `;
        break;
      case "cod":
        isCODSelected = true;
        infoContainer.innerHTML = `
            <h4>Cash on Delivery</h4>
            <p>- You may pay in cash to our courier upon receiving your parcel at the doorstep.</p>
            <p>- Cash Payment Fee of Rs. 50 applies only to Cash on Delivery payment method.</p>
            <p style="margin-top:10px; font-size:12px; color:#555;">
              There is no extra fee when using other payment methods.
            </p>
          `;
        break;
      default:
        infoContainer.innerHTML = `<p class="sk-pay-info-placeholder">Please select a payment method above to see details...</p>`;
    }
    recalcSummary(); // Recalculate totals if COD is selected
  }

  // Recalc Summary
  function recalcSummary() {
    if (isCODSelected) {
      codFee = 50;
    } else {
      codFee = 0;
    }
    // Subtotal is hardcoded for demo
    paySubtotalEl.textContent = subTotal;
    payCODFeeEl.textContent = codFee;
    payTotalEl.textContent = subTotal + codFee;
  }

  // Confirm Order
  confirmOrderBtn.addEventListener("click", () => {
    if (!document.querySelector(".sk-pay-method.active")) {
      alert("Please select a payment method first.");
      return;
    }
    alert("Order confirmed (placeholder).");
  });
});
