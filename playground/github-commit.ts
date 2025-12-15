/**
 * GitHub Commit Search Driver Example
 */

import { createPolySearch } from "../packages/polysearch/src/search";
import githubCommitDriver from "../packages/polysearch/src/drivers/github-commit";

console.log("<🔍 GitHub Commit Search Driver Example\n");

// Create search manager with GitHub commit driver
// Note: Commit search requires authentication token
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error(
    "GitHub Commit Search requires GITHUB_TOKEN environment variable",
  );
  process.exit(1);
}

const search = createPolySearch({
  driver: githubCommitDriver({
    token: token,
  }),
});

async function testCommitSearch() {
  try {
    console.log("=== Testing GitHub Commit Search ===");

    // Basic commit search
    console.log("Searching for 'fix' commits...");
    const results1 = await search.search({
      query: "fix",
      limit: 5,
    });
    console.log("Fix commits:", results1.results.length);
    results1.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
      console.log(`     ${result.snippet}`);
    });

    // Search commits in specific repository
    console.log("\nSearching for 'update' commits in facebook/react...");
    const results2 = await search.search({
      query: "update repo:facebook/react",
      limit: 3,
    });
    console.log("Update commits in React:", results2.results.length);
    results2.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search commits by author
    console.log("\nSearching for commits by specific author...");
    const results3 = await search.search({
      query: "author:torvalds",
      limit: 3,
      sort: "author-date",
      order: "desc",
    });
    console.log("Commits by torvalds:", results3.results.length);
    results3.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search for merge commits
    console.log("\nSearching for 'merge' commits...");
    const results4 = await search.search({
      query: "Merge",
      limit: 3,
      sort: "committer-date",
      order: "desc",
    });
    console.log("Merge commits:", results4.results.length);
    results4.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search commits with specific message
    console.log("\nSearching for 'typo' fixes...");
    const results5 = await search.search({
      query: "typo",
      limit: 3,
    });
    console.log("Typo fix commits:", results5.results.length);
    results5.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Test total results
    if (results1.totalResults) {
      console.log(`\nTotal fix commits found: ${results1.totalResults}`);
    }
  } catch (error) {
    console.error("GitHub commit search test failed:", error);
  }
}

void testCommitSearch();
