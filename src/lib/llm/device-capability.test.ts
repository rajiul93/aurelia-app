import * as Device from "expo-device";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getDeviceCapability,
  MIN_TOTAL_MEMORY_BYTES_FOR_LLM,
  resetDeviceCapabilityCache,
} from "@/lib/llm/device-capability";

vi.mock("expo-device", () => ({
  isDevice: true,
  totalMemory: 8 * 1024 * 1024 * 1024,
}));

const mocked = vi.mocked(Device, true) as unknown as {
  isDevice: boolean;
  totalMemory: number | null;
};

function setDevice(totalMemory: number | null, isDevice = true) {
  mocked.isDevice = isDevice;
  mocked.totalMemory = totalMemory;
  resetDeviceCapabilityCache();
}

describe("getDeviceCapability", () => {
  beforeEach(() => {
    setDevice(8 * 1024 * 1024 * 1024);
  });

  it("allows a device at or above the memory floor", () => {
    setDevice(MIN_TOTAL_MEMORY_BYTES_FOR_LLM);

    expect(getDeviceCapability()).toMatchObject({
      canRunModel: true,
      reason: null,
    });
  });

  it("refuses one byte below the floor", () => {
    // Guards the boundary specifically: an off-by-one that admits 4 GB phones
    // shows up as an OOM kill mid-tour, not as a slow answer.
    setDevice(MIN_TOTAL_MEMORY_BYTES_FOR_LLM - 1);

    expect(getDeviceCapability()).toMatchObject({
      canRunModel: false,
      reason: "low_memory",
    });
  });

  it("refuses when the platform will not report memory", () => {
    setDevice(null);

    expect(getDeviceCapability()).toMatchObject({
      canRunModel: false,
      reason: "unknown_memory",
    });
  });

  it("flags a simulator instead of trusting the host machine's RAM", () => {
    setDevice(64 * 1024 * 1024 * 1024, false);

    expect(getDeviceCapability()).toMatchObject({
      canRunModel: true,
      reason: "simulator",
    });
  });

  it("memoizes, since this is read for every question asked", () => {
    setDevice(8 * 1024 * 1024 * 1024);
    const first = getDeviceCapability();

    // Changed underneath without resetting the cache — the answer must not move.
    mocked.totalMemory = 1024;

    expect(getDeviceCapability()).toBe(first);
    expect(getDeviceCapability().canRunModel).toBe(true);
  });
});
