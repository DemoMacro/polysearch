/**
 * GitHub User Search Driver Example
 */

import { createPolySearch } from "../packages/polysearch/src/search";
import githubUserDriver from "../packages/polysearch/src/drivers/github-user";

console.log("<🔍 GitHub User Search Driver Example\n");

// Create search manager with GitHub user driver
const search = createPolySearch({
  driver: githubUserDriver({
    token: process.env.GITHUB_TOKEN, // Optional but recommended
  }),
});

async function testUserSearch() {
  try {
    console.log("=== Testing GitHub User Search ===");

    // Basic user search
    console.log("Searching for users with 'john' in username...");
    const results1 = await search.search({
      query: "john",
      limit: 5,
    });
    console.log("Users with 'john':", results1.results.length);
    results1.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title} - ${result.snippet}`);
    });

    // Search users by location
    console.log("\nSearching for users in San Francisco...");
    const results2 = await search.search({
      query: "location:San Francisco",
      limit: 3,
    });
    console.log("Users in SF:", results2.results.length);
    results2.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search users with many followers
    console.log("\nSearching for users with >1000 followers...");
    const results3 = await search.search({
      query: "followers:>1000",
      limit: 3,
      sort: "followers",
      order: "desc",
    });
    console.log("Users with >1000 followers:", results3.results.length);
    results3.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title} - ${result.snippet}`);
    });

    // Search organizations
    console.log("\nSearching for organizations with 'microsoft'...");
    const results4 = await search.search({
      query: "microsoft type:org",
      limit: 3,
    });
    console.log("Organizations:", results4.results.length);
    results4.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title} - ${result.snippet}`);
    });

    // Search users with many repositories
    console.log("\nSearching for users with >50 repositories...");
    const results5 = await search.search({
      query: "repos:>50 type:user",
      limit: 3,
      sort: "repositories",
      order: "desc",
    });
    console.log("Users with >50 repos:", results5.results.length);
    results5.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title} - ${result.snippet}`);
    });

    // Test total results
    if (results1.totalResults) {
      console.log(`\nTotal users with 'john' found: ${results1.totalResults}`);
    }
  } catch (error) {
    console.error("GitHub user search test failed:", error);
  }
}

void testUserSearch();
