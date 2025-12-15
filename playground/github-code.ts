/**
 * GitHub Code Search Driver Example
 */

import { createPolySearch } from "../packages/polysearch/src/search";
import githubCodeDriver from "../packages/polysearch/src/drivers/github-code";

console.log("<🔍 GitHub Code Search Driver Example\n");

// Create search manager with GitHub code driver
// Note: Code search requires authentication token
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error(
    "GitHub Code Search requires GITHUB_TOKEN environment variable",
  );
  process.exit(1);
}

const search = createPolySearch({
  driver: githubCodeDriver({
    token: token,
  }),
});

async function testCodeSearch() {
  try {
    console.log("=== Testing GitHub Code Search ===");

    // Basic code search
    console.log("Searching for 'useState' in TypeScript files...");
    const results1 = await search.search({
      query: "useState language:typescript",
      limit: 5,
    });
    console.log("useState TypeScript results:", results1.results.length);
    results1.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
      console.log(`     ${result.snippet}`);
    });

    // Search in specific repository
    console.log("\nSearching for 'Config' in Facebook React repository...");
    const results2 = await search.search({
      query: "Config repo:facebook/react",
      limit: 3,
    });
    console.log("Config in React repo:", results2.results.length);
    results2.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search for files with specific path
    console.log("\nSearching for 'export default' in src directories...");
    const results3 = await search.search({
      query: "export default path:src/",
      limit: 3,
    });
    console.log("Export defaults in src:", results3.results.length);
    results3.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search by file extension
    console.log("\nSearching for 'package.json' files...");
    const results4 = await search.search({
      query: "filename:package.json",
      limit: 3,
    });
    console.log("package.json files:", results4.results.length);
    results4.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search for specific file patterns
    console.log("\nSearching for README files...");
    const results5 = await search.search({
      query: "filename:README",
      limit: 3,
    });
    console.log("README files:", results5.results.length);
    results5.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search in test directories
    console.log("\nSearching for test files...");
    const results6 = await search.search({
      query: "test path:test/",
      limit: 3,
    });
    console.log("Test files:", results6.results.length);
    results6.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search for configuration files
    console.log("\nSearching for TypeScript configuration files...");
    const results7 = await search.search({
      query: "filename:tsconfig.json",
      limit: 3,
    });
    console.log("tsconfig.json files:", results7.results.length);
    results7.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Test total results
    if (results1.totalResults) {
      console.log(`\nTotal useState results found: ${results1.totalResults}`);
    }
  } catch (error) {
    console.error("GitHub code search test failed:", error);
  }
}

void testCodeSearch();
