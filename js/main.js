import { PRODUCTS, wixImage, formatPrice, productUrl } from "./products.js";
import { initCart } from "./cart.js";
import { whenIdle } from "./perf.js";

function renderProducts() {
  const track = document.getElementById("products-carousel");
  if (!track) return;

  track.innerHTML = PRODUCTS.map((product) => {
    const badge = product.badge
      ? `<span class="product-badge">${product.badge}</span>`
      : "";
    const priceHtml = product.originalPrice
      ? `<p class="product-price product-price--sale"><s>${formatPrice(product.originalPrice)}</s><span>${formatPrice(product.price)}</span></p>`
      : `<p class="product-price">${formatPrice(product.price)}</p>`;

    return `
      <a href="${productUrl(product.slug)}" class="product-card">
        <div class="product-image-wrap">
          <img src="${wixImage(product.image, 440, 440)}" alt="${product.name}" width="440" height="440" loading="lazy" decoding="async" />
          ${badge}
        </div>
        <h3 class="product-name">${product.name}</h3>
        ${priceHtml}
      </a>
    `;
  }).join("");

  initCarouselArrows(track);
}

function initCarouselArrows(track) {
  const wrap = track.closest(".carousel-wrap");
  if (!wrap) return;

  const prev = wrap.querySelector(".carousel-arrow--prev");
  const next = wrap.querySelector(".carousel-arrow--next");
  if (!prev || !next) return;

  const scrollAmount = () => track.clientWidth * 0.75;

  const updateArrows = () => {
    const atStart = track.scrollLeft <= 4;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    prev.hidden = atStart;
    next.hidden = atEnd;
  };

  prev.addEventListener("click", () => {
    track.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
  });

  next.addEventListener("click", () => {
    track.scrollBy({ left: scrollAmount(), behavior: "smooth" });
  });

  track.addEventListener("scroll", updateArrows, { passive: true });
  updateArrows();
}

function initMobileNav() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("mobile-nav");
  const close = document.querySelector(".mobile-nav-close");
  if (!toggle || !nav) return;

  const open = () => {
    nav.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };

  const shut = () => {
    nav.classList.remove("is-open");
    document.body.style.overflow = "";
  };

  toggle.addEventListener("click", open);
  close?.addEventListener("click", shut);
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", shut));
}

function initNewsletter() {
  const form = document.getElementById("newsletter-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = new FormData(form).get("email");
    alert(`Thank you! We'll send gentle updates to ${email}.`);
    form.reset();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  initMobileNav();
  initNewsletter();
  whenIdle(() => initCart());
});
