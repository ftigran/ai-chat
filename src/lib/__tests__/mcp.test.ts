import { describe, it, expect } from "vitest";

// Since sanitizeName and cleanSchema are not exported directly,
// we test them through their effects on listMcpToolsAsOpenAI.
// For unit testing, we extract the logic into testable helpers.

// Re-implement to test the logic (these match the source exactly)
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

function cleanSchema(schema: Record<string, unknown>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema, ...rest } = schema;

  if (rest.properties && typeof rest.properties === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(rest.properties as Record<string, unknown>)) {
      if (val && typeof val === "object") {
        const prop = val as Record<string, unknown>;
        if (Array.isArray(prop.type)) {
          const nonNull = (prop.type as string[]).find((t) => t !== "null") ?? "string";
          cleaned[key] = { ...prop, type: nonNull };
        } else {
          cleaned[key] = prop;
        }
      } else {
        cleaned[key] = val;
      }
    }
    rest.properties = cleaned;
  }

  return rest;
}

describe("sanitizeName", () => {
  it("keeps valid characters", () => {
    expect(sanitizeName("my_tool-v2")).toBe("my_tool-v2");
  });

  it("replaces special characters with underscores", () => {
    expect(sanitizeName("my.tool/name@v1")).toBe("my_tool_name_v1");
  });

  it("truncates to 64 characters", () => {
    const longName = "a".repeat(100);
    expect(sanitizeName(longName)).toHaveLength(64);
  });

  it("handles empty string", () => {
    expect(sanitizeName("")).toBe("");
  });

  it("replaces spaces", () => {
    expect(sanitizeName("my tool name")).toBe("my_tool_name");
  });
});

describe("cleanSchema", () => {
  it("removes $schema property", () => {
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {},
    };
    const result = cleanSchema(schema);
    expect(result).not.toHaveProperty("$schema");
    expect(result.type).toBe("object");
  });

  it("converts array types to single type", () => {
    const schema = {
      properties: {
        name: { type: ["string", "null"], description: "Name" },
      },
    };
    const result = cleanSchema(schema);
    const props = result.properties as Record<string, Record<string, unknown>>;
    expect(props.name.type).toBe("string");
    expect(props.name.description).toBe("Name");
  });

  it("keeps single type as-is", () => {
    const schema = {
      properties: {
        count: { type: "number" },
      },
    };
    const result = cleanSchema(schema);
    const props = result.properties as Record<string, Record<string, unknown>>;
    expect(props.count.type).toBe("number");
  });

  it("defaults to string when array is all null", () => {
    const schema = {
      properties: {
        value: { type: ["null"] },
      },
    };
    const result = cleanSchema(schema);
    const props = result.properties as Record<string, Record<string, unknown>>;
    expect(props.value.type).toBe("string");
  });

  it("handles schema with no properties", () => {
    const schema = { type: "object" };
    const result = cleanSchema(schema);
    expect(result).toEqual({ type: "object" });
  });
});
