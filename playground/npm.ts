#!/usr/bin/env bun
/**
 * NPM Driver Example
 * Demonstrates searching npm packages using the NPM driver
 */

import { createPolySearch } from "../packages/polysearch/src/index";
import npmDriver from "../packages/polysearch/src/drivers/npm";

// Create search manager with NPM driver
const npmSearch = createPolySearch({
  driver: npmDriver(), // Use default configuration
});

async function demonstrateNPMSearch() {
  console.log("🔍 NPM Package Search Demo\n");
  console.log("=".repeat(50));

  // Example 1: Search for React-related packages
  console.log("\n📦 Searching for React packages...");
  try {
    const reactResults = await npmSearch.search({
      query: "react",
      perPage: 5,
    });

    console.log(`Found ${reactResults.results.length} packages:`);
    reactResults.results.forEach((pkg, index) => {
      console.log(`\n${index + 1}. ${pkg.title}`);
      console.log(`   🔗 ${pkg.url}`);
      console.log(`   📝 ${pkg.snippet}`);
    });

    if (reactResults.totalResults) {
      console.log(`\n📊 Total packages available: ${reactResults.totalResults}`);
    }
  } catch (error) {
    console.error("Error searching for React packages:", error);
  }

  console.log("\n" + "=".repeat(50));

  // Example 2: Search for TypeScript tools
  console.log("\n🔧 Searching for TypeScript tools...");
  try {
    const tsResults = await npmSearch.search({
      query: "typescript",
      perPage: 3,
    });

    console.log(`Found ${tsResults.results.length} TypeScript packages:`);
    tsResults.results.forEach((pkg, index) => {
      console.log(`\n${index + 1}. ${pkg.title}`);
      console.log(`   🔗 ${pkg.url}`);
      console.log(`   📝 ${pkg.snippet}`);
    });
  } catch (error) {
    console.error("Error searching for TypeScript packages:", error);
  }

  console.log("\n" + "=".repeat(50));

  // Example 3: Test suggestions functionality
  console.log("\n💡 Getting suggestions for 'react-...' packages...");
  try {
    const suggestions = await npmSearch.suggest({
      query: "react",
    });

    console.log("Suggestions:");
    suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });

    if (suggestions.length === 0) {
      console.log("No suggestions found.");
    }
  } catch (error) {
    console.error("Error getting suggestions:", error);
  }

  console.log("\n" + "=".repeat(50));

  // Example 4: Search with specific query
  console.log("\n🎯 Searching for testing frameworks...");
  try {
    const testResults = await npmSearch.search({
      query: "testing framework",
      perPage: 3,
    });

    console.log(`Found ${testResults.results.length} testing packages:`);
    testResults.results.forEach((pkg, index) => {
      console.log(`\n${index + 1}. ${pkg.title}`);
      console.log(`   🔗 ${pkg.url}`);
      console.log(`   📝 ${pkg.snippet}`);
    });
  } catch (error) {
    console.error("Error searching for testing frameworks:", error);
  }

  console.log("\n✅ Demo completed!");
}

// Run the demonstration
demonstrateNPMSearch().catch(console.error);
