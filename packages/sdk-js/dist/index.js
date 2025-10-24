/**
 * Veris SDK - Main entry point
 */
export { VerisClient } from "./client.js";
import { VerisClient } from "./client.js";
// Convenience function to create a client
export function createVerisClient(config) {
    return new VerisClient(config);
}
