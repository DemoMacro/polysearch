/**
 * GitHub Topic Search Driver Example
 */

import { createPolySearch } from "../packages/polysearch/src/search";
import githubTopicDriver from "../packages/polysearch/src/drivers/github-topic";

console.log("<🔍 GitHub Topic Search Driver Example\n");

// Create search manager with GitHub topic driver
const search = createPolySearch({
  driver: githubTopicDriver({
    token: process.env.GITHUB_TOKEN, // Optional but recommended
  }),
});

async function testTopicSearch() {
  try {
    console.log("=== Testing GitHub Topic Search ===");

    // Basic topic search
    console.log("Searching for 'typescript' topics...");
    const results1 = await search.search({
      query: "typescript",
      limit: 5,
    });
    console.log("TypeScript topics:", results1.results.length);
    results1.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title} - ${result.snippet}`);
    });

    // Search for featured topics
    console.log("\nSearching for featured 'javascript' topics...");
    const results2 = await search.search({
      query: "javascript is:featured",
      limit: 3,
    });
    console.log("Featured JavaScript topics:", results2.results.length);
    results2.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search for specific technology
    console.log("\nSearching for 'react' topics...");
    const results3 = await search.search({
      query: "react",
      limit: 3,
    });
    console.log("React topics:", results3.results.length);
    results3.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Search for devops related topics
    console.log("\nSearching for 'docker' topics...");
    const results4 = await search.search({
      query: "docker",
      limit: 3,
    });
    console.log("Docker topics:", results4.results.length);
    results4.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
    });

    // Test total results
    if (results1.totalResults) {
      console.log(`\nTotal TypeScript topics found: ${results1.totalResults}`);
    }
  } catch (error) {
    console.error("GitHub topic search test failed:", error);
  }
}

async function testSuggestions() {
  try {
    console.log("\n=== Testing GitHub Topic Suggestions ===");

    // Test suggestions
    const suggestions1 = await search.suggest({ query: "java" });
    console.log("Suggestions for 'java':", suggestions1);

    const suggestions2 = await search.suggest({ query: "web" });
    console.log("Suggestions for 'web':", suggestions2);

    const suggestions3 = await search.suggest({ query: "test" });
    console.log("Suggestions for 'test':", suggestions3);
  } catch (error) {
    console.error("GitHub topic suggestions test failed:", error);
  }
}

async function runAllTests() {
  await testTopicSearch();
  await testSuggestions();
}

void runAllTests();
