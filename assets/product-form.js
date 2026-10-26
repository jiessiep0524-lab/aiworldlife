if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');
        this.buyNowButton = this.querySelector('[data-buy-now]');
        this.warmCheckoutConnections();
        if (this.buyNowButton) {
          const warm = () => this.warmCheckoutConnections(true);
          this.buyNowButton.addEventListener('pointerenter', warm, { passive: true });
          this.buyNowButton.addEventListener('pointerdown', warm, { passive: true });
          this.buyNowButton.addEventListener('touchstart', warm, { passive: true });
        }
        this.addEventListener('click', (event) => {
          const buyNowButton = event.target.closest('[data-buy-now]');
          if (!buyNowButton) return;
          this.buyNowButton = buyNowButton;
          this.warmCheckoutConnections(true);
          this.onSubmitHandler(event, { buyNow: true });
        });

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt, options = {}) {
        const buyNow = options.buyNow === true;
        const activeButton = buyNow ? this.buyNowButton : this.submitButton;
        evt.preventDefault();
        if (!activeButton || activeButton.getAttribute('aria-disabled') === 'true' || activeButton.hasAttribute('disabled')) return;

        this.handleErrorMessage();
        this.error = false;

        [this.submitButton, this.buyNowButton].forEach((button) => {
          if (!button) return;
          button.setAttribute('aria-disabled', 'true');
          if (button === activeButton) button.classList.add('loading');
        });
        activeButton.querySelector('.loading__spinner')?.classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (!buyNow && this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        const variantId = formData.get('id');
        const quantity = parseInt(formData.get('quantity')) || 1;
        const linesUpdateDeferred = this.createCartLinesUpdateEvent(variantId, quantity);
        const addons = Array.from(this.form.querySelectorAll('[data-addon-input]')).filter(
          (input) => !input.disabled && input.value
        );

        const addAddon = (input) => {
          const addonConfig = fetchConfig('javascript');
          addonConfig.headers['X-Requested-With'] = 'XMLHttpRequest';
          delete addonConfig.headers['Content-Type'];
          const addonData = new FormData();
          addonData.append('id', input.value);
          addonData.append('quantity', String(quantity));
          addonConfig.body = addonData;

          return fetch(`${routes.cart_add_url}`, addonConfig)
            .then((response) => response.json())
            .then((response) => {
              if (response.status) {
                throw new Error(response.description || response.message || 'Could not add the selected add-on.');
              }
            });
        };

        if (buyNow) {
          const lines = addons.map((input) => `${input.value}:${quantity}`);
          if (variantId) lines.push(`${variantId}:${quantity}`);
          if (!lines.length) return;
          window.location.assign(`${routes.cart_url}/${lines.join(",")}?checkout&skip_shop_pay=true`);
          return;
        }
        addons
          .reduce((chain, input) => chain.then(() => addAddon(input)), Promise.resolve())
          .then(() => fetch(`${routes.cart_add_url}`, config))
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: variantId,
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);
              this.dispatchCartErrorEvent(response.description || response.message, 'INVALID');
              linesUpdateDeferred?.reject(new Error(response.description || response.message));

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButtonText.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (buyNow) {
              window.location.assign(this.buyNowButton.dataset.checkoutUrl || '/checkout');
              return;
            } else if (!this.cart) {
              this.resolveCartLinesUpdate(linesUpdateDeferred);
              window.location = window.routes.cart_url;
              return;
            }

            this.resolveCartLinesUpdate(linesUpdateDeferred);

            const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');
            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: variantId,
                cartData: response,
              }).then(() => {
                CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
              });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    CartPerformance.measure("add:paint-updated-sections", () => {
                      this.cart.renderContents(response);
                    });
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              CartPerformance.measure("add:paint-updated-sections", () => {
                this.cart.renderContents(response);
              });
            }
          })
          .catch((e) => {
            console.error(e);
            this.handleErrorMessage(e.message || 'Network error');
            this.dispatchCartErrorEvent(e.message || 'Network error', 'SERVICE_UNAVAILABLE');
            linesUpdateDeferred?.reject(e);
          })
          .finally(() => {
            if (buyNow && !this.error) return;

            [this.submitButton, this.buyNowButton].forEach((button) => {
              if (!button) return;
              button.classList.remove('loading');
              button.querySelector('.loading__spinner')?.classList.add('hidden');
              if (!this.error) button.removeAttribute('aria-disabled');
            });
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');

            CartPerformance.measureFromEvent("add:user-action", evt);
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }


      warmCheckoutConnections(prefetchCheckout = false) {
        const hosts = [
          ['preconnect', 'https://shop.app', true],
          ['preconnect', 'https://cdn.shopify.com', true],
          ['dns-prefetch', 'https://checkout.shopify.com', false],
          ['dns-prefetch', 'https://checkout.pci.shopifyinc.com', false],
          ['dns-prefetch', 'https://pay.shopify.com', false],
        ];
        hosts.forEach(([rel, href, crossOrigin]) => {
          const marker = '[data-aiworld-checkout-warm="' + rel + ':' + href + '"]';
          if (document.head.querySelector(marker)) return;
          const link = document.createElement('link');
          link.rel = rel;
          link.href = href;
          if (crossOrigin) link.crossOrigin = 'anonymous';
          link.setAttribute('data-aiworld-checkout-warm', rel + ':' + href);
          document.head.appendChild(link);
        });

        if (!prefetchCheckout || document.head.querySelector('[data-aiworld-checkout-prefetch]')) return;
        const prefetch = document.createElement('link');
        prefetch.rel = 'prefetch';
        prefetch.as = 'document';
        prefetch.href = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root ? window.Shopify.routes.root : '/') + 'checkout';
        prefetch.setAttribute('data-aiworld-checkout-prefetch', '');
        document.head.appendChild(prefetch);
      }

      createCartLinesUpdateEvent(variantId, quantity) {
        const { CartLinesUpdateEvent } = window.StandardEvents || {};
        if (!CartLinesUpdateEvent) return null;

        const deferred = CartLinesUpdateEvent.createPromise();
        this.dispatchEvent(
          new CartLinesUpdateEvent({
            action: 'add',
            context: 'product',
            lines: [{ merchandiseId: variantId, quantity }],
            promise: deferred.promise,
          })
        );
        return deferred;
      }

      resolveCartLinesUpdate(deferred) {
        if (!deferred) return;
        const { CartLinesUpdateEvent } = window.StandardEvents || {};
        if (!CartLinesUpdateEvent) return;

        const pendingCartDataPromise = typeof CartItems !== 'undefined'
          ? CartItems.fetchCartData()
          : fetch(`${routes.cart_url}.json`).then((response) => response.json());

        pendingCartDataPromise
          .then((cart) => {
            if (!cart?.currency) return deferred.reject(new Error('Missing currency in cart response'));
            deferred.resolve({ cart: CartLinesUpdateEvent.createCartFromAjaxResponse(cart) });
          })
          .catch((e) => deferred.reject(e));
      }

      dispatchCartErrorEvent(message, code) {
        const { CartErrorEvent } = window.StandardEvents || {};
        if (!CartErrorEvent) return;
        this.dispatchEvent(new CartErrorEvent({ error: message, code }));
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }
    }
  );
}
