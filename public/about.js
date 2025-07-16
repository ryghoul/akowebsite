
  document.addEventListener('DOMContentLoaded', () => {
    const scrollElements = document.querySelectorAll('.animate-on-scroll');

    const elementInView = (el, offset = 100) => {
      const elementTop = el.getBoundingClientRect().top;
      return (
        elementTop <= (window.innerHeight - offset)
      );
    };

    const displayScrollElement = (element) => {
      element.classList.add('in-view');
    };

    const hideScrollElement = (element) => {
      element.classList.remove('in-view');
    };

    const handleScrollAnimation = () => {
      scrollElements.forEach((el) => {
        if (elementInView(el, 100)) {
          displayScrollElement(el);
        } else {
          hideScrollElement(el); // Optional: remove if you want animation only once
        }
      });
    };

    window.addEventListener('scroll', () => {
      handleScrollAnimation();
    });

    // Run on load
    handleScrollAnimation();
  });
