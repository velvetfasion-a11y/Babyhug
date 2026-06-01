import "dotenv/config";

const API_KEY = process.env.CJ_API_KEY;

if (!API_KEY) {
  console.error("Error: CJ_API_KEY not found in .env file.");
  process.exit(1);
}

async function fetchCategories() {
  // Step 1: Get access token
  console.log("Step 1: Requesting access token...");

  const authRes = await fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: API_KEY }),
    }
  );

  const authData = await authRes.json();
  const token = authData?.data?.accessToken;

  if (!token) {
    console.error("Failed to get access token. Full response:", authData);
    process.exit(1);
  }

  console.log("Access token received.\n");

  // Step 2: Fetch product categories
  console.log("Step 2: Fetching product categories...");

  const categoryRes = await fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/product/getCategory",
    {
      method: "GET",
      headers: { "CJ-Access-Token": token },
    }
  );

  const categoryData = await categoryRes.json();
  console.log("Categories:\n", JSON.stringify(categoryData, null, 2));
}

fetchCategories().catch(console.error);
