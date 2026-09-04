import { describe, expect, it, vi } from "vitest";

import { hello } from "@/index.js";

describe("create-sette-ts", () => {
  it('should log "Hello, World!"', () => {
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => {});

    hello();

    expect(consoleSpy).toHaveBeenCalledExactlyOnceWith("Hello, World!");

    consoleSpy.mockRestore();
  });
});