import metaDriver from "../packages/polysearch/src/drivers/meta";
import duckduckgoDriver from "../packages/polysearch/src/drivers/duckduckgo";
import googleCSEDriver from "../packages/polysearch/src/drivers/google-cse";
import { createPolySearch } from "../packages/polysearch/src/search";

// Create meta driver combining multiple search engines
const driver = metaDriver({
  drivers: [
    { driver: duckduckgoDriver(), weight: 0.6, timeout: 5000 },
    {
      driver: googleCSEDriver({
        cx: process.env.GOOGLE_CSE_CX || "",
      }),
      weight: 0.4,
      timeout: 3000,
    },
  ],
});

// Create search manager
const search = createPolySearch({ driver });

async function testSuggestions() {
  try {
    console.log("=== Testing Meta Driver Suggestions ===");

    console.log("Testing suggestions with 'typescript'...");
    const suggestions1 = await search.suggest({ query: "typescript" });
    console.log("Suggestions for 'typescript':", suggestions1);
    console.log("Count:", suggestions1.length);

    console.log("\nTesting suggestions with 'react'...");
    const suggestions2 = await search.suggest({ query: "react" });
    console.log("Suggestions for 'react':", suggestions2);
    console.log("Count:", suggestions2.length);

    console.log("\nTesting suggestions with 'github'...");
    const suggestions3 = await search.suggest({ query: "github" });
    console.log("Suggestions for 'github':", suggestions3);
    console.log("Count:", suggestions3.length);
  } catch (error) {
    console.error("Suggestions test failed:", error);
  }
}

async function testSearch() {
  try {
    console.log("\n\n=== Testing Meta Driver Search ===");

    console.log("Testing search with 'typescript'...");
    const results = await search.search({ query: "typescript", limit: 5 });
    console.log("Search results:", results);
    console.log("Results count:", results.results.length);

    if (results.results.length > 0) {
      console.log("First result:", results.results[0]);
    }

    if (results.totalResults) {
      console.log("Total results:", results.totalResults);
    }

    console.log("\nTesting search with 'github api'...");
    const results2 = await search.search({ query: "github api", limit: 3 });
    console.log("Search results for 'github api':", results2);
    console.log("Results count:", results2.results.length);
  } catch (error) {
    console.error("Search test failed:", error);
  }
}

async function runAllTests() {
  await testSuggestions();
  await testSearch();
}

void runAllTests();
