import {
  buildCarouselCard,
  fetchCJProducts,
  pickBoyGirlCarousel,
  attachProductCardPrefetch,
} from "./cj-products.js";
import { initCart } from "./cart.js";
import { whenIdle } from "./perf.js";
import { t } from "./i18n.js";
import { bootstrap } from "./bootstrap.js";

async function renderKeepsakesCarousel() {
  const track = document.getElementById("products-carousel");
  if (!track) return;

  track.innerHTML = `<p class="carousel-loading">${t("loading.favorites")}</p>`;

  try {
    const { products } = await fetchCJProducts(48);
    const boyGirl = pickBoyGirlCarousel(products, 12);

    if (!boyGirl.length) {
      track.innerHTML = `<p class="carousel-loading">${t("loading.noFavorites")}</p>`;
      return;
    }

    track.innerHTML = boyGirl.map((p) => buildCarouselCard(p)).join("");
    attachProductCardPrefetch(track);
    initCarouselArrows(track);
  } catch (err) {
    console.error("Keepsakes carousel:", err);
    track.innerHTML = `<p class="carousel-loading">${t("error.favorites")}</p>`;
  }
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
    alert(t("newsletter.thanks", { email }));
    form.reset();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await bootstrap();
  renderKeepsakesCarousel();
  initMobileNav();
  initNewsletter();
  whenIdle(() => initCart());
});
