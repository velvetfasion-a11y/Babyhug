import "dotenv/config";

const API_KEY = process.env.CJ_API_KEY;

if (!API_KEY) {
  console.error("Missing CJ_API_KEY in .env file.");
  process.exit(1);
}

async function main() {
  // Step 1: Get access token
  console.log("Getting access token...");

  const authResponse = await fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: API_KEY }),
    }
  );

  const authData = await authResponse.json();
  const token = authData?.data?.accessToken;

  if (!token) {
    console.error("Failed to get token. Response was:", authData);
    return;
  }

  console.log("Token received:", token);

  // Step 2: Get product categories
  console.log("\nFetching categories...");

  const categoryResponse = await fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/product/getCategory",
    {
      method: "GET",
      headers: { "CJ-Access-Token": token },
    }
  );

  const categoryData = await categoryResponse.json();
  console.log("Categories:", JSON.stringify(categoryData, null, 2));
}

main().catch(console.error);
