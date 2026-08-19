    const cartCount = document.getElementById('cart-count');

    function setCartCount(count) {
        const total = Number(count) || 0;
        cartCount.textContent = total;
        cartCount.classList.toggle('visible', total > 0);
    }

    setCartCount(0);

    const benefitsSlider = document.querySelector('.benefits');
    const benefits = document.querySelectorAll('.benefit');
    const benefitsDots = document.querySelectorAll('.benefits-dots button');

    if (benefitsSlider && benefits.length && benefitsDots.length) {
        function updateBenefitsDot() {
            const activeIndex = Math.round(benefitsSlider.scrollLeft / benefitsSlider.clientWidth);

            benefitsDots.forEach((dot, index) => {
                const isActive = index === activeIndex;
                dot.classList.toggle('active', isActive);

                if (isActive) {
                    dot.setAttribute('aria-current', 'true');
                } else {
                    dot.removeAttribute('aria-current');
                }
            });
        }

        benefitsDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                benefitsSlider.scrollTo({
                    left: index * benefitsSlider.clientWidth,
                    behavior: 'smooth'
                });
            });
        });

        benefitsSlider.addEventListener('scroll', updateBenefitsDot, { passive: true });
    }