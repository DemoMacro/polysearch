/**
 * GitHub Issue Search Driver Example
 */

import { createPolySearch } from "../packages/polysearch/src/search";
import githubIssueDriver from "../packages/polysearch/src/drivers/github-issue";

console.log("<🔍 GitHub Issue Search Driver Example\n");

// Create search manager with GitHub issue driver
const search = createPolySearch({
  driver: githubIssueDriver({
    token: process.env.GITHUB_TOKEN, // Optional but recommended
  }),
});

async function testIssueSearch() {
  try {
    console.log("=== Testing GitHub Issue Search ===");

    // Basic issue search
    console.log("Searching for 'bug' issues...");
    const results1 = await search.search({
      query: "bug",
      limit: 5,
      sort: "created",
      order: "desc",
    });
    console.log("Bug issues:", results1.results.length);
    results1.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
      console.log(`     ${result.snippet?.substring(0, 100)}...`);
    });

    // Search issues with labels
    console.log("\nSearching for issues with 'help wanted' label...");
    const results2 = await search.search({
      query: 'label:"help wanted"',
      limit: 3,
    });
    console.log("Help wanted issues:", results2.results.length);
    results2.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search in specific repository
    console.log("\nSearching for issues in facebook/react repository...");
    const results3 = await search.search({
      query: "repo:facebook/react state:open",
      limit: 3,
      sort: "updated",
    });
    console.log("Open React issues:", results3.results.length);
    results3.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search closed issues
    console.log("\nSearching for recently closed 'enhancement' issues...");
    const results4 = await search.search({
      query: "enhancement state:closed",
      limit: 3,
      sort: "updated",
      order: "desc",
    });
    console.log("Closed enhancement issues:", results4.results.length);
    results4.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search issues by author
    console.log("\nSearching for issues by specific author...");
    const results5 = await search.search({
      query: "author:torvalds",
      limit: 3,
    });
    console.log("Issues by torvalds:", results5.results.length);
    results5.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search by multiple labels
    console.log(
      "\nSearching for issues with 'bug' and 'high priority' labels...",
    );
    const results6 = await search.search({
      query: 'label:bug label:"high priority"',
      limit: 3,
    });
    console.log("High priority bugs:", results6.results.length);
    results6.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search for pull requests specifically
    console.log("\nSearching for pull requests about 'refactor'...");
    const results7 = await search.search({
      query: "refactor is:pr",
      limit: 3,
    });
    console.log("Refactor PRs:", results7.results.length);
    results7.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search by mentions
    console.log("\nSearching for issues mentioning specific user...");
    const results8 = await search.search({
      query: "mentions:octocat",
      limit: 3,
    });
    console.log("Issues mentioning octocat:", results8.results.length);
    results8.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Test total results
    if (results1.totalResults) {
      console.log(`\nTotal bug issues found: ${results1.totalResults}`);
    }
  } catch (error) {
    console.error("GitHub issue search test failed:", error);
  }
}

async function testSuggestions() {
  try {
    console.log("\n=== Testing GitHub Issue Suggestions ===");

    // Test suggestions
    const suggestions1 = await search.suggest({ query: "bug" });
    console.log("Suggestions for 'bug':", suggestions1);

    const suggestions2 = await search.suggest({ query: "good" });
    console.log("Suggestions for 'good':", suggestions2);

    const suggestions3 = await search.suggest({ query: "priority" });
    console.log("Suggestions for 'priority':", suggestions3);
  } catch (error) {
    console.error("GitHub issue suggestions test failed:", error);
  }
}

async function runAllTests() {
  await testIssueSearch();
  await testSuggestions();
}

void runAllTests();
