import googleDriver from "../packages/polysearch/src/drivers/google";
import { createPolySearch } from "../packages/polysearch/src/search";

// Create Google driver
const driver = googleDriver();

// Create search manager
const search = createPolySearch({ driver });

async function testSearch() {
  try {
    console.log("=== Testing Google Search ===");

    console.log("Searching for 'TypeScript'...");
    const results = await search.search({ query: "TypeScript", perPage: 5 });
    console.log(`Found ${results.results.length} results:`);
    results.results.forEach((r, i) => {
      console.log(`\n[${i + 1}] ${r.title}`);
      console.log(`    URL: ${r.url}`);
      console.log(`    Snippet: ${r.snippet?.slice(0, 100)}...`);
    });
    console.log(`\nTotal: ${results.totalResults}`);
    console.log(`Pagination:`, results.pagination);
  } catch (error) {
    console.error("Search test failed:", error);
  }
}

async function testSuggestions() {
  try {
    console.log("\n=== Testing Google Suggestions ===");

    console.log("Testing suggestions with 'git'...");
    const suggestions1 = await search.suggest({ query: "git" });
    console.log("Suggestions for 'git':", suggestions1);
    console.log("Count:", suggestions1.length);

    console.log("\nTesting suggestions with 'typescript'...");
    const suggestions3 = await search.suggest({ query: "typescript" });
    console.log("Suggestions for 'typescript':", suggestions3);
    console.log("Count:", suggestions3.length);
  } catch (error) {
    console.error("Suggestions test failed:", error);
  }
}

async function runAllTests() {
  await testSearch();
  await testSuggestions();
}

void runAllTests();
