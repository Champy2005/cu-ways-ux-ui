import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ThemeProvider, useTheme } from "../design-system/ThemeProvider";
import { Action } from "../design-system/components/primitives";
import { ProofDelivery } from "../features/us026/ProofDelivery";

function AppearancePersistence() {
  const original = useTheme();
  const [changed, setChanged] = useState(false);
  return (
    <ThemeProvider
      initialTheme={
        changed
          ? original.theme === "light"
            ? "dark"
            : "light"
          : original.theme
      }
      material={
        changed
          ? original.material === "glass"
            ? "opaque"
            : "glass"
          : original.material
      }
      textScale={changed ? 150 : original.textScale}
    >
      <Action role="utility" onClick={() => setChanged(!changed)}>
        Change preview appearance
      </Action>
      <ProofDelivery scenario="A01" timing="hold" />
    </ThemeProvider>
  );
}

export default {
  id: "appearance",
  title: "System/Appearance persistence",
  component: AppearancePersistence,
  parameters: { ui: { owner: "testing" } },
} satisfies Meta<typeof AppearancePersistence>;

export const DraftAndPending: StoryObj<typeof AppearancePersistence> = {
  play: async ({ canvasElement }) => {
    if (window.__UI_CAPTURE__) return;
    const canvas = within(canvasElement);
    const doc = within(canvasElement.ownerDocument.body);
    const draft = "https://example.com/proof/appearance-preserves-draft";
    await userEvent.click(canvas.getByRole("button", { name: "Add proof" }));
    await userEvent.type(
      doc.getByRole("textbox", { name: "Delivery link" }),
      draft,
    );
    await userEvent.click(doc.getByRole("button", { name: /^Close$/ }));
    await userEvent.click(
      canvas.getByRole("button", { name: "Change preview appearance" }),
    );
    await expect(
      canvas.getByRole("button", { name: "Switch to light theme" }),
    ).toBeVisible();
    await expect(document.documentElement).toHaveAttribute(
      "data-text-scale",
      "150",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Add proof" }));
    await expect(
      doc.getByRole("textbox", { name: "Delivery link" }),
    ).toHaveValue(draft);
    await userEvent.click(doc.getByRole("button", { name: /^Save proof$/ }));
    await userEvent.click(doc.getByRole("button", { name: /^Close$/ }));
    await userEvent.click(
      canvas.getByRole("button", { name: "Change preview appearance" }),
    );
    await expect(
      canvas.getByRole("button", { name: "View progress" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Add proof" }),
    ).toBeDisabled();
    await userEvent.click(
      canvas.getByRole("button", { name: "View progress" }),
    );
    await expect(
      doc.getByRole("button", { name: "Saving proof…" }),
    ).toBeDisabled();
    await expect(
      doc.getByRole("textbox", { name: "Delivery link" }),
    ).toHaveValue(draft);
  },
};
