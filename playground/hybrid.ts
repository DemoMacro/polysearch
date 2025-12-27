import hybridDriver from "../packages/polysearch/src/drivers/hybrid";
import duckduckgoDriver from "../packages/polysearch/src/drivers/duckduckgo";
import googleCSEDriver from "../packages/polysearch/src/drivers/google-cse";
import { createPolySearch } from "../packages/polysearch/src/search";

// Create hybrid driver combining multiple search engines
// Google CSE has higher priority (1.0) than DuckDuckGo (0.5)
const driver = hybridDriver({
  drivers: [
    {
      driver: googleCSEDriver({
        cx: process.env.GOOGLE_CSE_CX || "",
      }),
      weight: 1.0, // Google CSE higher priority
      timeout: 5000,
    },
    {
      driver: duckduckgoDriver(),
      weight: 0.5, // DuckDuckGo lower priority
    },
  ],
});

// Create search manager
const search = createPolySearch({ driver });

async function testSuggestions() {
  try {
    console.log("=== Testing Hybrid Driver Suggestions ===");

    console.log("\nTesting suggestions with 'typescript'...");
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
    console.log("\n\n=== Testing Hybrid Driver Search ===");

    console.log("\nTesting search with 'GitHub'...");
    const results = await search.search({ query: "GitHub", perPage: 5 });
    console.log("Search results:", results);
    console.log("Results count:", results.results.length);

    if (results.results.length > 0) {
      console.log("\nFirst result:", results.results[0]);
      console.log("- Title:", results.results[0].title);
      console.log("- URL:", results.results[0].url);
      console.log("- Sources:", results.results[0].sources); // Show sources
      console.log(
        "- Snippet:",
        results.results[0].snippet?.substring(0, 100) + "...",
      );
    }

    if (results.totalResults) {
      console.log("\nTotal results:", results.totalResults);
    }

    // Display all results with their sources
    console.log("\n--- All results with sources ---");
    results.results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.title}`);
      console.log(`   Sources: [${result.sources?.join(", ") || "unknown"}]`);
      console.log(`   URL: ${result.url}`);
    });

    console.log("\n\nTesting search with 'TypeScript'...");
    const results2 = await search.search({ query: "TypeScript", perPage: 3 });
    console.log("\nSearch results for 'TypeScript':", results2);
    console.log("Results count:", results2.results.length);

    // Show sources for second search
    console.log("\n--- Sources breakdown ---");
    results2.results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.title}`);
      console.log(`   From: ${result.sources?.join(" + ") || "single source"}`);
    });
  } catch (error) {
    console.error("Search test failed:", error);
  }
}

async function runAllTests() {
  console.log("🚀 Starting Hybrid Driver Tests");
  console.log("Google CSE priority: 1.0 (higher)");
  console.log("DuckDuckGo priority: 0.5 (lower)");
  console.log(
    "Results will be sorted by priority (Google first if same URL)\n",
  );

  await testSuggestions();
  await testSearch();

  console.log("\n✅ All tests completed!");
}

void runAllTests();
