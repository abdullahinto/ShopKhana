document.addEventListener("DOMContentLoaded", () => {
  // For demonstration: you can add logic to update the price based on quantity
  const productQuantity = document.getElementById("productQuantity");
  productQuantity.addEventListener("change", () => {
    let qty = parseInt(productQuantity.value);
    if (qty < 1) {
      productQuantity.value = 1;
      qty = 1;
    }
    // Placeholder logic:
    console.log(`Quantity updated to ${qty}. You could recalc price here.`);
  });

  // "Change Product" button
  const changeProductBtn = document.querySelector(".change-product-btn");
  changeProductBtn.addEventListener("click", () => {
    alert("Change product functionality placeholder.");
  });
});
