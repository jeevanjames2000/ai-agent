import express from "express";
import dotenv from "dotenv";
import db from "./db.js";
import { askOllama } from "./ollamaService.js";

dotenv.config();
const app = express();
app.use(express.json());

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
    if (priceMatch[2].toLowerCase() === "crore") value = value * 10000000;
    if (priceMatch[2].toLowerCase().includes("lakh")) value = value * 100000;
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
    const { bhk, location, maxPrice } = extractFilters(question);

    let query = `
      SELECT property_name, bedrooms, property_cost, google_address, description 
      FROM properties 
      WHERE 1=1
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

    query += " LIMIT 10";

    const [properties] = await db.query(query, params);

    let context = properties.length
      ? properties
          .map(
            (p) =>
              `Property: ${p.property_name}, BHK: ${p.bedrooms}, Price: ₹${p.property_cost}, Address: ${p.google_address}`
          )
          .join("\n")
      : "No direct matches found in database.";

    const aiResponse = await askOllama(question, context);

    res.json({ success: true, answer: aiResponse, usedData: properties });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Something went wrong!" });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`✅ Server running on http://localhost:${process.env.PORT}`)
);
