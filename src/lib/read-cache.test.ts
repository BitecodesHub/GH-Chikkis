import { describe, expect, it, vi } from "vitest";
import { invalidateReads, primeRead, readCacheHas, readThrough, READ_TTL } from "./read-cache";

describe("readThrough", () => {
  it("loads once and serves the cached value afterwards", async () => {
    const load = vi.fn(async () => ({ ok: true }));
    const key = "test:single";
    invalidateReads(key);

    await expect(readThrough(key, READ_TTL.content, load)).resolves.toEqual({ ok: true });
    await expect(readThrough(key, READ_TTL.content, load)).resolves.toEqual({ ok: true });

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight load between concurrent readers", async () => {
    const load = vi.fn(
      () => new Promise<number>((resolve) => setTimeout(() => resolve(7), 5)),
    );
    const key = "test:concurrent";
    invalidateReads(key);

    await expect(Promise.all([
      readThrough(key, READ_TTL.content, load),
      readThrough(key, READ_TTL.content, load),
    ])).resolves.toEqual([7, 7]);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failure, so the next reader retries", async () => {
    const key = "test:failing";
    invalidateReads(key);
    let attempt = 0;
    const load = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("atlas is busy");
      return "recovered";
    });

    await expect(readThrough(key, READ_TTL.content, load)).rejects.toThrow("atlas is busy");
    await expect(readThrough(key, READ_TTL.content, load)).resolves.toBe("recovered");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("drops only the namespace it is asked to drop", async () => {
    primeRead("settings", READ_TTL.content, "a");
    primeRead("content:home", READ_TTL.content, "b");

    invalidateReads("settings");

    expect(readCacheHas("settings")).toBe(false);
    expect(readCacheHas("content:home")).toBe(true);
  });

  it("expires a value once its ttl has passed", async () => {
    const key = "test:expiring";
    invalidateReads(key);
    const load = vi.fn(async () => "v");

    await readThrough(key, 1, load);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await readThrough(key, 1, load);

    expect(load).toHaveBeenCalledTimes(2);
  });
});
