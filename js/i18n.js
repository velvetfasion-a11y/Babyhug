/**
 * Swedish when the browser language is sv*; otherwise English.
 */
export function getLocale() {
  const lang = (navigator.language || "en").toLowerCase();
  return lang.startsWith("sv") ? "sv" : "en";
}

const STRINGS = {
  en: {
    "nav.shopAll": "Shop All",
    "nav.boy": "Boy",
    "nav.girl": "Girl",
    "nav.toys": "Childrens toys",
    "nav.sale": "Sale",
    "nav.about": "About",
    "nav.care": "Care",
    "nav.faq": "FAQ",
    "nav.openMenu": "Open menu",
    "nav.closeMenu": "Close menu",
    "nav.cart": "Cart, {count} items",
    "nav.profile": "Your profile",
    "promo.giftWrap": "Complimentary gift wrapping on all orders over $120",
    "hero.title": "Gentle First Moments",
    "hero.subtitle":
      "Discover a curated world of organic cotton layers and hand-crafted treasures for your little one",
    "hero.cta": "Shop the Collection",
    "home.curated": "Curated for Comfort",
    "home.keepsakes": "Cherished Keepsakes",
    "home.viewFavorites": "View All Favorites",
    "home.carouselPrev": "Previous products",
    "home.carouselNext": "Next products",
    "home.standards": "Our Gentle Standard",
    "home.standard1Title": "100% Organic Fibers",
    "home.standard1Body":
      "Every thread is hand-selected from GOTS-certified cotton, ensuring a soft, breathable foundation for delicate skin.",
    "home.standard2Title": "Sustainably Sourced",
    "home.standard2Body":
      "We partner exclusively with family-owned workshops that share our commitment to slow production and fair labor practices.",
    "home.standard3Title": "Hypoallergenic Dyes",
    "home.standard3Body":
      "Safe, non-toxic pigments that prioritize safety and durability without compromising on the tactile beauty of artisanal design.",
    "home.mothersNote": "A Mother's Note",
    "home.mothersNoteBody":
      "We believe that the items surrounding a child in their first years should be as kind to the earth as they are to delicate skin",
    "home.newsletter": "Join the Nursery",
    "home.newsletterBody":
      "Receive gentle parenting insights and early access to our seasonal handcrafted drops",
    "home.email": "Email",
    "home.subscribeCheck": "Yes, I want to subscribe to your newsletter.",
    "home.subscribe": "Subscribe Now",
    "home.shopAllSection": "Shop All",
    "footer.shop": "Shop",
    "footer.customerCare": "Customer Care",
    "footer.legal": "Legal",
    "footer.shipping": "Shipping Policy",
    "footer.refund": "Refund Policy",
    "footer.gifting": "Gifting Guide",
    "footer.privacy": "Privacy Policy",
    "footer.terms": "Terms & Conditions",
    "footer.accessibility": "Accessibility Statement",
    "footer.philosophy": "Our Philosophy",
    "footer.backHome": "Back to home",
    "shop.title": "Shop All",
    "shop.filterAll": "All",
    "shop.sortLabel": "Sort",
    "shop.boy": "Boy",
    "shop.girl": "Girl",
    "shop.toys": "Childrens toys",
    "shop.sale": "Sale",
    "shop.newIn": "New In",
    "shop.bestSellers": "Best Sellers",
    "shop.boyGirl": "Boy & Girl",
    "shop.filterBy": "Filter by",
    "shop.sort": "Sort products",
    "shop.sortFeatured": "Featured",
    "shop.sortPriceAsc": "Price: Low to High",
    "shop.sortPriceDesc": "Price: High to Low",
    "shop.sortNameAsc": "Name: A–Z",
    "shop.sortNameDesc": "Name: Z–A",
    "shop.products": "Products",
    "shop.noResults": "No products match your filters.",
    "shop.clearFilters": "Clear filters",
    "shop.loading": "Loading products…",
    "shop.productCount": "{count} product",
    "shop.productCountPlural": "{count} products",
    "product.loading": "Loading…",
    "product.quantity": "Quantity",
    "product.addToCart": "Add to Cart",
    "product.selectOptions": "Select options",
    "product.info": "Product Info",
    "product.returns": "Return & Refund Policy",
    "product.shipping": "Shipping Info",
    "product.share": "Share",
    "product.sku": "SKU: {sku}",
    "product.notFound": "Product not found.",
    "product.backShop": "Back to Shop All",
    "product.home": "Home",
    "product.option": "Option {n}",
    "product.defaultDesc": "Imported from our CJ catalog.",
    "product.defaultReturns": "See our return policy in the footer.",
    "product.defaultShipping": "Ships from CJ warehouse.",
    "product.viewImage": "View image {n}",
    "product.decreaseQty": "Decrease quantity",
    "product.increaseQty": "Increase quantity",
    "cart.title": "Cart ({count} {label})",
    "cart.item": "item",
    "cart.items": "items",
    "cart.close": "Close cart",
    "cart.empty": "Your cart is empty.",
    "cart.promo": "Enter a promo code",
    "cart.estimatedTotal": "Estimated total",
    "cart.taxesNote": "Taxes and shipping are calculated at checkout.",
    "cart.checkout": "Checkout",
    "cart.viewCart": "View Cart",
    "cart.secure": "Secure Checkout",
    "cart.remove": "Remove {name}",
    "loading.favorites": "Loading favorites…",
    "loading.noFavorites": "No boy or girl items in your catalog yet.",
    "loading.noCatalog": "No products in your catalog yet.",
    "loading.products": "Loading products…",
    "error.favorites": "Could not load favorites. Check that the server is running.",
    "newsletter.thanks": "Thank you! We'll send gentle updates to {email}.",
    "badge.sale": "Sale",
    "profile.title": "Your profile | Baby Hug",
    "profile.wishlist": "Wishlist",
    "profile.recsTitle": "Your baby might like",
    "profile.recsSub": "Based on what you've been browsing",
    "profile.cart": "Cart",
    "profile.edit": "Edit",
    "profile.noEmail": "Add your email",
    "profile.wishlistEmpty": "Your wishlist is empty. Save items from the shop.",
    "profile.recsEmpty": "Browse the shop to see recommendations.",
    "profile.recsError": "Could not load recommendations.",
    "profile.cartEmpty": "Your cart is empty",
    "profile.checkoutSoon": "Checkout is coming soon — thank you for shopping with Baby Hug.",
    "profile.addToCart": "Add to cart",
    "profile.removeWish": "Remove from wishlist",
    "profile.addedToCart": "{name} added to cart",
    "profile.alreadyInCart": "Already in your cart",
    "profile.removedFromWishlist": "Removed from wishlist",
    "profile.promptName": "Your name",
    "profile.promptEmail": "Your email",
    "profile.qty": "Qty {n}",
    "profile.saveWishlist": "Save to wishlist",
    "profile.signInGoogle": "Sign in with Google",
    "profile.signOut": "Sign out",
    "profile.authHint":
      "Sign in with Google to sync your wishlist and cart across devices.",
    "profile.authNotConfigured":
      "Cloud sign-in is not configured yet. Copy js/firebase-config.example.js to js/firebase-config.js.",
    "profile.signedInWithGoogle": "Signed in with Google",
    "profile.signedIn": "Welcome back!",
    "profile.signedOut": "Signed out",
    "profile.signInFailed": "Could not sign in. Try again.",
  },
  sv: {
    "nav.shopAll": "Handla allt",
    "nav.boy": "Pojke",
    "nav.girl": "Flicka",
    "nav.toys": "Barnleksaker",
    "nav.sale": "Rea",
    "nav.about": "Om oss",
    "nav.care": "Kundservice",
    "nav.faq": "Vanliga frågor",
    "nav.openMenu": "Öppna meny",
    "nav.closeMenu": "Stäng meny",
    "nav.cart": "Varukorg, {count} artiklar",
    "nav.profile": "Din profil",
    "promo.giftWrap": "Gratis presentinslagning på beställningar över 120 $",
    "hero.title": "Mjuka första stunder",
    "hero.subtitle":
      "Upptäck en utvald värld av ekologiska bomullslager och handgjorda skatter för ditt lilla barn",
    "hero.cta": "Handla kollektionen",
    "home.curated": "Utvalt för komfort",
    "home.keepsakes": "Omtyckta minnen",
    "home.viewFavorites": "Se alla favoriter",
    "home.carouselPrev": "Föregående produkter",
    "home.carouselNext": "Nästa produkter",
    "home.standards": "Vår milda standard",
    "home.standard1Title": "100 % ekologiska fibrer",
    "home.standard1Body":
      "Varje tråd är handplockad från GOTS-certifierad bomull för en mjuk, andningsbar grund mot känslig hud.",
    "home.standard2Title": "Hållbart producerat",
    "home.standard2Body":
      "Vi samarbetar enbart med familjeägda verkstäder som delar vårt engagemang för långsam produktion och rättvis arbetsmiljö.",
    "home.standard3Title": "Hypoallergena färgämnen",
    "home.standard3Body":
      "Säkra, icke-toxiska pigment som prioriterar säkerhet och hållbarhet utan att kompromissa med hantverkets skönhet.",
    "home.mothersNote": "Ett mammas ord",
    "home.mothersNoteBody":
      "Vi tror att det som omger ett barn under de första åren ska vara lika snällt mot jorden som mot känslig hud",
    "home.newsletter": "Gå med i nursery",
    "home.newsletterBody":
      "Få milda föräldratips och tidig tillgång till våra säsongsbaserade handgjorda släpp",
    "home.email": "E-post",
    "home.subscribeCheck": "Ja, jag vill prenumerera på ert nyhetsbrev.",
    "home.subscribe": "Prenumerera",
    "home.shopAllSection": "Handla allt",
    "footer.shop": "Handla",
    "footer.customerCare": "Kundservice",
    "footer.legal": "Juridiskt",
    "footer.shipping": "Fraktpolicy",
    "footer.refund": "Returpolicy",
    "footer.gifting": "Presentguide",
    "footer.privacy": "Integritetspolicy",
    "footer.terms": "Villkor",
    "footer.accessibility": "Tillgänglighetsredogörelse",
    "footer.philosophy": "Vår filosofi",
    "footer.backHome": "Tillbaka till startsidan",
    "shop.title": "Handla allt",
    "shop.filterAll": "Alla",
    "shop.sortLabel": "Sortera",
    "shop.boy": "Pojke",
    "shop.girl": "Flicka",
    "shop.toys": "Barnleksaker",
    "shop.sale": "Rea",
    "shop.newIn": "Nyheter",
    "shop.bestSellers": "Bästsäljare",
    "shop.boyGirl": "Pojke & flicka",
    "shop.filterBy": "Filtrera efter",
    "shop.sort": "Sortera produkter",
    "shop.sortFeatured": "Utvalda",
    "shop.sortPriceAsc": "Pris: lägst först",
    "shop.sortPriceDesc": "Pris: högst först",
    "shop.sortNameAsc": "Namn: A–Ö",
    "shop.sortNameDesc": "Namn: Ö–A",
    "shop.products": "Produkter",
    "shop.noResults": "Inga produkter matchar dina filter.",
    "shop.clearFilters": "Rensa filter",
    "shop.loading": "Laddar produkter…",
    "shop.productCount": "{count} produkt",
    "shop.productCountPlural": "{count} produkter",
    "product.loading": "Laddar…",
    "product.quantity": "Antal",
    "product.addToCart": "Lägg i varukorgen",
    "product.selectOptions": "Välj alternativ",
    "product.info": "Produktinfo",
    "product.returns": "Retur- och återbetalningspolicy",
    "product.shipping": "Fraktinfo",
    "product.share": "Dela",
    "product.sku": "Art.nr: {sku}",
    "product.notFound": "Produkten hittades inte.",
    "product.backShop": "Tillbaka till butiken",
    "product.home": "Startsida",
    "product.option": "Alternativ {n}",
    "product.defaultDesc": "Importerad från vår CJ-katalog.",
    "product.defaultReturns": "Se vår returpolicy i sidfoten.",
    "product.defaultShipping": "Skickas från CJ-lager.",
    "product.viewImage": "Visa bild {n}",
    "product.decreaseQty": "Minska antal",
    "product.increaseQty": "Öka antal",
    "cart.title": "Varukorg ({count} {label})",
    "cart.item": "artikel",
    "cart.items": "artiklar",
    "cart.close": "Stäng varukorgen",
    "cart.empty": "Din varukorg är tom.",
    "cart.promo": "Ange en rabattkod",
    "cart.estimatedTotal": "Beräknad summa",
    "cart.taxesNote": "Moms och frakt beräknas i kassan.",
    "cart.checkout": "Till kassan",
    "cart.viewCart": "Visa varukorg",
    "cart.secure": "Säker betalning",
    "cart.remove": "Ta bort {name}",
    "loading.favorites": "Laddar favoriter…",
    "loading.noFavorites": "Inga pojk- eller flickprodukter i katalogen ännu.",
    "loading.noCatalog": "Inga produkter i katalogen ännu.",
    "loading.products": "Laddar produkter…",
    "error.favorites": "Kunde inte ladda favoriter. Kontrollera att servern körs.",
    "newsletter.thanks": "Tack! Vi skickar mjuka uppdateringar till {email}.",
    "badge.sale": "Rea",
    "profile.title": "Din profil | Baby Hug",
    "profile.wishlist": "Önskelista",
    "profile.recsTitle": "Ditt barn kanske gillar",
    "profile.recsSub": "Baserat på vad du tittat på",
    "profile.cart": "Varukorg",
    "profile.edit": "Redigera",
    "profile.noEmail": "Lägg till din e-post",
    "profile.wishlistEmpty": "Din önskelista är tom. Spara produkter från butiken.",
    "profile.recsEmpty": "Handla i butiken för att se rekommendationer.",
    "profile.recsError": "Kunde inte ladda rekommendationer.",
    "profile.cartEmpty": "Din varukorg är tom",
    "profile.checkoutSoon": "Kassan kommer snart — tack för att du handlar hos Baby Hug.",
    "profile.addToCart": "Lägg i varukorgen",
    "profile.removeWish": "Ta bort från önskelistan",
    "profile.addedToCart": "{name} lades i varukorgen",
    "profile.alreadyInCart": "Finns redan i varukorgen",
    "profile.removedFromWishlist": "Borttagen från önskelistan",
    "profile.promptName": "Ditt namn",
    "profile.promptEmail": "Din e-post",
    "profile.qty": "Antal {n}",
    "profile.saveWishlist": "Spara i önskelistan",
    "profile.signInGoogle": "Logga in med Google",
    "profile.signOut": "Logga ut",
    "profile.authHint":
      "Logga in med Google för att synka önskelista och varukorg mellan enheter.",
    "profile.authNotConfigured":
      "Molnbaserad inloggning är inte konfigurerad. Kopiera js/firebase-config.example.js till js/firebase-config.js.",
    "profile.signedInWithGoogle": "Inloggad med Google",
    "profile.signedIn": "Välkommen tillbaka!",
    "profile.signedOut": "Utloggad",
    "profile.signInFailed": "Kunde inte logga in. Försök igen.",
  },
};

