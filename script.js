document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeMenuBtn = document.getElementById('close-menu');
    const header = document.getElementById("header");
    const searchInput = document.getElementById('search-input');
    const autocompleteList = document.getElementById('autocomplete-list');
  
    // New: Mobile search toggle elements
    const mobileSearchToggle = document.getElementById('mobile-search-toggle');
    const mobileSearch = document.getElementById('mobile-search');
  
    if (darkModeToggle) {
      darkModeToggle.addEventListener('click', toggleDarkMode);
    }
  
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
      mobileSearchToggle.addEventListener('click', () => {
        mobileSearch.classList.toggle('active');
      });
    }
  });
  
  // Existing functions...
  
  function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
  }
  
  function setupMobileMenu(menuBtn, mobileMenu, closeMenuBtn) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.add('active');
    });
  
    closeMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.remove('active');
    });
  
    document.addEventListener('click', (event) => {
      if (!mobileMenu.contains(event.target) && !menuBtn.contains(event.target)) {
        mobileMenu.classList.remove('active');
      }
    });
  }
  
  function setupScrollHeader(header) {
    let lastScrollTop = 0;
  
    window.addEventListener("scroll", throttle(() => {
      let scrollTop = window.scrollY || document.documentElement.scrollTop;
      const headerHeight = header.getBoundingClientRect().height;
  
      if (scrollTop > lastScrollTop) {
        header.style.top = `-${headerHeight}px`;
      } else {
        header.style.top = "0";
      }
      lastScrollTop = scrollTop;
    }, 100));
  }
  
  function setupSearchAutocomplete(searchInput, autocompleteList) {
    const suggestions = ['Handbags', 'Jewelry', 'Fashion', 'Cosmetics', 'New Arrivals'];
  
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      if (query.length > 0) {
        const filteredSuggestions = suggestions.filter(item =>
          item.toLowerCase().includes(query)
        );
        renderAutocomplete(filteredSuggestions, autocompleteList, searchInput);
      } else {
        autocompleteList.style.display = 'none';
      }
    });
  }
  
  function renderAutocomplete(items, autocompleteList, searchInput) {
    autocompleteList.innerHTML = '';
    if (items.length === 0) {
      autocompleteList.style.display = 'none';
      return;
    }
  
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      li.addEventListener('click', () => {
        searchInput.value = item;
        autocompleteList.style.display = 'none';
      });
      autocompleteList.appendChild(li);
    });
  
    autocompleteList.style.display = 'block';
  }
  
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
  