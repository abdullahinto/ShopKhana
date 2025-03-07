document.addEventListener("DOMContentLoaded", () => {
  // Attach event listeners for bulk actions and individual wishlist item actions.
  const wishlistContainer = document.getElementById("sk-wl-items");
  const selectAllBtn = document.getElementById("sk-wl-selectAll");
  const deleteSelectedBtn = document.getElementById("sk-wl-deleteSelected");
  const deleteAllBtn = document.getElementById("sk-wl-deleteAll");
  const shareGlobalBtn = document.getElementById("sk-wl-shareGlobal");
  const wishlistSort = document.getElementById("sk-wl-sort");

  const sharePopup = document.getElementById("sk-wl-sharePopup");
  const closeShareBtn = sharePopup.querySelector(".sk-wl-close-share");
  const wishlistLinkInput = document.getElementById("sk-wl-link");
  const copyLinkBtn = document.getElementById("sk-wl-copyLink");

  // Helper: Show a simple toast notification (you can enhance this)
  function showToast(message, type) {
    // For simplicity, we'll use alert(), but you can integrate a toast library
    alert(`${type.toUpperCase()}: ${message}`);
  }

  // Event delegation for remove and share actions on wishlist cards
  wishlistContainer.addEventListener("click", (e) => {
    // Remove individual wishlist item
    const removeBtn = e.target.closest(".sk-wl-remove-btn");
    if (removeBtn) {
      e.preventDefault();
      const itemId = removeBtn.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this wishlist item?")) {
        fetch(`/my_wish/delete/${itemId}`, { method: "POST" })
          .then((response) => response.text())
          .then(() => {
            // Remove the card from the DOM
            const card = removeBtn.closest(".sk-wl-card");
            card.remove();
            showToast("Wishlist item deleted successfully.", "success");
          })
          .catch((err) => {
            console.error(err);
            showToast("Error deleting wishlist item.", "error");
          });
      }
    }
    // Share individual wishlist item
    const shareBtn = e.target.closest(".sk-wl-share-product-btn");
    if (shareBtn) {
      e.preventDefault();
      const itemId = shareBtn.getAttribute("data-id");
      fetch(`/my_wish/share/${itemId}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.share_url) {
            sharePopup.style.display = "flex";
            wishlistLinkInput.value = data.share_url;
          } else {
            showToast("Error fetching share URL.", "error");
          }
        })
        .catch((err) => {
          console.error(err);
          showToast("Error fetching share URL.", "error");
        });
    }
  });

  // Bulk: Select All
  selectAllBtn.addEventListener("click", () => {
    document
      .querySelectorAll(".sk-wl-checkbox")
      .forEach((cb) => (cb.checked = true));
  });

  // Bulk: Delete Selected
  deleteSelectedBtn.addEventListener("click", () => {
    const selectedCheckboxes = document.querySelectorAll(
      ".sk-wl-checkbox:checked"
    );
    if (selectedCheckboxes.length === 0) {
      showToast("No items selected.", "error");
      return;
    }
    if (confirm("Are you sure you want to delete selected items?")) {
      const ids = Array.from(selectedCheckboxes)
        .map((cb) => cb.closest(".sk-wl-card").getAttribute("data-id"))
        .join(",");
      fetch(`/my_wish/delete_selected`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `selected_ids=${ids}`,
      })
        .then((response) => response.text())
        .then(() => {
          selectedCheckboxes.forEach((cb) => {
            cb.closest(".sk-wl-card").remove();
          });
          showToast("Selected wishlist items deleted.", "success");
        })
        .catch((err) => {
          console.error(err);
          showToast("Error deleting selected items.", "error");
        });
    }
  });

  // Bulk: Delete All
  deleteAllBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all wishlist items?")) {
      fetch(`/my_wish/delete_all`, { method: "POST" })
        .then((response) => response.text())
        .then(() => {
          wishlistContainer.innerHTML = "";
          showToast("All wishlist items deleted.", "success");
        })
        .catch((err) => {
          console.error(err);
          showToast("Error deleting all items.", "error");
        });
    }
  });

  // Global Wishlist Share Popup
  shareGlobalBtn.addEventListener("click", () => {
    sharePopup.style.display = "flex";
    wishlistLinkInput.value = window.location.href;
  });

  closeShareBtn.addEventListener("click", () => {
    sharePopup.style.display = "none";
  });

  copyLinkBtn.addEventListener("click", () => {
    wishlistLinkInput.select();
    document.execCommand("copy");
    showToast("Wishlist link copied!", "success");
  });

  // Sorting functionality (placeholder)
  wishlistSort.addEventListener("change", (e) => {
    showToast(`Sorting wishlist by: ${e.target.value} (placeholder)`, "info");
    // You may implement sorting by reloading the page with a sort parameter
  });
});
