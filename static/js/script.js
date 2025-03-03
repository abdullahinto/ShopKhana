document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const closeMenuBtn = document.getElementById("close-menu");
  const header = document.getElementById("header");
  const searchInput = document.getElementById("search-input");
  const autocompleteList = document.getElementById("autocomplete-list");
  const mobileautocompleteList = document.getElementById("mobile-autocomplete-list");

  // Mobile search toggle elements
  const mobileSearchToggle = document.getElementById("mobile-search-toggle");
  const mobileSearch = document.getElementById("mobile-search");

  if (menuBtn && mobileMenu && closeMenuBtn) {
    setupMobileMenu(menuBtn, mobileMenu, closeMenuBtn);
  }

  if (header) {
    setupScrollHeader(header);
  }

  if (searchInput && autocompleteList) {
    setupSearchAutocomplete(searchInput, autocompleteList);
  }

  // Toggle mobile search bar when search icon is clicked
  if (mobileSearchToggle && mobileSearch) {
    mobileSearchToggle.addEventListener("click", () => {
      mobileSearch.classList.toggle("active");
    });
  }
});

/* New: Hide header on scroll down & show on scroll up,
   and hide the categories navigation when scrolling down */
function setupScrollHeader(header) {
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', throttle(() => {
    const currentScrollY = window.scrollY;
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
      // Scrolling down: hide header and collapse categories
      header.classList.add('hidden');
      header.classList.add('compact');
    } else {
      // Scrolling up: show header and expand categories
      header.classList.remove('hidden');
      header.classList.remove('compact');
    }
    lastScrollY = currentScrollY;
  }, 100));
}

/* Existing Mobile Menu Setup */
function setupMobileMenu(menuBtn, mobileMenu, closeMenuBtn) {
  menuBtn.addEventListener("click", () => {
    mobileMenu.classList.add("active");
  });

  closeMenuBtn.addEventListener("click", () => {
    mobileMenu.classList.remove("active");
  });

  document.addEventListener("click", (event) => {
    if (
      !mobileMenu.contains(event.target) &&
      !menuBtn.contains(event.target)
    ) {
      mobileMenu.classList.remove("active");
    }
  });
}

/* New: Debounce function for improved autocomplete performance */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/* Updated: Setup autocomplete with debounce */
function setupSearchAutocomplete(searchInput, autocompleteList) {
  const suggestions = [
    "Handbags",
    "Jewelry",
    "Fashion",
    "Cosmetics",
    "New Arrivals",
  ];
  searchInput.addEventListener("input", debounce(() => {
    const query = searchInput.value.toLowerCase();
    if (query.length > 0) {
      const filteredSuggestions = suggestions.filter((item) =>
        item.toLowerCase().includes(query)
      );
      renderAutocomplete(filteredSuggestions, autocompleteList, searchInput);
    } else {
      autocompleteList.style.display = "none";
    }
  }, 300));
}

function renderAutocomplete(items, autocompleteList, searchInput) {
  autocompleteList.innerHTML = "";
  if (items.length === 0) {
    autocompleteList.style.display = "none";
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    li.addEventListener("click", () => {
      searchInput.value = item;
      autocompleteList.style.display = "none";
    });
    autocompleteList.appendChild(li);
  });
  autocompleteList.style.display = "block";
}

/* Existing Throttle Function */
function throttle(callback, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall >= delay) {
      lastCall = now;
      callback.apply(this, args);
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const loginIcon = document.getElementById("login-icon");
  const dropdownMenu = document.getElementById("dropdown-menu");

  // Toggle dropdown menu visibility
  loginIcon.addEventListener("click", (event) => {
    event.stopPropagation(); // Prevent click from propagating to the document
    dropdownMenu.classList.toggle("active");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (event) => {
    if (
      !dropdownMenu.contains(event.target) &&
      !loginIcon.contains(event.target)
    ) {
      dropdownMenu.classList.remove("active");
    }
  });
});



document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    const targetUrl = item.getAttribute('data-href');
    if (targetUrl) {
      window.location.href = targetUrl;
    }
  });
});
