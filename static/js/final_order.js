document.addEventListener("DOMContentLoaded", () => {
  // Use IntersectionObserver to animate elements when they come into view.
  const observerOptions = {
    threshold: 0.2,
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("animate-in");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all elements marked with the "animate-on-view" class.
  document.querySelectorAll(".animate-on-view").forEach((el) => {
    observer.observe(el);
  });

  // Order placed page specific code for summary toggle and view order.
  const summaryToggleBtn = document.getElementById("skFinalSummaryToggle");
  const summaryContent = document.getElementById("skFinalSummaryContent");
  const viewOrderBtn = document.querySelector(".sk-final-view-order-btn");

  let isSummaryOpen = false;

  summaryToggleBtn.addEventListener("click", () => {
    isSummaryOpen = !isSummaryOpen;
    const icon = summaryToggleBtn.querySelector("i");

    if (isSummaryOpen) {
      // Animate sliding in.
      summaryContent.classList.remove("slide-out");
      summaryContent.classList.add("slide-in");
      summaryContent.style.display = "block";
    } else {
      // Animate sliding out.
      summaryContent.classList.remove("slide-in");
      summaryContent.classList.add("slide-out");
      summaryContent.addEventListener("animationend", function handler() {
        summaryContent.style.display = "none";
        summaryContent.classList.remove("slide-out");
        summaryContent.removeEventListener("animationend", handler);
      });
    }

    if (icon) {
      icon.classList.toggle("fa-chevron-down", !isSummaryOpen);
      icon.classList.toggle("fa-chevron-up", isSummaryOpen);
    }
  });

  viewOrderBtn.addEventListener("click", () => {
    window.location.href = "/my_orders"; // Adjust URL as needed.
  });
});




document.addEventListener("DOMContentLoaded", function () {
  const copyOrderIdBtn = document.getElementById("copyOrderIdBtn");
  const orderNumElement = document.getElementById("skFinalOrderNum");
  const toastContainer = document.getElementById("toastContainer");

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Remove the toast after the animation ends
    setTimeout(() => {
      toast.remove();
    }, 3000); // Match the animation duration (3s)
  }

  copyOrderIdBtn.addEventListener("click", function () {
    const orderId = orderNumElement.textContent;
    navigator.clipboard.writeText(orderId).then(() => {
      showToast("Order ID copied to clipboard!");
    }).catch(err => {
      showToast("Failed to copy Order ID.");
      console.error("Failed to copy Order ID: ", err);
    });
  });
});
