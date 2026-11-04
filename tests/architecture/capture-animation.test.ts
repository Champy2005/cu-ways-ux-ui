import { expect, test, vi } from "vitest";
import { freezeCssAnimations } from "../../scripts/ui/fidelity-contracts.mjs";

test("frame-zero capture waits for the browser pause task without cancelling production effects", async () => {
  let finish!: () => void;
  class Animation {
    animationName = "spinner";
    playState = "running";
    pending = true;
    currentTime = 17;
    ready = new Promise<void>((resolve) => {
      finish = () => {
        this.playState = "paused";
        this.pending = false;
        resolve();
      };
    });
    pause = vi.fn();
    cancel = vi.fn();
  }
  const animation = new Animation();
  vi.stubGlobal("CSSAnimation", Animation);
  vi.stubGlobal("document", {
    getAnimations: () => [animation, { nonCssEffect: true }],
  });
  try {
    const frozen = freezeCssAnimations();
    await Promise.resolve();
    expect(animation.pause).toHaveBeenCalledOnce();
    expect(animation.currentTime).toBe(17);
    finish();
    expect(await frozen).toEqual([
      { name: "spinner", state: "paused", pending: false, currentTime: 0 },
    ]);
    expect(animation.cancel).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
test("a resolved ready promise cannot hide an unsettled animation", async () => {
  class Animation {
    playState = "running";
    pending = true;
    currentTime = 17;
    ready = Promise.resolve();
    pause() {}
  }
  vi.stubGlobal("CSSAnimation", Animation);
  vi.stubGlobal("document", { getAnimations: () => [new Animation()] });
  try {
    await expect(freezeCssAnimations()).rejects.toThrow("has not settled");
  } finally {
    vi.unstubAllGlobals();
  }
});
