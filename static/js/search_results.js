document.addEventListener("DOMContentLoaded", function () {
  // Initialize core functionalities
  initializeDropdowns();
  initializeProductCardReveal();
  initializePagination();

  // Initialize custom price functionality
  initializeCustomPrice();
});

/**
 * Initializes dropdown functionality for elements with the class 'sk-search-results-dropdown'.
 */
function initializeDropdowns() {
  const skDropdowns = document.querySelectorAll(".sk-search_results-dropdown");

  // Add click event listeners to dropdown buttons
  skDropdowns.forEach((dropdown) => {
    const btn = dropdown.querySelector(".sk-search_results-dropdown-btn");
    btn.addEventListener("click", function (e) {
      e.stopPropagation(); // Prevent click from bubbling up
      closeOtherDropdowns(dropdown); // Close other open dropdowns
      toggleDropdownState(dropdown); // Toggle the active state of the clicked dropdown
    });
  });

  // Close all dropdowns when clicking outside any dropdown
  window.addEventListener("click", () => closeAllDropdowns(skDropdowns));
}

/**
 * Closes all dropdowns except the one provided.
 * @param {HTMLElement} currentDropdown - The dropdown to exclude from closing.
 */
function closeOtherDropdowns(currentDropdown) {
  document
    .querySelectorAll(".sk-search_results-dropdown")
    .forEach((dropdown) => {
      if (dropdown !== currentDropdown) {
        dropdown.classList.remove("active");
      }
    });
}

/**
 * Toggles the active state of a dropdown.
 * @param {HTMLElement} dropdown - The dropdown element to toggle.
 */
function toggleDropdownState(dropdown) {
  dropdown.classList.toggle("active");
}

/**
 * Closes all dropdowns.
 * @param {NodeList} dropdowns - A list of dropdown elements to close.
 */
function closeAllDropdowns(dropdowns) {
  dropdowns.forEach((dropdown) => dropdown.classList.remove("active"));
}

/**
 * Initializes the reveal-on-scroll functionality for product cards in the search results section.
 */
function initializeProductCardReveal() {
  const searchResultsCards = document.querySelectorAll(
    "#sk-search_results-page .sk-search_results-product-card"
  );

  // Add the 'card-hidden' class by default
  searchResultsCards.forEach((card) => {
    card.classList.add("card-hidden");
  });

  // Configure Intersection Observer options
  const observerOptions = {
    root: null,
    threshold: 0.2, // Trigger when 20% of the card is visible
  };

  // Create an Intersection Observer to reveal cards on scroll
  const revealOnScroll = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("card-visible");
        observer.unobserve(entry.target); // Stop observing once visible
      }
    });
  }, observerOptions);

  // Observe each product card
  searchResultsCards.forEach((card) => {
    revealOnScroll.observe(card);
  });
}

// /**
//  * Initializes pagination functionality for search results.
//  */
// function initializePagination() {
//   const pageLinks = document.querySelectorAll(
//     ".search_results-pagination a.search_results-pagination-page"
//   );

//   // Add click event listeners to pagination links
//   pageLinks.forEach((link) => {
//     link.addEventListener("click", function (e) {
//       e.preventDefault();
//       setActivePage(link); // Set the clicked link as active
//     });
//   });

//   // Handle Prev/Next button clicks
//   const prevBtn = document.querySelector(".search_results-pagination-prev");
//   const nextBtn = document.querySelector(".search_results-pagination-next");

//   [prevBtn, nextBtn].forEach((btn) => {
//     btn.addEventListener("click", function (e) {
//       e.preventDefault();
//       handlePaginationNavigation(btn); // Handle navigation logic
//     });
//   });
// }

/**
 * Sets the active state for a pagination link.
 * @param {HTMLElement} activeLink - The pagination link to mark as active.
 */
function setActivePage(activeLink) {
  const pageLinks = document.querySelectorAll(
    ".search_results-pagination a.search_results-pagination-page"
  );
  pageLinks.forEach((link) => link.classList.remove("active")); // Remove active class from all links
  activeLink.classList.add("active"); // Add active class to the clicked link
}

// /**
//  * Handles navigation logic for Prev/Next buttons.
//  * @param {HTMLElement} btn - The Prev/Next button that was clicked.
//  */
// function handlePaginationNavigation(btn) {
//   // Example: Implement custom logic for Prev/Next transitions here
//   console.log(
//     `${
//       btn.classList.contains("search_results-pagination-prev")
//         ? "Previous"
//         : "Next"
//     } page clicked`
//   );
// }
