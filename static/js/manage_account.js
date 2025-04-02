document.addEventListener("DOMContentLoaded", () => {
  /* ----- Tabs Navigation ----- */
  const tabs = document.querySelectorAll("#accountTabs li");
  const tabContents = document.querySelectorAll(".tab-content");
  const tabsDropdown = document.querySelector("#accountTabsDropdown select");

  function activateTab(target) {
    // Deactivate all tabs and content.
    tabs.forEach((t) => t.classList.remove("active"));
    tabContents.forEach((content) => content.classList.remove("active"));

    // Activate the selected tab and content.
    const activeTab = document.querySelector(
      `#accountTabs li[data-tab="${target}"]`
    );
    if (activeTab) activeTab.classList.add("active");

    const activeContent = document.getElementById(target);
    if (activeContent) activeContent.classList.add("active");

    // Sync dropdown.
    tabsDropdown.value = target;
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () =>
      activateTab(tab.getAttribute("data-tab"))
    );
  });
  tabsDropdown.addEventListener("change", (e) => activateTab(e.target.value));

  /* ----- Live Validation for Profile Form ----- */
  const profileForm = document.getElementById("profileForm");
  profileForm.addEventListener("input", (e) => {
    const input = e.target;
    const errorSpan = input.nextElementSibling;
    if (input.name === "accountEmail") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.value)) {
        errorSpan.textContent = "Please enter a valid email.";
        errorSpan.style.display = "block";
      } else {
        errorSpan.textContent = "";
        errorSpan.style.display = "none";
      }
    } else {
      if (input.value.trim() === "") {
        errorSpan.textContent = "This field cannot be empty.";
        errorSpan.style.display = "block";
      } else {
        errorSpan.textContent = "";
        errorSpan.style.display = "none";
      }
    }
  });

  /* ----- Save Changes AJAX Functions ----- */
  function simulateSave(endpoint, formData, saveMsgElem, saveBtn) {
    saveBtn.disabled = true;
    saveMsgElem.textContent = "Saving...";
    saveMsgElem.style.display = "inline-block";

    fetch(endpoint, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          showToast(data.message, "success");
          saveMsgElem.textContent = "Changes Saved!";
        } else {
          showToast(data.message, "error");
          saveMsgElem.textContent = "Error saving changes.";
        }
        setTimeout(() => {
          saveMsgElem.style.display = "none";
          saveBtn.disabled = false;
        }, 2000);
      })
      .catch((err) => {
        console.error(err);
        showToast("Error processing request.", "error");
        saveMsgElem.style.display = "none";
        saveBtn.disabled = false;
      });
  }

  // Profile Save.
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const profileSaveMsg = document.getElementById("profileSaveMsg");
  saveProfileBtn.addEventListener("click", () => {
    const formData = new FormData(profileForm);
    simulateSave("/update_profile", formData, profileSaveMsg, saveProfileBtn);
  });

  // Security Save.
  const saveSecurityBtn = document.getElementById("saveSecurityBtn");
  const securitySaveMsg = document.getElementById("securitySaveMsg");
  const securityForm = document.getElementById("securityForm");
  saveSecurityBtn.addEventListener("click", () => {
    const formData = new FormData(securityForm);
    simulateSave(
      "/update_security",
      formData,
      securitySaveMsg,
      saveSecurityBtn
    );
  });

  // Address Save.
  const saveAddressBtn = document.getElementById("saveAddressBtn");
  const addressSaveMsg = document.getElementById("addressSaveMsg");
  const addressForm = document.getElementById("addressForm");
  saveAddressBtn.addEventListener("click", () => {
    const formData = new FormData(addressForm);
    simulateSave("/update_address", formData, addressSaveMsg, saveAddressBtn);
  });

  /* ----- 2FA Toggle (if applicable) ----- */
  // Example: If you have a 2FA toggle element.
  const enable2FA = document.getElementById("enable2FA");
  const twoFADiv = document.getElementById("twoFADiv");
  if (enable2FA && twoFADiv) {
    enable2FA.addEventListener("change", () => {
      twoFADiv.style.display = enable2FA.checked ? "block" : "none";
    });
  }

  /* ----- Elegant Toast Notification Function ----- */
  function showToast(message, type) {
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
    const toast = document.createElement("div");
    toast.className = "custom-toast " + type;
    toast.textContent = message;
    container.appendChild(toast);
    toast.classList.add("fade-in");
    setTimeout(() => {
      toast.classList.remove("fade-in");
      toast.classList.add("fade-out");
      toast.addEventListener("animationend", () => {
        toast.remove();
      });
    }, 3000);
  }
});
