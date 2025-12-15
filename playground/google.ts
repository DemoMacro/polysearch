import googleDriver from "../packages/polysearch/src/drivers/google";
import { createPolySearch } from "../packages/polysearch/src/search";

// Create Google driver
const driver = googleDriver();

// Create search manager
const search = createPolySearch({ driver });

async function testSuggestions() {
  try {
    console.log("=== Testing Google Suggestions ===");

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

async function runAllTests() {
  await testSuggestions();
}

void runAllTests();
