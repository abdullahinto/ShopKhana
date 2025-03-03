document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("sk-rv-overlay");
  const container = document.querySelector(".sk-rv-container");
  const closeBtn = document.querySelector(".sk-rv-close-btn");
  const reviewTextarea = document.getElementById("sk-rv-textarea");
  const uploadArea = document.getElementById("sk-rv-upload-area");
  const fileInput = document.getElementById("sk-rv-file-input");
  const previewContainer = document.getElementById("sk-rv-preview-container");
  const submitBtn = document.getElementById("sk-rv-submit-btn");
  const ratingDropdown = document.getElementById("sk-rv-rating-dropdown");

  const reviewLink = document.getElementById("write-review-link");

  // Show the popup when the "Write a Review" link is clicked
  reviewLink.addEventListener("click", function (event) {
    event.preventDefault(); // Prevent the default link behavior
    overlay.style.display = "flex";
  });

  // Close popup
  closeBtn.addEventListener("click", () => {
    overlay.style.display = "none";
  });

  // Click on upload area triggers file input
  uploadArea.addEventListener("click", () => {
    fileInput.click();
  });

  // Handle file input change
  fileInput.addEventListener("change", () => {
    // Clear previous previews
    previewContainer.innerHTML = "";
    const files = Array.from(fileInput.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement("img");
        img.src = e.target.result;
        previewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  // Submit review
  submitBtn.addEventListener("click", () => {
    const reviewText = reviewTextarea.value.trim();
    const ratingValue = ratingDropdown.value;

    // Validate mandatory fields
    if (!reviewText) {
      alert("Please enter your review text.");
      return;
    }
    if (!ratingValue) {
      alert("Please select a rating.");
      return;
    }

    // Confirmation
    if (confirm("Are you sure you want to submit your review?")) {
      // Placeholder success message
      alert(
        `Review submitted successfully!\nRating: ${ratingValue}\nText: ${reviewText}`
      );

      // Close popup automatically
      overlay.style.display = "none";
      // Clear fields if needed
      reviewTextarea.value = "";
      ratingDropdown.value = "";
      fileInput.value = "";
      previewContainer.innerHTML = "";
    }
  });

  // Hide the popup when clicking outside of it
  window.addEventListener("click", function (event) {
    if (event.target === overlay) {
      overlay.style.display = "none";
    }
  });
});
