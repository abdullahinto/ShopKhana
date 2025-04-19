document.addEventListener("DOMContentLoaded", () => {
  const leftCol = document.querySelector(".social-proof-left");
  const rightList = document.querySelector(".live-feed-list");

  // 1) Helper: build product page URL
  const buildProductUrl = (id) => `${window.location.origin}/product/${id}`;

  // 2) IntersectionObserver for fade-in
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: "0px 0px -10% 0px",
      threshold: 0.2,
    }
  );

  // 3) Testimonial Cards (Top‑5)
  fetch("/api/testimonials")
    .then((res) => res.json())
    .then((data) => {
      data.forEach((o, i) => {
        const card = document.createElement("div");
        card.className = "testimonial-card fade-in";

        // build star markup
        const full = Math.floor(o.rating);
        const half = o.rating % 1 >= 0.5;
        const empty = 5 - full - (half ? 1 : 0);
        let stars = '<div class="stars">';
        stars += '<span class="material-icons">star</span>'.repeat(full);
        if (half) stars += '<span class="material-icons">star_half</span>';
        stars += '<span class="material-icons empty">star_border</span>'.repeat(
          empty
        );
        stars += "</div>";

        card.innerHTML = `
          <img class="avatar" src="${o.avatar_url}" alt="${o.customer_name}">
          <div class="testimonial-content">
            <p>${stars}
              <span class="product">${o.product_name}</span>
              purchased by <span class="city">${o.city}</span>
            </p>
            <strong>— ${o.customer_name}</strong>
            <span class="badge">Top Selling</span>
            <a href="${buildProductUrl(
              o.product_id
            )}" class="btn-buy">Buy Now</a>
          </div>
        `;

        leftCol.appendChild(card);
        observer.observe(card);
      });

      // start rotating after initial fade‑ins
      setTimeout(() => {
        const cards = leftCol.querySelectorAll(".testimonial-card");
        if (!cards.length) return;
        let idx = 0;
        cards[idx].classList.add("active");
        setInterval(() => {
          cards[idx].classList.remove("active");
          idx = (idx + 1) % cards.length;
          cards[idx].classList.add("active");
          spawnStar(cards[idx]);
        }, 6000);
      }, 1000);
    })
    .catch(console.error);

  // 4) Live‑Sales Cards (Recent or Fallback)
  fetch("/api/live-sales")
    .then((res) => res.json())
    .then((orders) => {
      // fallback if empty
      if (!Array.isArray(orders) || orders.length === 0) {
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
            <span class="city">${o.city}</span><br>
            <span class="price">PKR ${o.payment_amount.toLocaleString()}</span>
          </div>
          <span class="badge">Fast Ship</span>
          <a href="${buildProductUrl(o.product_id)}" class="btn-buy">Buy Now</a>
        `;
        rightList.appendChild(card);
        observer.observe(card);
      });
    })
    .catch(console.error);

  // 5) Floating star effect on active testimonial
  function spawnStar(container) {
    const star = document.createElement("div");
    star.className = "star material-icons";
    star.textContent = "star";
    star.style.left = `${10 + Math.random() * (container.clientWidth - 20)}px`;
    star.style.top = "100%";
    container.appendChild(star);
    star.addEventListener("animationend", () => star.remove());
  }

  // 6) Confetti on Buy Now
  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-buy") && window.confetti) {
      confetti({ spread: 60, origin: { y: 0.6 } });
    }
  });
});
