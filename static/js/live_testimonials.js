document.addEventListener('DOMContentLoaded', () => {
  const toastEl       = document.getElementById('live-toast');
  const testContainer = document.getElementById('testimonials');
  let toastData = [];

  // 1) Fetch Live Sales Toasts
  fetch('/api/live-sales')
    .then(r => r.json())
    .then(data => {
      toastData = data;
      if (toastData.length) {
        showToast();
        setInterval(showToast, 5000);
      }
    })
    .catch(console.error);

  function showToast() {
    const order = toastData[Math.floor(Math.random() * toastData.length)];
    toastEl.innerHTML = `
      <span class="product">${order.product_name}</span>  
      purchased by  
      <strong>${order.customer_name}</strong>,  
      <span class="city">${order.city}</span>!`;

    toastEl.classList.add('show');

    // confetti (always on)
    if (window.confetti) {
      confetti({ spread: 60, origin: { y: 0.6 } });
    }

    // floating hearts
    spawnHeart();

    setTimeout(() => toastEl.classList.remove('show'), 3000);
  }

  function spawnHeart() {
    const heart = document.createElement('div');
    heart.textContent = '❤️';
    heart.className = 'heart';
    heart.style.left = `${20 + Math.random() * (toastEl.clientWidth - 40)}px`;
    heart.style.top  = '100%';
    toastEl.appendChild(heart);
    heart.addEventListener('animationend', () => heart.remove());
  }

  // 2) Fetch & show Testimonials
  fetch('/api/testimonials')
    .then(r => r.json())
    .then(data => {
      data.forEach((order, i) => {
        const slide = document.createElement('div');
        slide.className = 'testimonial';
        slide.innerHTML = `
          <p>
            <span class="product">${order.product_name}</span>  
            for PKR ${order.payment_amount.toLocaleString()}  
            in <span class="city">${order.city}</span>
            <span class="verified-badge">✔</span>
          </p>
          <strong>— ${order.customer_name}</strong>
        `;
        testContainer.appendChild(slide);
        setTimeout(() => slide.classList.add('active'), i * 800);
      });
      setTimeout(startRotation, data.length * 800 + 500);
    })
    .catch(console.error);

  function startRotation() {
    const items = testContainer.querySelectorAll('.testimonial');
    let idx = 0;
    items[idx].classList.add('active');
    setInterval(() => {
      items[idx].classList.remove('active');
      idx = (idx + 1) % items.length;
      items[idx].classList.add('active');
    }, 6000);
  }
});