/** Common CJ Chinese option labels → localized names */
const CJ_OPTION_LABELS = {
  颜色: { en: "Color", sv: "Färg" },
  尺码: { en: "Size", sv: "Storlek" },
  尺寸: { en: "Size", sv: "Storlek" },
  适合身高: { en: "Height", sv: "Längd" },
  规格: { en: "Style", sv: "Utförande" },
  款式: { en: "Style", sv: "Modell" },
  材质: { en: "Material", sv: "Material" },
};

export function t(key, params = {}) {
  const locale = getLocale();
  let text = STRINGS[locale]?.[key] ?? STRINGS.en[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    text = text.split(`{${k}}`).join(String(v));
  }
  return text;
}

/** Localize CJ option category labels (e.g. 颜色 → Color / Färg). */
export function localizeOptionLabel(label) {
  const raw = String(label ?? "").trim();
  if (!raw) return raw;

  const mapped = CJ_OPTION_LABELS[raw];
  if (mapped) {
    return getLocale() === "sv" ? mapped.sv : mapped.en;
  }

  return raw;
}

function setText(el, key, params) {
  if (!el) return;
  el.textContent = t(key, params);
}

function setHtml(el, key, params) {
  if (!el) return;
  el.innerHTML = t(key, params);
}

function setAria(el, key, params) {
  if (!el) return;
  el.setAttribute("aria-label", t(key, params));
}

