document.addEventListener("DOMContentLoaded", () => {
  const leftCol = document.querySelector(".social-proof-left");
  const rightList = document.querySelector(".live-feed-list");

  // Build URL helper
  const buildProductUrl = (id) => `${window.location.origin}/product/${id}`;

  // Observer for fade‑in
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.2 }
  );

  // State
  let testimonialCards = [],
    currentTestimonial = 0,
    touchStartX = 0;

  // 1) Testimonials
  fetch("/api/testimonials")
    .then((r) => r.json())
    .then((data) => {
      data.forEach((o, i) => {
        const card = document.createElement("div");
        card.className = "testimonial-card fade-in";

        // Stars
        const full = Math.floor(o.rating),
          half = o.rating % 1 >= 0.5,
          empty = 5 - full - (half ? 1 : 0);
        let stars = '<div class="stars">';
        stars += '<span class="material-icons">star</span>'.repeat(full);
        if (half) stars += '<span class="material-icons">star_half</span>';
        stars += '<span class="material-icons empty">star_border</span>'.repeat(
          empty
        );
        stars += "</div>";

        // Date
        const date = new Date(o.transaction_date);
        const opts = { year: "numeric", month: "long", day: "numeric" };
        const formatted = date.toLocaleDateString(undefined, opts);

        // Views
        const views = Math.floor(50 + Math.random() * 200);

        card.innerHTML = `
        <img class="avatar" src="${o.avatar_url}" alt="${o.customer_name}">
        <div class="testimonial-content">
          ${stars}
          <p class="review-text">“${o.review}”</p>
          <p>
            <span class="product">${o.product_name}</span>  
            purchased by <span class="city">${o.customer_name}</span>
          </p>
          <p class="testimonial-date">📅 ${formatted} &ensp;👁️ ${views} viewed this</p>
          <span class="badge">
            <i class="fas fa-fire" style="color:#FFFF00;"></i> Top Selling
          </span>
          <a href="${buildProductUrl(o.product_id)}" class="btn-buy">Buy Now</a>
        </div>
      `;

        leftCol.appendChild(card);
        observer.observe(card);
        testimonialCards.push(card);

        // staggered reveal
        setTimeout(() => card.classList.add("visible"), i * 600);
      });

      // Carousel init
      setTimeout(initCarousel, data.length * 600 + 400);
    })
    .catch(console.error);

  function initCarousel() {
    if (!testimonialCards.length) return;
    testimonialCards[0].classList.add("active", "slide-in");
    testimonialCards[0].addEventListener(
      "animationend",
      () => testimonialCards[0].classList.remove("slide-in"),
      { once: true }
    );

    // Auto‑rotate
    setInterval(() => rotateTestimonial(1), 6000);

    // Swipe
    leftCol.addEventListener(
      "touchstart",
      (e) => (touchStartX = e.changedTouches[0].clientX)
    );
    leftCol.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) rotateTestimonial(dx < 0 ? 1 : -1);
    });
  }

  function rotateTestimonial(dir) {
    testimonialCards[currentTestimonial].classList.remove("active");
    currentTestimonial =
      (currentTestimonial + dir + testimonialCards.length) %
      testimonialCards.length;
    const next = testimonialCards[currentTestimonial];
    next.classList.add("active", "slide-in");
    next.addEventListener(
      "animationend",
      () => next.classList.remove("slide-in"),
      { once: true }
    );
  }

  // 2) Live Sales
  fetch("/api/live-sales")
    .then((r) => r.json())
    .then((orders) => {
      if (!orders.length) {
        orders = [
          {
            product_id: "SBF001",
            product_image: "/static/img/fallback1.png",
            product_name: "Timeless Radiance Gold Bracelet",
            city: "Lahore",
            payment_amount: 2499,
          },
          {
            product_id: "SBF002",
            product_image: "/static/img/fallback2.png",
            product_name: "Celestial Glow Sapphire Earrings",
            city: "Karachi",
            payment_amount: 3999,
          },
          {
            product_id: "SBF003",
            product_image: "/static/img/fallback3.png",
            product_name: "Eternal Elegance Diamond Ring",
            city: "Islamabad",
            payment_amount: 5499,
          },
        ];
      }
      rightList.innerHTML = "";
      orders.forEach((o) => {
        const card = document.createElement("div");
        card.className = "live-sale-card fade-in";
        card.innerHTML = `
        <img src="${o.product_image}" alt="${o.product_name}">
        <div class="live-info">
          <span class="product">${o.product_name}</span><br>
          <span class="city">Buying from ${o.city}</span><br>
          <span class="price">PKR ${o.payment_amount.toLocaleString()}</span>
        </div>
        <span class="badge">
          <i class="fas fa-shipping-fast" style="color: white;"></i> Fast Ship
        </span>
        <a href="${buildProductUrl(o.product_id)}" class="btn-buy">Buy Now</a>
      `;

        rightList.appendChild(card);
        observer.observe(card);
      });
    })
    .catch(console.error);

  // 3) Confetti
  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-buy") && window.confetti) {
      confetti({ spread: 60, origin: { y: 0.6 } });
    }
  });
});
