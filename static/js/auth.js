document.addEventListener("DOMContentLoaded", () => {
  const authPopup = document.getElementById("authPopup");
  const closeBtn = document.querySelector(".close-btn");
  const loginIcon = document.getElementById("login-icon"); // new reference
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const togglePasswordIcons = document.querySelectorAll(".toggle-password");

  // Open popup on clicking the login icon
  loginIcon.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent the default anchor action
    authPopup.style.display = "flex";
    setTimeout(() => {
      authPopup.classList.add("show");
    }, 10); // Small delay to allow display change before animation
  });

  // Close popup on close button click
  closeBtn.addEventListener("click", () => {
    authPopup.classList.remove("show");
    authPopup.addEventListener(
      "transitionend",
      () => {
        authPopup.style.display = "none";
      },
      { once: true }
    ); // Remove display:none after animation ends
  });

  // Tab switching logic
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Remove active class from all tabs and contents
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));
      // Activate the selected tab and corresponding content
      btn.classList.add("active");
      document
        .getElementById(btn.getAttribute("data-tab"))
        .classList.add("active");
    });
  });

  // Toggle password visibility logic
  togglePasswordIcons.forEach((icon) => {
    icon.addEventListener("click", () => {
      const targetId = icon.getAttribute("data-target");
      const inputField = document.getElementById(targetId);
      if (inputField.type === "password") {
        inputField.type = "text";
        icon.innerHTML = '<i class="fas fa-eye-slash"></i>';
      } else {
        inputField.type = "password";
        icon.innerHTML = '<i class="fas fa-eye"></i>';
      }
    });
  });
});