function linkText(selector, key) {
  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = t(key);
  });
}

/** Apply translations to shared chrome + page-specific blocks. */
export function applyPageTranslations() {
  const locale = getLocale();
  document.documentElement.lang = locale === "sv" ? "sv" : "en";

  const page = document.body.dataset.page;

  setAria(document.querySelector(".menu-toggle"), "nav.openMenu");
  setAria(document.querySelector(".mobile-nav-close"), "nav.closeMenu");

  linkText('.nav-left a[href="shop.html"], #mobile-nav a[href="shop.html"]', "nav.shopAll");
  linkText('.nav-left a[href*="category=Boy"], #mobile-nav a[href*="category=Boy"]', "nav.boy");
  linkText('.nav-left a[href*="category=Girl"], #mobile-nav a[href*="category=Girl"]', "nav.girl");
  linkText('.nav-left a[href*="category=Toys"], #mobile-nav a[href*="category=Toys"]', "nav.toys");
  linkText('.nav-sub a[href*="badge=Sale"], #mobile-nav a[href*="badge=Sale"]', "nav.sale");
  linkText('.nav-sub a[href*="#about"], #mobile-nav a[href*="#about"]', "nav.about");
  linkText('#mobile-nav a[href*="#care"]', "nav.care");
  linkText('#mobile-nav a[href*="#faq"]', "nav.faq");

  document.querySelectorAll(".promo-track span").forEach((el) => {
    el.textContent = t("promo.giftWrap");
  });

  document.querySelectorAll('.footer-col a[href="shop.html"]').forEach((el) => {
    if (el.closest(".footer-col")?.querySelector("h4")?.textContent?.match(/shop|handla/i)) {
      el.textContent = t("nav.shopAll");
    }
  });
  document.querySelectorAll('.footer-col ul a[href*="category=Boy"]').forEach((el) => {
    el.textContent = t("nav.boy");
  });
  document.querySelectorAll('.footer-col ul a[href*="category=Girl"]').forEach((el) => {
    el.textContent = t("nav.girl");
  });
  document.querySelectorAll('.footer-col ul a[href*="category=Toys"]').forEach((el) => {
    el.textContent = t("nav.toys");
  });
  document.querySelectorAll('.footer-col ul a[href*="badge=Sale"]').forEach((el) => {
    el.textContent = t("nav.sale");
  });

  const footerH4 = document.querySelectorAll(".footer-col h4");
  footerH4.forEach((h4) => {
    const text = h4.textContent.trim();
    if (text === "Shop") setText(h4, "footer.shop");
    if (text === "Customer Care") setText(h4, "footer.customerCare");
    if (text === "Legal") setText(h4, "footer.legal");
  });

  const footerLinks = {
  "Shipping Policy": "footer.shipping",
  "Refund Policy": "footer.refund",
  "Gifting Guide": "footer.gifting",
  "Privacy Policy": "footer.privacy",
  "Terms & Conditions": "footer.terms",
  "Accessibility Statement": "footer.accessibility",
  "Our Philosophy": "footer.philosophy",
  };
  document.querySelectorAll(".footer-col a").forEach((a) => {
    const key = footerLinks[a.textContent.trim()];
    if (key) a.textContent = t(key);
  });

  document.querySelectorAll('a[href="index.html"]').forEach((a) => {
    if (a.textContent.trim() === "Back to home") a.textContent = t("footer.backHome");
  });

  if (page === "home") applyHomeTranslations();
  if (page === "shop") applyShopTranslations();
  if (page === "product") applyProductStaticTranslations();
  if (page === "profile") applyProfileTranslations();

  document.querySelectorAll('a.profile-btn[href*="profile"]').forEach((el) => {
    setAria(el, "nav.profile");
  });
}

