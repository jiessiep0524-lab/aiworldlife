(() => {
  const PROTECTION_PRODUCT_ID = 10583780229409;
  const ELIGIBLE_SCREEN_PRODUCT_IDS = new Set([10535722746145]);
  let validationPromise;

  async function loadCart() {
    const response = await fetch(`${window.routes.cart_url}.js`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Unable to check cart eligibility.');
    return response.json();
  }

  function buildProtectionUpdates(cart) {
    const eligibleQuantity = cart.items
      .filter((item) => ELIGIBLE_SCREEN_PRODUCT_IDS.has(Number(item.product_id)))
      .reduce((total, item) => total + item.quantity, 0);
    const protectionItems = cart.items.filter((item) => Number(item.product_id) === PROTECTION_PRODUCT_ID);
    const updates = {};
    let remaining = eligibleQuantity;

    protectionItems.forEach((item) => {
      const allowed = Math.min(item.quantity, remaining);
      remaining -= allowed;
      if (allowed !== item.quantity) updates[item.key] = allowed;
    });

    return updates;
  }

  async function enforceProtectionEligibility() {
    if (validationPromise) return validationPromise;
    validationPromise = (async () => {
      const cart = await loadCart();
      const updates = buildProtectionUpdates(cart);
      if (!Object.keys(updates).length) return false;

      const response = await fetch(`${window.routes.cart_update_url}.js`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });
      if (!response.ok) throw new Error('Unable to correct an ineligible protection item.');
      return true;
    })().finally(() => {
      validationPromise = undefined;
    });
    return validationPromise;
  }

  async function validateAndRefresh() {
    try {
      if (await enforceProtectionEligibility()) window.location.reload();
    } catch (error) {
      console.error(error);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.aiworldProtectionCartHasProtection) validateAndRefresh();
    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.cartUpdate, validateAndRefresh);
    }
  });

  document.addEventListener(
    'click',
    async (event) => {
      const checkout = event.target.closest('[name="checkout"], [data-buy-now], .cart__checkout-button');
      if (!checkout || checkout.dataset.protectionEligibilityVerified === 'true') return;

      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        const changed = await enforceProtectionEligibility();
        if (changed) {
          window.alert('Replacement Protection requires an eligible AIWORLD 9-Inch Screen in the same order. The ineligible protection item was removed.');
          window.location.assign(window.routes.cart_url);
          return;
        }
        checkout.dataset.protectionEligibilityVerified = 'true';
        checkout.click();
      } catch (error) {
        console.error(error);
        window.alert('We could not verify protection eligibility. Please review your cart and try again.');
      }
    },
    true,
  );
})();
