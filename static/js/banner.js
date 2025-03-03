document.addEventListener("DOMContentLoaded", function () {
  // Get carousel elements
  const carouselContainer = document.querySelector('.carousel-container');
  const carousel = document.querySelector('.carousel');
  const slides = document.querySelectorAll('.banner');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  // Early exit if required elements are missing
  if (!carouselContainer || !carousel || slides.length === 0 || !prevBtn || !nextBtn) {
    console.error("Carousel initialization failed: Missing required elements.");
    return;
  }

  let currentIndex = 0;
  const totalSlides = slides.length;
  const slideIntervalTime = 4000; // 4 seconds delay
  let slideInterval;
  let isTransitioning = false; // Prevent rapid button clicks

  // Create dot indicators dynamically
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'dots';
  const dotElements = []; // Cache dot elements for performance
  for (let i = 0; i < totalSlides; i++) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    if (i === currentIndex) {
      dot.classList.add('active');
    }
    dot.setAttribute('data-index', i);
    dotsContainer.appendChild(dot);
    dotElements.push(dot); // Cache the dot element
  }
  carouselContainer.appendChild(dotsContainer);

  // Update the active dot based on the current slide index
  function updateDots() {
    dotElements.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentIndex);
    });
  }

  // Update carousel position and dot indicators
  function updateCarousel() {
    carousel.style.transform = `translateX(-${currentIndex * 100}%)`;
    updateDots();
  }

  // Move to the next slide
  function nextSlide() {
    if (isTransitioning) return; // Block rapid clicks
    isTransitioning = true;

    currentIndex = (currentIndex + 1) % totalSlides;
    carousel.classList.add('transitioning'); // Add class for CSS transition effects
    updateCarousel();

    setTimeout(() => {
      carousel.classList.remove('transitioning');
      isTransitioning = false;
    }, 500); // Match this duration with your CSS transition time
  }

  // Move to the previous slide
  function prevSlide() {
    if (isTransitioning) return; // Block rapid clicks
    isTransitioning = true;

    currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    carousel.classList.add('transitioning'); // Add class for CSS transition effects
    updateCarousel();

    setTimeout(() => {
      carousel.classList.remove('transitioning');
      isTransitioning = false;
    }, 500); // Match this duration with your CSS transition time
  }

  // Reset the auto-slide timer (used after manual navigation)
  function resetInterval() {
    clearInterval(slideInterval);
    slideInterval = setInterval(nextSlide, slideIntervalTime);
  }

  // Attach event listeners to the navigation buttons
  prevBtn.addEventListener("click", () => {
    prevSlide();
    resetInterval();
  });

  nextBtn.addEventListener("click", () => {
    nextSlide();
    resetInterval();
  });

  // Attach event listener for dot clicks (manual navigation)
  dotsContainer.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains('dot')) {
      const newIndex = parseInt(e.target.getAttribute('data-index'), 10);
      if (newIndex !== currentIndex) {
        currentIndex = newIndex;
        updateCarousel();
        resetInterval();
      }
    }
  });

  // Pause automatic sliding when mouse enters any banner
  slides.forEach((slide) => {
    slide.addEventListener("mouseenter", () => {
      clearInterval(slideInterval);
    });

    slide.addEventListener("mouseleave", () => {
      slideInterval = setInterval(nextSlide, slideIntervalTime);
    });
  });

  // Handle swipe gestures for touch devices
  let touchStartX = 0;
  let touchEndX = 0;
  carouselContainer.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  });

  carouselContainer.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].clientX;
    if (touchEndX < touchStartX - 50) {
      nextSlide(); // Swipe left
      resetInterval();
    } else if (touchEndX > touchStartX + 50) {
      prevSlide(); // Swipe right
      resetInterval();
    }
  });

  // Handle keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      nextSlide();
      resetInterval();
    } else if (e.key === "ArrowLeft") {
      prevSlide();
      resetInterval();
    }
  });

  // Start the automatic slide transition
  slideInterval = setInterval(nextSlide, slideIntervalTime);
});