function applyProfileTranslations() {
  document.title = t("profile.title");
  setText(document.getElementById("profile-wishlist-title"), "profile.wishlist");
  setText(document.getElementById("profile-recs-title"), "profile.recsTitle");
  setText(document.getElementById("profile-recs-sub"), "profile.recsSub");
  setText(document.getElementById("profile-cart-title"), "profile.cart");
  setText(document.getElementById("profile-auth-hint"), "profile.authHint");
  setText(document.getElementById("profile-google-label"), "profile.signInGoogle");
  const editBtn = document.getElementById("profile-edit-btn");
  if (editBtn) editBtn.textContent = t("profile.edit");
  const signOut = document.getElementById("profile-signout-btn");
  if (signOut) signOut.textContent = t("profile.signOut");
  const checkout = document.getElementById("profile-checkout-btn");
  if (checkout) checkout.textContent = t("cart.checkout");
}

function applyHomeTranslations() {
  document.title = getLocale() === "sv" ? "Startsida | Baby Hug" : "Home | Baby Hug";

  setText(document.getElementById("hero-title"), "hero.title");
  const heroP = document.querySelector(".hero-content p");
  if (heroP) heroP.textContent = t("hero.subtitle");
  const heroCta = document.querySelector(".hero-content .btn");
  if (heroCta) heroCta.textContent = t("hero.cta");

  setText(document.getElementById("curated-title"), "home.curated");
  document.querySelectorAll('.category-card[href*="Boy"] span').forEach((el) => {
    el.textContent = t("nav.boy");
  });
  document.querySelectorAll('.category-card[href*="Boy"] img').forEach((el) => {
    el.alt = t("nav.boy");
  });
  document.querySelectorAll('.category-card[href*="Girl"] span').forEach((el) => {
    el.textContent = t("nav.girl");
  });
  document.querySelectorAll('.category-card[href*="Girl"] img').forEach((el) => {
    el.alt = t("nav.girl");
  });
  document.querySelectorAll('.category-card[href*="Toys"] span').forEach((el) => {
    el.textContent = t("nav.toys");
  });
  document.querySelectorAll('.category-card[href*="Toys"] img').forEach((el) => {
    el.alt = t("nav.toys");
  });

  setText(document.getElementById("keepsakes-title"), "home.keepsakes");
  const favBtn = document.querySelector(".keepsakes-panel-header .btn");
  if (favBtn) favBtn.textContent = t("home.viewFavorites");
  setAria(document.querySelector(".carousel-arrow--prev"), "home.carouselPrev");
  setAria(document.querySelector(".carousel-arrow--next"), "home.carouselNext");

  setText(document.getElementById("standard-title"), "home.standards");
  const standards = document.querySelectorAll(".standard-item");
  const stdKeys = [
    ["home.standard1Title", "home.standard1Body"],
    ["home.standard2Title", "home.standard2Body"],
    ["home.standard3Title", "home.standard3Body"],
  ];
  standards.forEach((item, i) => {
    const [titleKey, bodyKey] = stdKeys[i] ?? [];
    if (titleKey) item.querySelector("h3").textContent = t(titleKey);
    if (bodyKey) item.querySelector("p").textContent = t(bodyKey);
  });

  setText(document.getElementById("note-title"), "home.mothersNote");
  const noteP = document.querySelector(".mothers-note-content p");
  if (noteP) noteP.textContent = t("home.mothersNoteBody");

  setText(document.getElementById("nursery-title"), "home.newsletter");
  const newsP = document.querySelector(".newsletter > p");
  if (newsP) newsP.textContent = t("home.newsletterBody");
  const emailLabel = document.querySelector('label[for="email"]');
  if (emailLabel) emailLabel.textContent = t("home.email");
  const checkSpan = document.querySelector(".checkbox-row span");
  if (checkSpan) checkSpan.textContent = t("home.subscribeCheck");
  const subBtn = document.querySelector("#newsletter-form .btn");
  if (subBtn) subBtn.textContent = t("home.subscribe");

  const shopH2 = document.querySelector(".cj-products-section .section-title");
  if (shopH2) shopH2.textContent = t("home.shopAllSection");

  document.querySelectorAll(".cj-loading").forEach((el) => {
    el.textContent = t("loading.products");
  });
}

