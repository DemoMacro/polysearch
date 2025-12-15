import duckduckgoDriver from "../packages/polysearch/src/drivers/duckduckgo";
import { createPolySearch } from "../packages/polysearch/src/search";

// Create DuckDuckGo driver
const driver = duckduckgoDriver();

// Create search manager
const search = createPolySearch({ driver });

async function testSuggestions() {
  try {
    console.log("=== Testing DuckDuckGo Suggestions ===");

    console.log("Testing suggestions with 'git'...");
    const suggestions1 = await search.suggest({ query: "git" });
    console.log("Suggestions for 'git':", suggestions1);
    console.log("Count:", suggestions1.length);

    console.log("\nTesting suggestions with 'github'...");
    const suggestions2 = await search.suggest({ query: "github" });
    console.log("Suggestions for 'github':", suggestions2);
    console.log("Count:", suggestions2.length);

    console.log("\nTesting suggestions with 'typescript'...");
    const suggestions3 = await search.suggest({ query: "typescript" });
    console.log("Suggestions for 'typescript':", suggestions3);
    console.log("Count:", suggestions3.length);
  } catch (error) {
    console.error("Suggestions test failed:", error);
  }
}

async function testSearch() {
  try {
    console.log("\n\n=== Testing DuckDuckGo Search ===");
    console.log("Testing search with 'github'...");
    const results = await search.search({ query: "github", limit: 5 });
    console.log("Search results:", results);
    console.log("Results count:", results.results.length);

    if (results.results.length > 0) {
      console.log("First result:", results.results[0]);
    }

    if (results.totalResults) {
      console.log("Total results:", results.totalResults);
    } else {
      console.log("Total results: Not provided by DuckDuckGo API");
    }

    console.log("\nTesting search with 'typescript'...");
    const results2 = await search.search({ query: "typescript", limit: 3 });
    console.log("Search results for 'typescript':", results2);
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
