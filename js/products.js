export const WIX_MEDIA = "https://static.wixstatic.com/media";

export function wixImage(fileId, w, h) {
  return `${WIX_MEDIA}/${fileId}/v1/fill/w_${w},h_${h},al_c,q_85,enc_auto/${fileId}`;
}

export function formatPrice(amount) {
  return `$${amount.toFixed(2)}`;
}

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function productUrl(slug) {
  return `product.html?id=${encodeURIComponent(slug)}`;
}

const defaultDescription =
  "Crafted for delicate skin, this piece combines breathable natural fibers with thoughtful details. Soft against the body and easy to layer, it is designed for everyday comfort from nap time to first outings.";

const defaultProductInfo = `
<p>Available in newborn through 12–18 months. Please refer to our size chart for measurements.</p>
<p><strong>Material:</strong> Premium natural fibers, OEKO-TEX® certified where applicable.</p>
<p><strong>Care:</strong> Machine wash cold on gentle cycle. Lay flat or tumble dry low. Do not bleach.</p>
`;

const defaultReturnPolicy = `
<p>We accept returns within 30 days of delivery on unworn items with original tags attached. Gift items may be exchanged for store credit.</p>
`;

const defaultShippingInfo = `
<p>Complimentary standard shipping on orders over $120. Orders ship within 2–3 business days. Express options available at checkout.</p>
`;

export const PRODUCTS = [
  {
    slug: "wooden-mobile",
    sku: "000010",
    name: "Wooden Mobile",
    price: 79,
    badge: "New Arrival",
    category: "Toys",
    image: "c837a6_b121077eec39419d9a35b97779ac8360~mv2.jpg",
    description:
      "A hand-finished wooden mobile with gentle movement to soothe little ones. Suspended shapes are sanded smooth and finished with non-toxic oils for nursery-safe display.",
    productInfo: defaultProductInfo,
    returnPolicy: defaultReturnPolicy,
    shippingInfo: defaultShippingInfo,
  },
  {
    slug: "merino-wool-onesie",
    sku: "000011",
    name: "Merino Wool Onesie",
    price: 79,
    badge: "New Arrival",
    category: "Boy",
    image: "c837a6_71c5cff0d9334573a7b43c09065ba249~mv2.jpg",
    description:
      "Our signature onesie is knit from the finest organic cotton with a subtle ribbed texture. Featuring natural wooden buttons and envelope shoulders for easy dressing, it is the perfect foundation for any nursery wardrobe.",
    productInfo: `
<p>Available in sizes 0–3M through 12–18M. Snug fit; size up if between sizes.</p>
<p><strong>Material:</strong> 100% organic merino wool blend, GOTS certified.</p>
<p><strong>Care:</strong> Hand wash cold or machine wash on wool cycle. Lay flat to dry. Do not bleach or iron directly on buttons.</p>
`,
    returnPolicy: defaultReturnPolicy,
    shippingInfo: defaultShippingInfo,
  },
  {
    slug: "keepsake-bear",
    sku: "000012",
    name: "Keepsake Bear",
    price: 45,
    badge: "Best Seller",
    category: "Toys",
    image: "c837a6_fb684c3e513143a6950291eac016183f~mv2.jpg",
    description: defaultDescription,
    productInfo: defaultProductInfo,
    returnPolicy: defaultReturnPolicy,
    shippingInfo: defaultShippingInfo,
  },
  {
    slug: "soft-knit-onesie",
    sku: "000013",
    name: "Soft Knit Onesie",
    price: 39,
    originalPrice: 49,
    badge: "Sale",
    category: "Girl",
    image: "c837a6_c015ef04aee541e2830d91505136075e~mv2.jpg",
    description:
      "A cloud-soft knit onesie with envelope neckline and snap closures at the leg. Gentle stretch moves with your baby through every wiggle and stretch.",
    productInfo: defaultProductInfo,
    returnPolicy: defaultReturnPolicy,
    shippingInfo: defaultShippingInfo,
  },
  {
    slug: "organic-cotton-washcloths",
    sku: "000014",
    name: "Organic Cotton Washcloths",
    price: 59,
    category: "Girl",
    image: "c837a6_bf69c3e0968d4935a02d5709d05453af~mv2.png",
    description:
      "A set of ultra-soft washcloths woven from organic cotton. Generously sized for bath time and gentle enough for daily face and hands.",
    productInfo: defaultProductInfo,
    returnPolicy: defaultReturnPolicy,
    shippingInfo: defaultShippingInfo,
  },
  {
    slug: "merino-wool-socks",
    sku: "000015",
    name: "Merino Wool Socks",
    price: 15,
    badge: "Best Seller",
    category: "Boy",
    image: "c837a6_4567ade109754817811e3a75c75b03fa~mv2.jpg",
    description: defaultDescription,
    productInfo: defaultProductInfo,
    returnPolicy: defaultReturnPolicy,
    shippingInfo: defaultShippingInfo,
  },
  {
    slug: "organic-swaddle-set",
    sku: "000016",
    name: "Organic Swaddle Set",
    price: 15,
    originalPrice: 30,
    badge: "Sale",
    category: "Girl",
    image: "c837a6_5fbbb04fe942442ab7c64ee06e2c200e~mv2.jpg",
    description: defaultDescription,
    productInfo: defaultProductInfo,
    returnPolicy: defaultReturnPolicy,
    shippingInfo: defaultShippingInfo,
  },
  {
    slug: "soft-knit-hat",
    sku: "000017",
    name: "Soft Knit Hat",
    price: 24,
    category: "Boy",
    image: "c837a6_22152db8b9d64feea2284501aa7fc9ea~mv2.jpg",
    description: defaultDescription,
    productInfo: defaultProductInfo,
    returnPolicy: defaultReturnPolicy,
    shippingInfo: defaultShippingInfo,
  },
  {
    slug: "rubber-pacifier",
    sku: "000018",
    name: "Rubber Pacifier",
    price: 19,
    category: "Toys",
    image: "c837a6_4d05d3bfdb04403daf756b5f725d34e8~mv2.jpg",
    description: defaultDescription,
    productInfo: defaultProductInfo,
    returnPolicy: defaultReturnPolicy,
    shippingInfo: defaultShippingInfo,
  },
];

export function getProductBySlug(slug) {
  return PRODUCTS.find((p) => p.slug === slug);
}