function applyShopTranslations() {
  document.title = getLocale() === "sv" ? "Handla allt | Baby Hug" : "Shop All | Baby Hug";

  const filterMap = {
    all: "shop.filterAll",
    Boy: "shop.boy",
    Girl: "shop.girl",
    Toys: "shop.toys",
    Sale: "shop.sale",
    "New Arrival": "shop.newIn",
    "Best Seller": "shop.bestSellers",
  };
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    const key = filterMap[btn.dataset.filter];
    if (key) btn.textContent = t(key);
  });

  const sort = document.getElementById("sort-select");
  if (sort) {
    const options = sort.querySelectorAll("option");
    const keys = [
      "shop.sortFeatured",
      "shop.sortPriceAsc",
      "shop.sortPriceDesc",
      "shop.sortNameAsc",
      "shop.sortNameDesc",
    ];
    options.forEach((opt, i) => {
      if (keys[i]) opt.textContent = t(keys[i]);
    });
    setAria(sort, "shop.sort");
  }

  const filters = document.querySelector(".shop-filters");
  if (filters) filters.setAttribute("aria-label", t("shop.filterBy"));

  const grid = document.getElementById("shop-grid");
  if (grid) grid.setAttribute("aria-label", t("shop.products"));

  const sortLabel = document.querySelector(".sort-label");
  if (sortLabel) {
    const svg = sortLabel.querySelector("svg");
    sortLabel.textContent = "";
    if (svg) sortLabel.appendChild(svg);
    sortLabel.append(` ${t("shop.sortLabel")}`);
  }

  const noResults = document.getElementById("shop-no-results");
  const clearBtn = document.getElementById("shop-clear-btn");
  if (noResults && clearBtn) {
    noResults.childNodes[0].textContent = `${t("shop.noResults")} `;
    clearBtn.textContent = t("shop.clearFilters");
  }
}

