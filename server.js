import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;
const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getCJToken() {
  const authRes = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: process.env.CJ_API_KEY }),
  });
  const authData = await authRes.json();
  return authData?.data?.accessToken ?? null;
}

// My products list (CJ "My Product" catalog)
app.get("/api/products", async (req, res) => {
  try {
    const token = await getCJToken();
    if (!token) {
      return res.status(500).json({ error: "Could not get access token" });
    }

    const pageNum = req.query.pageNum ?? "1";
    const pageSize = req.query.pageSize ?? "24";
    const params = new URLSearchParams({ pageNum, pageSize });
    if (req.query.keyword) params.set("keyword", req.query.keyword);

    const productRes = await fetch(
      `${CJ_BASE}/product/myProduct/query?${params}`,
      { headers: { "CJ-Access-Token": token } }
    );
    const productData = await productRes.json();
    res.json(productData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// Single product details (for product.html)
app.get("/api/product", async (req, res) => {
  try {
    const token = await getCJToken();
    if (!token) {
      return res.status(500).json({ error: "Could not get access token" });
    }

    const pid = req.query.pid;
    const productSku = req.query.sku ?? req.query.productSku;
    if (!pid && !productSku) {
      return res.status(400).json({ error: "Provide pid or sku query parameter" });
    }

    const params = new URLSearchParams();
    if (pid) params.set("pid", pid);
    else params.set("productSku", productSku);

    const detailRes = await fetch(`${CJ_BASE}/product/query?${params}`, {
      headers: { "CJ-Access-Token": token },
    });
    const detailData = await detailRes.json();
    res.json(detailData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// Friendly URLs without .html
app.get(["/shop", "/shop/"], (req, res) => {
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(302, `/shop.html${query}`);
});

app.get(["/product", "/product/"], (req, res) => {
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(302, `/product.html${query}`);
});

app.use(express.static(__dirname));

const server = app.listen(PORT, () => {
  console.log(`Baby Hug server running at http://localhost:${PORT}`);
  console.log(`Products API: http://localhost:${PORT}/api/products`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\nPort ${PORT} is already in use.\n` +
        `Stop it with: lsof -ti :${PORT} | xargs kill\n` +
        `Then run: npm run dev\n`
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
