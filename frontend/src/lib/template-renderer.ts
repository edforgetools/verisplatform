/**
 * Simple template renderer for mapping templates
 * Uses Handlebars-style syntax: {{ variable.path }}
 */

export interface TemplateContext {
  [key: string]: unknown;
}

export function renderTemplate(template: string, context: TemplateContext): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());

    // Handle special filters
    if (path.includes("| jsonify")) {
      const cleanPath = path.replace("| jsonify", "").trim();
      const jsonValue = getNestedValue(context, cleanPath);
      return JSON.stringify(jsonValue, null, 2);
    }

    return value !== undefined ? String(value) : match;
  });
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current: unknown, key: string) => {
    return current && typeof current === "object" && current !== null && key in current
      ? (current as Record<string, unknown>)[key]
      : undefined;
  }, obj);
}

// Helper function to load template files
export async function loadTemplate(templateName: string): Promise<string> {
  try {
    const templatePath = `/src/templates/${templateName}`;
    const response = await fetch(templatePath);

    if (!response.ok) {
      throw new Error(`Failed to load template: ${templateName}`);
    }

    return await response.text();
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    throw error;
  }
}

// Server-side template loading (for API routes)
export function loadTemplateSync(templateName: string): string {
  const fs = require("fs");
  const path = require("path");

  const templatePath = path.join(process.cwd(), "src", "templates", templateName);

  try {
    return fs.readFileSync(templatePath, "utf-8");
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    throw error;
  }
}
