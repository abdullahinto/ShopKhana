document.addEventListener('DOMContentLoaded', () => {
  const toastEl = document.getElementById('live-toast');
  const testContainer = document.getElementById('testimonials');
  let toastData = [];

  // Fetch and display live sales toasts
  fetch('/api/live-sales')
    .then(res => res.json())
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
    toastEl.textContent = 
      `${order.customer_name} from ${order.city} just bought ${order.product_name}!`;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3000);
  }

  // Fetch and render rotating testimonials
  fetch('/api/testimonials')
    .then(res => res.json())
    .then(data => {
      data.forEach((order, i) => {
        const slide = document.createElement('div');
        slide.className = 'testimonial' + (i === 0 ? ' active' : '');
        slide.innerHTML = `
          <p>“Just bought ${order.product_name} for PKR ${order.payment_amount.toLocaleString()}!”</p>
          <strong>— ${order.customer_name}, ${order.city}</strong>
        `;
        testContainer.appendChild(slide);
      });

      const items = testContainer.querySelectorAll('.testimonial');
      let idx = 0;
      setInterval(() => {
        items[idx].classList.remove('active');
        idx = (idx + 1) % items.length;
        items[idx].classList.add('active');
      }, 6000);
    })
    .catch(console.error);
});