export function applyProductStaticTranslations() {
  const qtyLabel = document.querySelector('.product-qty-block label[for="product-qty"]');
  if (qtyLabel) {
    qtyLabel.innerHTML = `${t("product.quantity")} <span aria-hidden="true">*</span>`;
  }

  setAria(document.querySelector(".qty-minus"), "product.decreaseQty");
  setAria(document.querySelector(".qty-plus"), "product.increaseQty");

  const addBtn = document.getElementById("add-to-cart");
  if (addBtn && !addBtn.disabled) addBtn.textContent = t("product.addToCart");

  const accordionKeys = {
    "accordion-info-body": "product.info",
    "accordion-return-body": "product.returns",
    "accordion-shipping-body": "product.shipping",
  };
  document.querySelectorAll(".product-accordion-trigger").forEach((btn) => {
    const key = accordionKeys[btn.getAttribute("aria-controls")];
    if (!key) return;
    const icon = btn.querySelector(".product-accordion-icon");
    btn.textContent = `${t(key)} `;
    if (icon) btn.appendChild(icon);
  });

  const share = document.querySelector(".product-share");
  if (share) share.setAttribute("aria-label", t("product.share"));

  document.querySelectorAll(".product-thumb").forEach((btn, i) => {
    setAria(btn, "product.viewImage", { n: i + 1 });
  });
}

export function initI18n() {
  applyPageTranslations();
}
