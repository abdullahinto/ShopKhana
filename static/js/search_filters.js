document.addEventListener("DOMContentLoaded", () => {
  // Custom Price Option
  const customPriceOption = document.getElementById("custom-price-option");
  const customPriceContainer = document.getElementById(
    "custom-price-container"
  );
  const customMinPrice = document.getElementById("custom-min-price");
  const customMaxPrice = document.getElementById("custom-max-price");
  const applyCustomPriceBtn = document.getElementById("apply-custom-price");

  if (customPriceOption) {
    customPriceOption.addEventListener("click", (e) => {
      e.preventDefault();
      customPriceContainer.style.display = "block";
    });
  }

  if (applyCustomPriceBtn) {
    applyCustomPriceBtn.addEventListener("click", () => {
      const query = document.getElementById("search-input").value.trim();
      const minPrice = customMinPrice.value.trim();
      const maxPrice = customMaxPrice.value.trim();
      let url = `/search_results?query=${encodeURIComponent(query)}`;
      if (minPrice) {
        url += `&min_price=${encodeURIComponent(minPrice)}`;
      }
      if (maxPrice) {
        url += `&max_price=${encodeURIComponent(maxPrice)}`;
      }
      window.location.href = url;
    });
  }
});
