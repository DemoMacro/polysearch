/**
 * GitHub Label Search Driver Example
 */

import { createPolySearch } from "../packages/polysearch/src/search";
import githubLabelDriver from "../packages/polysearch/src/drivers/github-label";

console.log("<🔍 GitHub Label Search Driver Example\n");

// Create search manager with GitHub label driver
// Note: Label search requires authentication token
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error(
    "GitHub Label Search requires GITHUB_TOKEN environment variable",
  );
  process.exit(1);
}

const search = createPolySearch({
  driver: githubLabelDriver({
    token: token,
  }),
});

async function testLabelSearch() {
  try {
    console.log("=== Testing GitHub Label Search ===");

    // Basic label search
    console.log("Searching for 'bug' labels...");
    const results1 = await search.search({
      query: "bug",
      limit: 5,
    });
    console.log("Bug labels:", results1.results.length);
    results1.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title} - ${result.snippet}`);
    });

    // Search for enhancement labels
    console.log("\nSearching for 'enhancement' labels...");
    const results2 = await search.search({
      query: "enhancement",
      limit: 3,
    });
    console.log("Enhancement labels:", results2.results.length);
    results2.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search for priority labels
    console.log("\nSearching for 'priority' labels...");
    const results3 = await search.search({
      query: "priority",
      limit: 3,
    });
    console.log("Priority labels:", results3.results.length);
    results3.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search for documentation labels
    console.log("\nSearching for 'documentation' labels...");
    const results4 = await search.search({
      query: "documentation",
      limit: 3,
    });
    console.log("Documentation labels:", results4.results.length);
    results4.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search for good first issue labels
    console.log("\nSearching for 'good first issue' labels...");
    const results5 = await search.search({
      query: "good first issue",
      limit: 3,
    });
    console.log("Good first issue labels:", results5.results.length);
    results5.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Test total results
    if (results1.totalResults) {
      console.log(`\nTotal bug labels found: ${results1.totalResults}`);
    }
  } catch (error) {
    console.error("GitHub label search test failed:", error);
  }
}

async function testSuggestions() {
  try {
    console.log("\n=== Testing GitHub Label Suggestions ===");

    // Test suggestions
    const suggestions1 = await search.suggest({ query: "bug" });
    console.log("Suggestions for 'bug':", suggestions1);

    const suggestions2 = await search.suggest({ query: "help" });
    console.log("Suggestions for 'help':", suggestions2);

    const suggestions3 = await search.suggest({ query: "priority" });
    console.log("Suggestions for 'priority':", suggestions3);

    const suggestions4 = await search.suggest({ query: "test" });
    console.log("Suggestions for 'test':", suggestions4);
  } catch (error) {
    console.error("GitHub label suggestions test failed:", error);
  }
}

async function runAllTests() {
  await testLabelSearch();
  await testSuggestions();
}

void runAllTests();
