import googleCSEDriver from "../packages/polysearch/src/drivers/google-cse";
import { createPolySearch } from "../packages/polysearch/src/search";

// Create Google CSE driver
const driver = googleCSEDriver({
  cx: process.env.GOOGLE_CSE_CX || "", // Test CSE ID from examples
});

// Create search manager
const search = createPolySearch({ driver });

async function testSuggestions() {
  try {
    // Test only autocomplete (no token needed)
    console.log("Testing autocomplete with 'git'...");
    const suggestions1 = await search.suggest({ query: "git" });
    console.log("Suggestions for 'git':", suggestions1);
    console.log("Count:", suggestions1.length);

    console.log("\nTesting autocomplete with 'github'...");
    const suggestions2 = await search.suggest({ query: "github" });
    console.log("Suggestions for 'github':", suggestions2);
    console.log("Count:", suggestions2.length);

    console.log("\nTesting autocomplete with 'hello'...");
    const suggestions3 = await search.suggest({ query: "hello" });
    console.log("Suggestions for 'hello':", suggestions3);
    console.log("Count:", suggestions3.length);
  } catch (error) {
    console.error("Autocomplete test failed:", error);
  }
}

async function testSearch() {
  try {
    console.log("\n\n=== Testing Search ===");
    console.log("Testing search with 'github'...");
    const results = await search.search({ query: "github", limit: 5 });
    console.log("Search results:", results);
    console.log("Results count:", results.results.length);
    console.log("First result:", results.results[0]);

    if (results.pagination) {
      console.log("Pagination:", results.pagination);
    }

    if (results.totalResults) {
      console.log("Total results:", results.totalResults);
    }
  } catch (error) {
    console.error("Search test failed:", error);
  }
}

async function runAllTests() {
  await testSuggestions();
  await testSearch();
}

void runAllTests();
