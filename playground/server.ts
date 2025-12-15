/**
 * PolySearch Server Example
 */

import { createSearchServer } from "../packages/polysearch/src/server";
import duckduckgoDriver from "../packages/polysearch/src/drivers/duckduckgo";
// import googleCSEDriver from "../packages/polysearch/src/drivers/google-cse";

console.log("<🔍 PolySearch Server Example\n");

// Create search server using DuckDuckGo driver
const server = createSearchServer({
  driver: duckduckgoDriver(),
});

// Alternative: Create server with Google CSE driver (requires API key)
// const server = createSearchServer({
//   driver: googleCSEDriver({
//     cx: "your-google-cse-id",
//   }),
// });

console.log("🚀 Starting PolySearch server on port 8081...");
console.log("📖 API Usage:");
console.log("   GET  http://localhost:8081/search?q=github&limit=5");
console.log("   POST http://localhost:8081/suggest?q=github");
console.log("   HEAD http://localhost:8081/ (server info)");
console.log("");

// Start the server
server.serve(8081);
