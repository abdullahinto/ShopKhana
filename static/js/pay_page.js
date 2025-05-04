document.addEventListener("DOMContentLoaded", () => {
  // Global flag to track if digital payment has been verified.
  window.paymentVerified = false;

  console.log("Order Summary:", window.orderSummary);
  console.log("COD Fee:", window.codfee);

  // Populate Order Summary.
  if (window.orderSummary) {
    const grandTotal = window.orderSummary.grand_total || 0;
    document.getElementById("skPaySubtotal").textContent = grandTotal;
    document.getElementById("skPayCODFee").textContent = 0;
    document.getElementById("skPayTotal").textContent = grandTotal;
  }

  const infoContainer = document.getElementById("skPayInfoContainer");

  // Disable EasyPaisa.
  const easyPaisa = document.querySelector("[data-method='easypaisa']");
  if (easyPaisa) {
    easyPaisa.style.pointerEvents = "none";
    easyPaisa.style.opacity = "0.5";
  }

  // Payment method selection.
  document.querySelectorAll(".sk-pay-method").forEach((elem) => {
    elem.addEventListener("click", () => {
      document
        .querySelectorAll(".sk-pay-method")
        .forEach((m) => m.classList.remove("active"));
      elem.classList.add("active");
      window.paymentVerified = false;
      const method = elem.getAttribute("data-method");
      renderPaymentInfo(method);

      if (method === "cod") {
        const quantity = window.orderSummary.quantity || 1;
        const codTotal = window.codfee * quantity;
        document.getElementById("skPayCODFee").textContent = codTotal;
        const total = parseFloat(window.orderSummary.grand_total) + codTotal;
        document.getElementById("skPayTotal").textContent = total;
      } else {
        document.getElementById("skPayCODFee").textContent = 0;
        document.getElementById("skPayTotal").textContent =
          window.orderSummary.grand_total;
      }
    });
  });

  function renderPaymentInfo(method) {
    infoContainer.innerHTML = "";
    if (method === "jazzcash" || method === "sadapay" || method === "nayapay") {
      let title = method.charAt(0).toUpperCase() + method.slice(1);
      let accountInfo = `
        <p><b>Account Title: Muhammad Akasha</b></p>
        <p><b>Account Number: 03045696547</b></p>
        <p>Please make the payment and upload a screenshot for verification.</p>
        <input type="file" id="paymentScreenshot" accept="image/*" />
        <button id="uploadScreenshot">Upload & Verify</button>
        <p id="paymentStatus" style="color: red;"></p>
      `;
      infoContainer.innerHTML = `<h4>${title} Payment</h4>` + accountInfo;
      document
        .getElementById("uploadScreenshot")
        .addEventListener("click", processPayment);
    } else if (method === "direct_bank") {
      infoContainer.innerHTML = `
        <h4>Direct Bank Transfer</h4>
        <select id="bankSelection">
          <option value="">-- Select Bank --</option>
          <option value="ubl">UBL Bank</option>
          <option value="meezan" disabled style="pointer-events: none; opacity: 0.5;">Meezan Bank</option>
        </select>
        <div id="bankDetailsContainer"></div>
      `;
      document
        .getElementById("bankSelection")
        .addEventListener("change", function () {
          const bank = this.value;
          let detailsHtml = "";
          if (bank === "ubl") {
            detailsHtml = `
            <p><b>Account Title:</b> Muhammad Akasha</p>
            <p><b>Account No:</b> 0560313944004</p>
            <p><b>IBAN:</b> PK27UNIL0109000313944004</p>
            <p>Please transfer the amount and upload the screenshot for verification.</p>
            <input type="file" id="paymentScreenshot" accept="image/*" />
            <button id="uploadScreenshot">Upload & Verify</button>
            <p id="paymentStatus" style="color: red;"></p>
          `;
          } else if (bank === "meezan") {
            detailsHtml = `
            <p><b>Account Title:</b> MUHAMMAD AKASHA</p>
            <p><b>Account Number:</b> 02520107240994</p>
            <p><b>IBAN:</b> PK47MEZN0002520107240994</p>
            <p>Please transfer the amount and upload the screenshot for verification.</p>
            <input type="file" id="paymentScreenshot" accept="image/*" />
            <button id="uploadScreenshot">Upload & Verify</button>
            <p id="paymentStatus" style="color: red;"></p>
          `;
          }
          document.getElementById("bankDetailsContainer").innerHTML =
            detailsHtml;
          if (document.getElementById("uploadScreenshot")) {
            document
              .getElementById("uploadScreenshot")
              .addEventListener("click", processPayment);
          }
        });
    } else if (method === "hbl") {
      infoContainer.innerHTML = `<p>Hold on buddy, we're just coming soon!🔥</p>`;
    } else if (method === "cod") {
      infoContainer.innerHTML = `
        <h4>Cash on Delivery (COD)</h4>
        <p>- You may pay in cash to our courier upon receiving your parcel at the doorstep.</p>
        <p>- Before receiving, confirm that the bill shows that the parcel is from ShopKhana.</p>
        <p>- Before you make payment to the courier, confirm your order number, sender information and tracking number on the parcel.</p>
        <p>- Cash Payment Fee of <strong>Rs. ${window.codfee}</strong> applies only to COD.</p>
        <p style="color: grey; font-style: italic; margin-top: 10px;">*There is no additional fee except the cash payment fee.</p>
      `;
    } else {
      infoContainer.innerHTML = `<p>Hold on buddy, we're just coming soon!</p>`;
    }
  }

  // Function to process payment for digital methods.
  function processPayment() {
    const fileInput = document.getElementById("paymentScreenshot");
    const paymentStatus = document.getElementById("paymentStatus");
    const selectedMethodElem = document.querySelector(".sk-pay-method.active");

    if (!selectedMethodElem) {
      paymentStatus.textContent = "No payment method selected.";
      return;
    }
    const selectedMethod = selectedMethodElem.getAttribute("data-method");

    if (!fileInput || !fileInput.files.length) {
      paymentStatus.textContent = "Please select an image!";
      return;
    }

    const formData = new FormData();
    formData.append("payment_screenshot", fileInput.files[0]);
    formData.append("payment_method", selectedMethod);

    if (selectedMethod === "direct_bank") {
      const bankSelection = document.getElementById("bankSelection").value;
      formData.append("bank_selection", bankSelection);
    }

    infoContainer.innerHTML = `
      <h4>Verifying Payment...</h4>
      <p class="loading-text">Grab a snack, our team is analyzing ur payment.</p>
      <div class="loader"></div>
    `;
    const phrases = [
      "Relax, we're processing your payment...",
      "It may take a while...",
      "Almost there...",
      "Just a moment...",
    ];
    let phraseIndex = 0;
    const textElem = document.querySelector(".loading-text");
    const interval = setInterval(() => {
      textElem.textContent = phrases[phraseIndex];
      phraseIndex = (phraseIndex + 1) % phrases.length;
    }, 2000);

    fetch("/process_payment", { method: "POST", body: formData })
      .then((response) => response.json())
      .then((data) => {
        clearInterval(interval);
        if (data.status === "success") {
          infoContainer.innerHTML = `<h4 style="color: green;">${data.message}</h4>`;
          window.paymentVerified = true;
        } else {
          infoContainer.innerHTML = `<h4 style="color: red;">${data.message}</h4>`;
          window.paymentVerified = false;
        }
      })
      .catch(() => {
        clearInterval(interval);
        infoContainer.innerHTML = `<h4 style="color: red;">Payment verification failed. Try again.</h4>`;
        window.paymentVerified = false;
      });
  }

  // Confirm button: Check if a payment method is chosen and, for digital methods, if screenshot verification was completed.
  const confirmOrderBtn = document.getElementById("skPayConfirmOrder");
  if (confirmOrderBtn) {
    confirmOrderBtn.addEventListener("click", () => {
      const selectedMethodElem = document.querySelector(
        ".sk-pay-method.active"
      );
      if (!selectedMethodElem) {
        showToast(
          "Please select a payment method before confirming your order.",
          "error"
        );
        return;
      }
      const method = selectedMethodElem.getAttribute("data-method");

      // If COD, trigger AJAX call to process payment for COD.
      if (method === "cod") {
        const formData = new FormData();
        formData.append("payment_method", "cod");
        fetch("/process_payment", { method: "POST", body: formData })
          .then((response) => response.json())
          .then((data) => {
            if (data.status === "success") {
              window.paymentVerified = true;
              window.location.href = "/order_placed";
            } else {
              showToast(data.message, "error");
            }
          })
          .catch((err) => {
            console.error(err);
            showToast("Error processing COD payment.", "error");
          });
      } else {
        // For digital payments, require that the screenshot has been verified.
        if (!window.paymentVerified) {
          showToast(
            "Please verify your payment by uploading a screenshot.",
            "error"
          );
          return;
        }
        window.location.href = "/order_placed";
      }
    });
  } else {
    console.error("Confirm Order button (ID: skPayConfirmOrder) not found.");
  }

  // --- Toast Notification Function ---
  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = "custom-toast " + type;
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.right = "20px";
    toast.style.backgroundColor =
      type === "error" ? "#e74c3c" : type === "success" ? "#2ecc71" : "#3498db";
    toast.style.color = "#fff";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "5px";
    toast.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
    toast.style.zIndex = 10000;
    toast.style.opacity = 0;
    toast.style.transition = "opacity 0.5s ease-in-out";
    document.body.appendChild(toast);
    void toast.offsetWidth;
    toast.style.opacity = 1;
    setTimeout(() => {
      toast.style.opacity = 0;
      toast.addEventListener("transitionend", () => {
        toast.remove();
      });
    }, 3000);
  }
});
