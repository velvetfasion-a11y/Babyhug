/** Run callback when the browser is idle (or after a short delay). */
export function whenIdle(fn) {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => fn(), { timeout: 2000 });
  } else {
    setTimeout(fn, 1);
  }
}

/** Load data only when an element scrolls near the viewport. */
export function loadWhenVisible(element, loadFn, rootMargin = "300px") {
  if (!element) return;

  if (!("IntersectionObserver" in window)) {
    loadFn();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        loadFn();
      }
    },
    { rootMargin }
  );

  observer.observe(element);
}
