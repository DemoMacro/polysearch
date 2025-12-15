/**
 * GitHub Repository Search Driver Example
 */

import { createPolySearch } from "../packages/polysearch/src/search";
import githubRepoDriver from "../packages/polysearch/src/drivers/github-repo";

console.log("<🔍 GitHub Repository Search Driver Example\n");

// Create search manager with GitHub repo driver
const search = createPolySearch({
  driver: githubRepoDriver({
    token: process.env.GITHUB_TOKEN, // Optional but recommended for higher rate limits
  }),
});

async function testRepositorySearch() {
  try {
    console.log("=== Testing GitHub Repository Search ===");

    // Basic repository search
    console.log("Searching for TypeScript repositories...");
    const results1 = await search.search({
      query: "TypeScript",
      limit: 5,
      sort: "stars",
      order: "desc",
    });
    console.log("TypeScript repositories:", results1.results.length);
    results1.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title} - ${result.snippet}`);
    });

    // Search with qualifiers
    console.log("\nSearching for React repositories with >1000 stars...");
    const results2 = await search.search({
      query: "react stars:>=1000",
      limit: 3,
      sort: "stars",
    });
    console.log("React repositories:", results2.results.length);
    results2.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Language-specific search
    console.log("\nSearching for Rust repositories with 'cli' in name...");
    const results3 = await search.search({
      query: "cli in:name language:rust",
      limit: 3,
    });
    console.log("Rust CLI repositories:", results3.results.length);
    results3.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search by topics
    console.log(
      "\nSearching for repositories with 'react' and 'typescript' topics...",
    );
    const results4 = await search.search({
      query: "topics:react,typescript",
      limit: 3,
    });
    console.log("React+TypeScript repositories:", results4.results.length);
    results4.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search template repositories
    console.log("\nSearching for React template repositories...");
    const results5 = await search.search({
      query: "react is:template",
      limit: 3,
    });
    console.log("React templates:", results5.results.length);
    results5.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Test total results
    if (results1.totalResults) {
      console.log(
        `\nTotal TypeScript repositories found: ${results1.totalResults}`,
      );
    }
  } catch (error) {
    console.error("GitHub repository search test failed:", error);
  }
}

void testRepositorySearch();
