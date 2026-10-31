import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProofDelivery } from "./ProofDelivery";
import { verifyScenario } from "../../testing/scenario";
const meta = {
  id: "us026",
  title: "Pages/US026",
  component: ProofDelivery,
  args: { timing: "hold" },
  argTypes: { timing: { control: "select", options: ["hold", "auto"] } },
  parameters: { ui: { feature: "026" } },
} satisfies Meta<typeof ProofDelivery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const A01: Story = {
  name: "Start with no proof",
  args: { scenario: "A01" },
  parameters: {
    ui: {
      legacyId: "A01",
      expected:
        "Show one compact saved-proof workspace with an empty state and Add proof action. Add proof opens a separate content dialog without shifting saved proof.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "026", "A01"),
};
export const A02: Story = {
  name: "Paste a delivery link",
  args: { scenario: "A02" },
  parameters: {
    ui: {
      legacyId: "A02",
      expected:
        "Show the Delivery link field in the content dialog. Keep the attachment type fixed internally to Proof. URL shape alone does not verify remote sharing permissions.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "026", "A02"),
};
export const A03: Story = {
  name: "Save once",
  args: { scenario: "A03" },
  parameters: {
    ui: {
      legacyId: "A03",
      expected:
        "Submit once and retain the draft until confirmation. Continue browsing closes the form while saving continues; View progress reopens it. A 12-second deadline or document return restores explicit uncertainty and check-before-retry.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "026", "A03"),
};
export const A04: Story = {
  name: "Proof is saved",
  args: { scenario: "A04" },
  parameters: {
    ui: {
      legacyId: "A04",
      expected:
        "Show one saved Proof URL and its server-generated timestamp. Clear the draft only after confirmation.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "026", "A04"),
};
export const A05: Story = {
  name: "Add another link",
  args: { scenario: "A05" },
  parameters: {
    ui: {
      legacyId: "A05",
      expected:
        "Keep existing evidence visible below the inline form in the same saved-proof workspace.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "026", "A05"),
};
export const A06: Story = {
  name: "Review delivery evidence",
  args: { scenario: "A06" },
  parameters: {
    ui: {
      legacyId: "A06",
      expected:
        "Show full clickable URLs and timestamps newest first. Saving proof does not complete the job.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "026", "A06"),
};
export const B01: Story = {
  name: "Correct the URL",
  args: { scenario: "B01" },
  parameters: {
    ui: {
      legacyId: "B01",
      expected:
        "Keep the draft, show an inline field error, focus the input, and create no saved row.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "026", "B01"),
};
export const B02: Story = {
  name: "Attachment type rejected",
  args: { scenario: "B02" },
  parameters: {
    ui: {
      legacyId: "B02",
      expected:
        "Show an explicit rejection, create no visible row, and retain the URL for recovery.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "026", "B02"),
};
export const B03: Story = {
  name: "Connection lost during save",
  args: { scenario: "B03" },
  parameters: {
    ui: {
      legacyId: "B03",
      expected:
        "Do not optimistically show a saved row or submit again. Read the authoritative list before deciding whether a retry is safe.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "026", "B03"),
};
export const B04: Story = {
  name: "Checked: link was not saved",
  args: { scenario: "B04" },
  parameters: {
    ui: {
      legacyId: "B04",
      expected:
        "Keep the URL and make one explicit retry available. Never replay the original request automatically.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "026", "B04"),
};
export const C01: Story = {
  name: "Saved proof cannot load",
  args: { scenario: "C01" },
  parameters: {
    ui: {
      legacyId: "C01",
      expected:
        "Show a consistent top-left return, page header and one recovery group. Do not present failed loading as an empty list or enable submission without known context.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "026", "C01"),
};
export const C02: Story = {
  name: "Job status has changed",
  args: { scenario: "C02" },
  parameters: {
    ui: {
      legacyId: "C02",
      expected:
        "Remove the submit action and refresh the job context before showing its current status.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "026", "C02"),
};
export const C03: Story = {
  name: "Access is no longer available",
  args: { scenario: "C03" },
  parameters: {
    ui: {
      legacyId: "C03",
      expected:
        "Clear private job details, proof URLs, and the unsaved draft from the screen.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "026", "C03"),
};
export const C04: Story = {
  name: "Loading saved proof",
  args: { scenario: "C04" },
  parameters: {
    ui: {
      legacyId: "C04",
      expected:
        "Show neutral progress and Stop waiting, plus navigation. After 12 seconds expose read recovery. Do not imply an empty list or enable submit while context is unknown.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "026", "C04"),
};
