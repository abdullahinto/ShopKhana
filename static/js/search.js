document.addEventListener("DOMContentLoaded", () => {
  // Desktop Search Elements
  const searchInput = document.getElementById("search-input");
  const autocompleteList = document.getElementById("autocomplete-list");

  // Mobile Search Elements
  const mobileSearchInput = document.getElementById("mobile-search-input");
  const mobileAutocompleteList = document.getElementById(
    "mobile-autocomplete-list"
  );

  // Function to handle autocomplete visibility
  const updateAutocompleteVisibility = (listElement, data) => {
    if (data.length > 0 || data.message) {
      listElement.style.display = "block"; // Keep the list visible
    } else {
      listElement.style.display = "none"; // Hide only if no results
    }
  };

  // Generic function to handle input changes for both desktop and mobile
  const setupSearchFunctionality = (inputElement, listElement) => {
    let debounceTimer; // To prevent excessive API calls while typing

    inputElement.addEventListener("input", () => {
      clearTimeout(debounceTimer); // Clear any pending API call

      const query = inputElement.value.trim();
      if (query.length > 0) {
        debounceTimer = setTimeout(() => {
          fetch(`/api/search?query=${encodeURIComponent(query)}`)
            .then((response) => response.json())
            .then((data) => {
              listElement.innerHTML = ""; // Clear previous suggestions

              if (data.message) {
                // No products found
                const li = document.createElement("li");
                li.textContent = data.message;
                listElement.appendChild(li);
              } else {
                // Populate suggestions
                data.forEach((item) => {
                  const li = document.createElement("li");
                  li.textContent = item.title;
                  li.addEventListener("click", () => {
                    // Navigate to search_results page on suggestion click
                    window.location.href = `/search_results?query=${encodeURIComponent(
                      item.title
                    )}`;
                  });
                  listElement.appendChild(li);
                });
              }

              // Update visibility of the autocomplete list
              updateAutocompleteVisibility(listElement, data);
            })
            .catch((error) => {
              console.error("Error fetching autocomplete data:", error);
              listElement.style.display = "none"; // Hide list on error
            });
        }, 300); // Debounce delay of 300ms
      } else {
        listElement.innerHTML = ""; // Clear suggestions if input is empty
        listElement.style.display = "none"; // Hide the list
      }
    });

    // Handle search button click or Enter key press
    const performSearch = () => {
      const query = inputElement.value.trim();
      if (query.length > 0) {
        window.location.href = `/search_results?query=${encodeURIComponent(
          query
        )}`;
      }
    };

    // Search button click
    inputElement.nextElementSibling?.addEventListener("click", performSearch);

    // Listen for "Enter" key press
    inputElement.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault(); // Prevent form submission or default behavior
        performSearch();
      }
    });

    // Optional: Prevent autocomplete from hiding when clicking outside
    document.addEventListener("click", (event) => {
      const isClickInside =
        inputElement.contains(event.target) ||
        listElement.contains(event.target);
      if (!isClickInside) {
        listElement.style.display = "none"; // Hide only if clicking outside
      }
    });
  };

  // Apply search functionality to both desktop and mobile search bars
  setupSearchFunctionality(searchInput, autocompleteList);
  setupSearchFunctionality(mobileSearchInput, mobileAutocompleteList);
});
