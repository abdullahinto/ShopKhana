document.addEventListener("DOMContentLoaded", () => {
  /* ----- Tabs Navigation ----- */
  const tabs = document.querySelectorAll("#accountTabs li");
  const tabContents = document.querySelectorAll(".tab-content");
  const tabsDropdown = document.querySelector("#accountTabsDropdown select");

  function activateTab(target) {
    // Deactivate all tabs and contents
    tabs.forEach(t => t.classList.remove("active"));
    tabContents.forEach(content => content.classList.remove("active"));

    // Activate the selected tab and content
    const activeTab = document.querySelector(`#accountTabs li[data-tab="${target}"]`);
    if (activeTab) activeTab.classList.add("active");

    const activeContent = document.getElementById(target);
    if (activeContent) activeContent.classList.add("active");

    // Sync dropdown
    tabsDropdown.value = target;
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => activateTab(tab.getAttribute("data-tab")));
  });

  tabsDropdown.addEventListener("change", (e) => activateTab(e.target.value));

  /* ----- Accordion for Preferences ----- */
  document.querySelectorAll(".accordion-header").forEach(header => {
    header.addEventListener("click", () => {
      const parent = header.parentElement;
      const content = parent.querySelector(".accordion-content");
      const toggleIcon = header.querySelector(".accordion-toggle i");

      // Toggle active class for smooth open/close
      parent.classList.toggle("active");
      content.style.maxHeight = parent.classList.contains("active")
        ? `${content.scrollHeight}px`
        : null;

      // Rotate icon
      toggleIcon.classList.toggle("fa-rotate-90");
    });
  });

  /* ----- Live Validation for Forms ----- */
  const validateField = (input) => {
    const errorSpan = input.nextElementSibling;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (input.name === "accountEmail") {
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
  };

  document.getElementById("profileForm").addEventListener("input", (e) => {
    validateField(e.target);
  });

  /* ----- 2FA Toggle Display ----- */
  const enable2FA = document.getElementById("enable2FA");
  const twoFADiv = document.getElementById("twoFADiv");

  enable2FA.addEventListener("change", () => {
    twoFADiv.style.display = enable2FA.checked ? "block" : "none";
  });

  /* ----- Save Changes Button Animations ----- */
  const simulateSave = (saveBtn, saveMsgId) => {
    saveBtn.disabled = true;
    const saveMsg = document.getElementById(saveMsgId);

    saveMsg.textContent = "Saving...";
    saveMsg.style.display = "inline-block";

    setTimeout(() => {
      saveMsg.textContent = "Changes Saved!";
      setTimeout(() => {
        saveMsg.style.display = "none";
        saveBtn.disabled = false;
      }, 2000);
    }, 1500);
  };

  const saveButtons = [
    { btn: "saveProfileBtn", msg: "profileSaveMsg" },
    { btn: "saveSecurityBtn", msg: "securitySaveMsg" },
    { btn: "saveAddressBtn", msg: "addressSaveMsg" },
    { btn: "savePaymentBtn", msg: "paymentSaveMsg" },
    { btn: "saveCommPrefBtn", msg: "commPrefSaveMsg" },
    { btn: "savePrivacyBtn", msg: "privacySaveMsg" },
  ];

  saveButtons.forEach(({ btn, msg }) => {
    document.getElementById(btn).addEventListener("click", () => {
      simulateSave(document.getElementById(btn), msg);
    });
  });
});