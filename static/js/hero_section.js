class HeroCarousel {
  constructor(selector, interval = 3000) {
    this.container = document.querySelector(selector);
    this.slides = this.container.querySelectorAll(".slide");
    this.dots = this.container.querySelectorAll(".dot");
    this.prevBtn = this.container.querySelector(".nav-arrow.prev");
    this.nextBtn = this.container.querySelector(".nav-arrow.next");
    this.total = this.slides.length;
    this.current = 0;
    this.interval = interval;
    this.timer = null;
    this.start();
    this.attachEvents();
  }
  show(index) {
    this.slides[this.current].classList.remove("active");
    this.dots[this.current].classList.remove("active");
    this.current = (index + this.total) % this.total;
    this.slides[this.current].classList.add("active");
    this.dots[this.current].classList.add("active");
  }
  next() {
    this.show(this.current + 1);
  }
  prev() {
    this.show(this.current - 1);
  }
  start() {
    this.timer = setInterval(() => this.next(), this.interval);
  }
  stop() {
    clearInterval(this.timer);
  }
  attachEvents() {
    this.nextBtn.addEventListener("click", () => {
      this.next();
      this.reset();
    });
    this.prevBtn.addEventListener("click", () => {
      this.prev();
      this.reset();
    });
    this.dots.forEach((dot) => {
      dot.addEventListener("click", (e) => {
        this.show(+e.target.dataset.index);
        this.reset();
      });
    });
    this.container.addEventListener("mouseover", () => this.stop());
    this.container.addEventListener("mouseout", () => this.start());
    // Touch support
    let startX = 0;
    this.container.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      this.stop();
    });
    this.container.addEventListener("touchend", (e) => {
      const endX = e.changedTouches[0].clientX;
      const diff = endX - startX;
      if (Math.abs(diff) > 50) diff > 0 ? this.prev() : this.next();
      this.start();
    });
  }
  reset() {
    this.stop();
    this.start();
  }
}
document.addEventListener("DOMContentLoaded", () => {
  new HeroCarousel("#heroCarousel", 3000);
});
