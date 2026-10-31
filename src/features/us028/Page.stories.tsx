import type { Meta, StoryObj } from "@storybook/react-vite";
import { TaskPage } from "../shared/TaskPage";
import { verifyScenario } from "../../testing/scenario";
const meta = {
  id: "us028",
  title: "Pages/US028",
  component: TaskPage,
  args: { feature: "028", timing: "hold" },
  argTypes: { timing: { control: "select", options: ["hold", "auto"] } },
  parameters: { ui: { feature: "028" } },
} satisfies Meta<typeof TaskPage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const A01: Story = {
  name: "Pending job",
  args: { scenario: "A01" },
  parameters: {
    ui: {
      legacyId: "A01",
      expected: "Cancellation is available to the creator.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "A01"),
};
export const A02: Story = {
  name: "Accepted job",
  args: { scenario: "A02" },
  parameters: {
    ui: {
      legacyId: "A02",
      expected: "Show current contract details and an explicit cancel action.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "A02"),
};
export const A03: Story = {
  name: "In Progress job",
  args: { scenario: "A03" },
  parameters: {
    ui: {
      legacyId: "A03",
      expected: "Allow cancellation with its consequences explained.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "A03"),
};
export const A04: Story = {
  name: "Cancellation confirmation",
  args: { scenario: "A04" },
  parameters: {
    ui: {
      legacyId: "A04",
      expected:
        "Show job identity and effects; Keep job closes the dialog without changes.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "A04"),
};
export const A05: Story = {
  name: "Cancellation pending",
  args: { scenario: "A05" },
  parameters: {
    ui: {
      legacyId: "A05",
      expected:
        "Submit once. Permit Close, Escape, outside dismissal and Continue browsing while preserving the operation and View progress. A 12-second deadline or document return becomes unknown/check state with no automatic resubmission.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "A05"),
};
export const A06: Story = {
  name: "Cancellation confirmed",
  args: { scenario: "A06" },
  parameters: {
    ui: {
      legacyId: "A06",
      expected:
        "Show Cancelled, zero active requests and zero Pending offers; remove cancellation.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "A06"),
};
export const B01: Story = {
  name: "Paid job",
  args: { scenario: "B01" },
  parameters: {
    ui: {
      legacyId: "B01",
      expected:
        "Explain why cancellation is unavailable and do not enable cancellation.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "B01"),
};
export const B02: Story = {
  name: "Completed job",
  args: { scenario: "B02" },
  parameters: {
    ui: {
      legacyId: "B02",
      expected:
        "Preserve payment and review history; do not allow cancellation.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "B02"),
};
export const B03: Story = {
  name: "Already Cancelled",
  args: { scenario: "B03" },
  parameters: {
    ui: {
      legacyId: "B03",
      expected: "Keep cancellation read-only and do not resubmit.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "B03"),
};
export const B04: Story = {
  name: "Unverified state",
  args: { scenario: "B04" },
  parameters: {
    ui: {
      legacyId: "B04",
      expected: "Do not guess eligibility; offer a fresh read.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "B04"),
};
export const R01: Story = {
  name: "Unknown cancellation outcome",
  args: { scenario: "R01" },
  parameters: {
    ui: {
      legacyId: "R01",
      expected: "Check current job state before a new cancellation.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "R01"),
};
export const R02: Story = {
  name: "Cancellation rejected",
  args: { scenario: "R02" },
  parameters: {
    ui: {
      legacyId: "R02",
      expected: "Keep the current contract and offer refresh.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "R02"),
};
export const R03: Story = {
  name: "Access removed",
  args: { scenario: "R03" },
  parameters: {
    ui: {
      legacyId: "R03",
      expected: "Remove private contract data and mutation controls.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "R03"),
};
export const R04: Story = {
  name: "Job read failed",
  args: { scenario: "R04" },
  parameters: {
    ui: {
      legacyId: "R04",
      expected: "Show failure rather than an empty or cancellable job.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "R04"),
};
export const R05: Story = {
  name: "Job loading",
  args: { scenario: "R05" },
  parameters: {
    ui: {
      legacyId: "R05",
      expected: "Prevent cancellation while eligibility is unknown.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "028", "R05"),
};
