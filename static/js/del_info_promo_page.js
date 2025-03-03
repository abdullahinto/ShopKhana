document.addEventListener("DOMContentLoaded", () => {
  /* --- Dynamic Province -> City -> Area Logic --- */
  const locationData = {
    Punjab: {
      Lahore: ["Gulberg", "Model Town", "Johar Town"],
      Faisalabad: ["Clock Tower", "Madina Town", "Peoples Colony"],
    },
    Sindh: {
      Karachi: ["DHA", "Clifton", "Nazimabad"],
      Hyderabad: ["Qasimabad", "Latifabad"],
    },
    KPK: {
      Peshawar: ["Hayatabad", "University Town"],
      Mardan: ["Cantt Area", "Sheikh Maltoon"],
    },
    Balochistan: {
      Quetta: ["Zarghoon Road", "Jinnah Town"],
      Gwadar: ["Marine Drive", "Sanghar Housing"],
    },
  };

  const provinceSelect = document.getElementById("provinceSelect");
  const citySelect = document.getElementById("citySelect");
  const areaSelect = document.getElementById("areaSelect");

  // Populate provinces
  for (let province in locationData) {
    const option = document.createElement("option");
    option.value = province;
    option.textContent = province;
    provinceSelect.appendChild(option);
  }

  provinceSelect.addEventListener("change", () => {
    citySelect.innerHTML = '<option value="">Please choose your city</option>';
    areaSelect.innerHTML = '<option value="">Please choose your area</option>';
    citySelect.disabled = true;
    areaSelect.disabled = true;

    const selectedProvince = provinceSelect.value;
    if (selectedProvince && locationData[selectedProvince]) {
      citySelect.disabled = false;
      const cities = Object.keys(locationData[selectedProvince]);
      cities.forEach((city) => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
      });
    }
  });

  citySelect.addEventListener("change", () => {
    areaSelect.innerHTML = '<option value="">Please choose your area</option>';
    areaSelect.disabled = true;

    const selectedProvince = provinceSelect.value;
    const selectedCity = citySelect.value;
    if (selectedCity && locationData[selectedProvince][selectedCity]) {
      areaSelect.disabled = false;
      const areas = locationData[selectedProvince][selectedCity];
      areas.forEach((a) => {
        const option = document.createElement("option");
        option.value = a;
        option.textContent = a;
        areaSelect.appendChild(option);
      });
    }
  });

  /* --- Label Toggle (Home / Office) --- */
  const homeBtn = document.querySelector(".home-btn");
  const officeBtn = document.querySelector(".office-btn");

  function toggleLabel(selectedBtn, otherBtn) {
    selectedBtn.classList.add("active");
    otherBtn.classList.remove("active");
  }

  homeBtn.addEventListener("click", () => {
    toggleLabel(homeBtn, officeBtn);
  });
  officeBtn.addEventListener("click", () => {
    toggleLabel(officeBtn, homeBtn);
  });

  /* --- Edit Email --- */
  const userEmail = document.getElementById("userEmail");
  const editEmailLink = document.getElementById("editEmailLink");

  editEmailLink.addEventListener("click", () => {
    if (userEmail.readOnly) {
      userEmail.readOnly = false;
      userEmail.focus();
      editEmailLink.textContent = "Save";
    } else {
      userEmail.readOnly = true;
      editEmailLink.textContent = "EDIT";
      // You can add logic to actually save email to backend
    }
  });

  /* --- Apply Coupon (Placeholder) --- */
  const applyCouponBtn = document.getElementById("applyCoupon");
  applyCouponBtn.addEventListener("click", () => {
    const couponVal = document.getElementById("couponCode").value;
    alert(`Applying coupon: ${couponVal} (placeholder)`);
  });

  /* --- Save Delivery Info (Placeholder) --- */
  const deliveryForm = document.getElementById("deliveryForm");
  deliveryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Delivery info saved (placeholder).");
  });

  /* --- Proceed to Pay (Placeholder) --- */
  const proceedPayBtn = document.getElementById("proceedPay");
  proceedPayBtn.addEventListener("click", () => {
    alert("Proceeding to payment (placeholder).");
  });
});
