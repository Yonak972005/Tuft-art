    const cartCount = document.getElementById('cart-count');

    function setCartCount(count) {
        const total = Number(count) || 0;
        cartCount.textContent = total;
        cartCount.classList.toggle('visible', total > 0);
    }

    setCartCount(0);