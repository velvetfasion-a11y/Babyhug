/**
 * Real-time Firestore `products` collection → storefront catalog.
 */
import { db } from "./firebase-config.js";
import { collection, onSnapshot } from "firebase/firestore";
import { normalizeListProduct } from "./cj-products.js";

/**
 * Map a Firestore product document to the shape used by shop cards / filters.
 * @param {string} docId
 * @param {Record<string, unknown>} data
 */
export function mapFirestoreProduct(docId, data) {
  const categories = Array.isArray(data.categories)
    ? data.categories
    : data.category
      ? [data.category]
      : [];

  const image =
    data.image ??
    data.imageUrl ??
    data.bigImage ??
    data.thumbnail ??
    "";

  const price =
    data.sellPrice ??
    data.price ??
    data.priceLocal ??
    data.priceDisplay ??
    null;

  return normalizeListProduct({
    ...data,
    productId: data.productId ?? data.pid ?? docId,
    pid: data.pid ?? data.productId ?? docId,
    sku: data.sku ?? data.productSku ?? "",
    productSku: data.productSku ?? data.sku ?? "",
    nameEn: data.name ?? data.title ?? data.nameEn ?? data.productNameEn ?? "",
    productNameEn: data.productNameEn ?? data.name ?? data.title ?? "",
    sellPrice: price,
    bigImage: image,
    adminTitle: data.title ?? data.name,
    adminPriceDisplay: data.priceDisplay ?? null,
    adminPriceLocal: data.priceLocal ?? null,
    adminCategories: categories.length ? categories : data.adminCategories,
    adminCategory: categories[0] ?? data.adminCategory,
  });
}

/**
 * Listen to `products` in real time. Returns Firestore unsubscribe.
 * @param {{ onProducts: (products: object[]) => void, onError?: (err: Error) => void }} handlers
 */
export function listenToProductsCollection({ onProducts, onError }) {
  const productsRef = collection(db, "products");

  return onSnapshot(
    productsRef,
    (snapshot) => {
      const products = snapshot.docs.map((docSnap) =>
        mapFirestoreProduct(docSnap.id, docSnap.data())
      );
      onProducts(products);
    },
    (err) => {
      console.error("Firestore products listener:", err);
      onError?.(err);
    }
  );
}
