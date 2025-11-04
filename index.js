import express from "express";
import dotenv from "dotenv";
import db from "./db.js";
import { askOllama } from "./ollamaService.js";
import NodeCache from "node-cache";
dotenv.config();
const app = express();
app.use(express.json());
const cache = new NodeCache({ stdTTL: 300 });
function extractFilters(question) {
  let filters = {
    bhk: null,
    location: null,
    maxPrice: null,
  };
  const bhkMatch = question.match(/(\d+)\s?bhk/i);
  if (bhkMatch) filters.bhk = bhkMatch[1];
  const priceMatch = question.match(/(\d+)\s?(crore|lakhs|lakh)/i);
  if (priceMatch) {
    let value = parseInt(priceMatch[1]);
    if (priceMatch[2].toLowerCase() === "crore") value *= 10000000;
    if (priceMatch[2].toLowerCase().includes("lakh")) value *= 100000;
    filters.maxPrice = value;
  }
  const possibleLocations = [
    "Hyderabad",
    "Gachibowli",
    "Kondapur",
    "Miyapur",
    "Kukatpally",
  ];
  possibleLocations.forEach((loc) => {
    if (question.toLowerCase().includes(loc.toLowerCase())) {
      filters.location = loc;
    }
  });
  return filters;
}
app.post("/api/ask", async (req, res) => {
  const { question } = req.body;
  try {
    const cacheKey = `ask:${question.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const { bhk, location, maxPrice } = extractFilters(question);
    let query = `
      SELECT property_name, bedrooms, property_cost, google_address 
      FROM properties 
      WHERE property_status = 1
    `;
    let params = [];
    if (bhk) {
      query += " AND bedrooms = ?";
      params.push(bhk);
    }
    if (location) {
      query += " AND google_address LIKE ?";
      params.push(`%${location}%`);
    }
    if (maxPrice) {
      query += " AND property_cost <= ?";
      params.push(maxPrice);
    }
    query += " ORDER BY id DESC LIMIT 10";
    const [properties] = await db.query(query, params);
    let context = properties.length
      ? properties
          .map(
            (p) =>
              `Property: ${p.property_name}, BHK: ${p.bedrooms}, Price: ₹${p.property_cost}, Address: ${p.google_address}`
          )
          .join("\n")
      : "No direct matches found. Showing top recent listings.";
    if (properties.length === 0) {
      const [fallback] = await db.query(
        `SELECT property_name, bedrooms, property_cost, google_address 
         FROM properties WHERE property_status = 1 ORDER BY id DESC LIMIT 3`
      );
      context +=
        "\n\nTop recent: " +
        fallback
          .map(
            (p) =>
              `Property: ${p.property_name}, BHK: ${p.bedrooms}, Price: ₹${p.property_cost}`
          )
          .join("\n");
    }
    const aiResponse = await askOllama(question, context);
    const result = { success: true, answer: aiResponse, usedData: properties };
    cache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Something went wrong!" });
  }
});
app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${process.env.PORT}`);
});
