/**
 * GitHub Poly Driver Example - Combining multiple GitHub search types
 */

import { createPolySearch } from "../packages/polysearch/src/search";
import polyDriver from "../packages/polysearch/src/drivers/poly";
import githubRepoDriver from "../packages/polysearch/src/drivers/github-repo";
import githubCodeDriver from "../packages/polysearch/src/drivers/github-code";
import githubUserDriver from "../packages/polysearch/src/drivers/github-user";
import githubIssueDriver from "../packages/polysearch/src/drivers/github-issue";
import githubTopicDriver from "../packages/polysearch/src/drivers/github-topic";
import githubLabelDriver from "../packages/polysearch/src/drivers/github-label";

console.log("<🔍 GitHub Poly Driver Example\n");

const token = process.env.GITHUB_TOKEN;

// Create poly driver combining GitHub search types
const polySearch = createPolySearch({
  driver: polyDriver({
    drivers: [
      {
        driver: githubRepoDriver({ token }),
        weight: 0.4,
        timeout: 5000,
      },
      {
        driver: githubCodeDriver({ token }),
        weight: 0.3,
        timeout: 8000, // Code search might be slower
      },
      {
        driver: githubUserDriver({ token }),
        weight: 0.2,
        timeout: 3000,
      },
      {
        driver: githubIssueDriver({ token }),
        weight: 0.1,
        timeout: 4000,
      },
      {
        driver: githubTopicDriver({ token }),
        weight: 0.05,
        timeout: 3000,
      },
      {
        driver: githubLabelDriver({ token }),
        weight: 0.05,
        timeout: 3000,
      },
    ],
  }),
});

async function testPolySearch() {
  try {
    console.log("=== Testing GitHub Poly Search ===");

    // Search across multiple GitHub content types
    console.log(
      "Searching for 'react' across GitHub (repos, code, users, issues, topics, labels)...",
    );
    const results1 = await polySearch.search({
      query: "react",
      perPage: 10,
    });
    console.log("Total combined results:", results1.results.length);
    console.log("Results by type:");
    results1.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
      console.log(`     Sources: [${result.sources?.join(", ") || "unknown"}]`);
      console.log(`     ${result.snippet?.substring(0, 100)}...`);
      console.log();
    });

    // Search for TypeScript-specific content
    console.log("Searching for 'typescript' across GitHub...");
    const results2 = await polySearch.search({
      query: "typescript",
      perPage: 8,
    });
    console.log("TypeScript combined results:", results2.results.length);

    // Search with different weights for different scenarios
    console.log("\nCreating search focused on developers...");
    const developerSearch = createPolySearch({
      driver: polyDriver({
        drivers: [
          {
            driver: githubUserDriver({ token }),
            weight: 0.6, // Higher priority for users
          },
          {
            driver: githubRepoDriver({ token }),
            weight: 0.4,
          },
        ],
      }),
    });

    const devResults = await developerSearch.search({
      query: "javascript developer",
      perPage: 5,
    });
    console.log("Developer-focused results:", devResults.results.length);
    devResults.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title}`);
      console.log(`     Sources: [${result.sources?.join(", ") || "unknown"}]`);
    });

    // Test suggestions (only github-issue driver supports suggestions)
    console.log("\nTesting suggestions (only issues driver supports)...");
    const suggestions = await polySearch.suggest({ query: "bug" });
    console.log("Suggestions for 'bug':", suggestions);
  } catch (error) {
    console.error("GitHub poly search test failed:", error);
  }
}

void testPolySearch();
