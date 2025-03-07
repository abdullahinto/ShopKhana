document.addEventListener("DOMContentLoaded", () => {
  const authPopup = document.getElementById("authPopup");
  const closeBtn = document.querySelector(".close-btn");
  const loginIcon = document.getElementById("login-icon");
  const dropdownMenu = document.getElementById("dropdown-menu");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const togglePasswordIcons = document.querySelectorAll(".toggle-password");

  // Profile Icon behavior (already implemented)
  loginIcon.addEventListener("click", (e) => {
    e.preventDefault();
    if (userAuthenticated === "true") {
      dropdownMenu.style.display =
        dropdownMenu.style.display === "block" ? "none" : "block";
    } else {
      if (dropdownMenu) dropdownMenu.style.display = "none";
      authPopup.style.display = "flex";
      setTimeout(() => {
        authPopup.classList.add("show");
      }, 10);
    }
  });

  // Close auth popup
  closeBtn.addEventListener("click", () => {
    authPopup.classList.remove("show");
    authPopup.addEventListener(
      "transitionend",
      () => {
        authPopup.style.display = "none";
      },
      { once: true }
    );
  });

  // Tab switching logic
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));
      btn.classList.add("active");
      document
        .getElementById(btn.getAttribute("data-tab"))
        .classList.add("active");
    });
  });

  // Toggle password visibility
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

  // Automatically fade out flash messages
  setTimeout(() => {
    const flashes = document.querySelectorAll("#flash-messages .flash-message");
    flashes.forEach((msg) => {
      msg.style.opacity = 0;
      setTimeout(() => msg.remove(), 500);
    });
  }, 3000);

  // Hide dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !loginIcon.contains(e.target) &&
      dropdownMenu &&
      !dropdownMenu.contains(e.target)
    ) {
      dropdownMenu.style.display = "none";
    }
  });

  // New: Intercept clicks on elements that require authentication
  const requiresAuthElements = document.querySelectorAll(".requires-auth");
  requiresAuthElements.forEach((el) => {
    el.addEventListener("click", (e) => {
      if (userAuthenticated !== "true") {
        e.preventDefault();
        // Open the auth popup if not authenticated
        if (dropdownMenu) dropdownMenu.style.display = "none";
        authPopup.style.display = "flex";
        setTimeout(() => {
          authPopup.classList.add("show");
        }, 10);
      }
    });
  });
});



function showAuthPopup() {
  const authPopup = document.getElementById("authPopup");
  if (authPopup) {
    authPopup.style.display = "flex";
    setTimeout(() => {
      authPopup.classList.add("show");
    }, 10);
  }
}
