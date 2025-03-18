document.addEventListener("DOMContentLoaded", () => {
  // Cache DOM elements.
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

  // --- Styled Confirmation Dialog ---
  function styledConfirm(message, callback) {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog";
    dialog.innerHTML = `
      <p>${message}</p>
      <div class="confirm-buttons">
        <button class="confirm-btn yes-btn">Yes</button>
        <button class="confirm-btn no-btn">No</button>
      </div>
    `;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    dialog.querySelector(".yes-btn").addEventListener("click", () => {
      callback();
      overlay.remove();
    });
    dialog.querySelector(".no-btn").addEventListener("click", () => {
      overlay.remove();
    });
  }

  // --- Elegant Toast Notification Function ---
  function showToast(message, type) {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.style.position = "fixed";
      container.style.top = "20px";
      container.style.right = "20px";
      container.style.zIndex = 10000;
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "custom-toast " + type;
    toast.textContent = message;
    container.appendChild(toast);
    toast.classList.add("fade-in");
    setTimeout(() => {
      toast.classList.remove("fade-in");
      toast.classList.add("fade-out");
      toast.addEventListener("animationend", () => {
        toast.remove();
      });
    }, 3000);
  }

  // --- Sorting Functionality ---
  wishlistSort.addEventListener("change", () => {
    const sortBy = wishlistSort.value; // e.g., "category", "price", "date"
    sortWishlist(sortBy);
  });

  function sortWishlist(sortBy) {
    // Get an array of wishlist card elements.
    const cards = Array.from(wishlistContainer.querySelectorAll(".sk-wl-card"));
    let sortedCards;
    if (sortBy === "category") {
      sortedCards = cards.sort((a, b) => {
        const catA = a.getAttribute("data-category")?.toLowerCase() || "";
        const catB = b.getAttribute("data-category")?.toLowerCase() || "";
        return catA.localeCompare(catB);
      });
    } else if (sortBy === "price") {
      sortedCards = cards.sort((a, b) => {
        // Assume discounted price is stored in data-price attribute.
        const priceA = parseFloat(a.getAttribute("data-price")) || 0;
        const priceB = parseFloat(b.getAttribute("data-price")) || 0;
        return priceA - priceB;
      });
    } else if (sortBy === "date") {
      // If you have a data-date attribute (ISO date string), sort by that.
      sortedCards = cards.sort((a, b) => {
        const dateA = new Date(a.getAttribute("data-date"));
        const dateB = new Date(b.getAttribute("data-date"));
        return dateA - dateB;
      });
    } else {
      // Default: no sorting.
      return;
    }
    // Clear container and re-append sorted cards.
    wishlistContainer.innerHTML = "";
    sortedCards.forEach((card) => wishlistContainer.appendChild(card));
    showToast(`Wishlist sorted by ${sortBy}.`, "success");
  }

  // --- Event Delegation for Wishlist Actions ---
  wishlistContainer.addEventListener("click", (e) => {
    // Remove individual wishlist item.
    const removeBtn = e.target.closest(".sk-wl-remove-btn");
    if (removeBtn) {
      e.preventDefault();
      const itemId = removeBtn.getAttribute("data-id");
      const itemColor = removeBtn.getAttribute("data-color") || "";
      styledConfirm(
        "Are you sure you want to delete this wishlist item?",
        () => {
          fetch(`/my_wish/delete/${itemId}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `selected_color=${encodeURIComponent(itemColor)}`,
          })
            .then((response) => response.text())
            .then(() => {
              // Remove the card from the DOM.
              const card = removeBtn.closest(".sk-wl-card");
              card.remove();
              showToast("Wishlist item deleted successfully.", "success");
            })
            .catch((err) => {
              console.error(err);
              showToast("Error deleting wishlist item.", "error");
            });
        }
      );
      return;
    }
    // Share individual wishlist item.
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
      return;
    }
  });

  // Bulk: Select All.
  selectAllBtn.addEventListener("click", () => {
    document
      .querySelectorAll(".sk-wl-checkbox")
      .forEach((cb) => (cb.checked = true));
  });

  // Bulk: Delete Selected.
  deleteSelectedBtn.addEventListener("click", () => {
    const selectedCheckboxes = document.querySelectorAll(
      ".sk-wl-checkbox:checked"
    );
    if (selectedCheckboxes.length === 0) {
      showToast("No items selected.", "error");
      return;
    }
    styledConfirm("Are you sure you want to delete selected items?", () => {
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
            const card = cb.closest(".sk-wl-card");
            card.remove();
          });
          showToast("Selected wishlist items deleted.", "success");
        })
        .catch((err) => {
          console.error(err);
          showToast("Error deleting selected items.", "error");
        });
    });
  });

  // Bulk: Delete All.
  deleteAllBtn.addEventListener("click", () => {
    styledConfirm("Are you sure you want to delete all wishlist items?", () => {
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
    });
  });

  // Global Wishlist Share Popup.
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
});
