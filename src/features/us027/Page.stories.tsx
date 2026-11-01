import type { Meta, StoryObj } from "@storybook/react-vite";
import { TaskPage } from "../shared/TaskPage";
import { verifyScenario } from "../../testing/scenario";
const meta = {
  id: "us027",
  title: "Pages/US027",
  component: TaskPage,
  args: { feature: "027", timing: "hold" },
  argTypes: {
    timing: { control: "select", options: ["hold", "auto", "stalled"] },
  },
  parameters: { ui: { feature: "027" } },
} satisfies Meta<typeof TaskPage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const A01: Story = {
  name: "Missing proof",
  args: { scenario: "A01" },
  parameters: {
    ui: {
      legacyId: "A01",
      expected:
        "Show missing Proof and keep the job In Progress. Run completion check opens the blocked warning.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "027", "A01"),
};
export const A02: Story = {
  name: "Completion blocked warning",
  args: { scenario: "A02" },
  parameters: {
    ui: {
      legacyId: "A02",
      expected:
        "Use a compact Requirements incomplete dialog, short blocker list and clear proof route. Keep status unchanged; avoid repeated paragraphs and competing recovery buttons.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "027", "A02"),
};
export const A03: Story = {
  name: "All requirements met",
  args: { scenario: "A03" },
  parameters: {
    ui: {
      legacyId: "A03",
      expected:
        "Enable an explicit completion check; proof alone is not sufficient.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "027", "A03"),
};
export const A04: Story = {
  name: "Confirm completion",
  args: { scenario: "A04" },
  parameters: {
    ui: {
      legacyId: "A04",
      expected:
        "Confirm job identity and the final transition before sending a request.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "027", "A04"),
};
export const A05: Story = {
  name: "Completion pending",
  args: { scenario: "A05" },
  parameters: {
    ui: {
      legacyId: "A05",
      expected:
        "Submit once. Permit Close, Escape, outside dismissal and Continue browsing while preserving the operation and View progress. A 12-second deadline or document return becomes unknown/check state with no automatic resubmission.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "027", "A05"),
};
export const A06: Story = {
  name: "Completion confirmed",
  args: { scenario: "A06" },
  parameters: {
    ui: {
      legacyId: "A06",
      expected: "Show Completed and remove the completion mutation.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "027", "A06"),
};
export const B01: Story = {
  name: "Payment is not Paid",
  args: { scenario: "B01" },
  parameters: {
    ui: {
      legacyId: "B01",
      expected: "Show the missing payment prerequisite and block completion.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "027", "B01"),
};
export const B02: Story = {
  name: "Accepted offer mismatch",
  args: { scenario: "B02" },
  parameters: {
    ui: {
      legacyId: "B02",
      expected: "Explain the offer prerequisite and keep status unchanged.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "027", "B02"),
};
export const B03: Story = {
  name: "Job has not started",
  args: { scenario: "B03" },
  parameters: {
    ui: {
      legacyId: "B03",
      expected: "Do not expose a completion request for an unstarted job.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "027", "B03"),
};
export const B04: Story = {
  name: "Cancelled job",
  args: { scenario: "B04" },
  parameters: {
    ui: { legacyId: "B04", expected: "Keep the terminal state read-only." },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "027", "B04"),
};
export const R01: Story = {
  name: "Unknown completion outcome",
  args: { scenario: "R01" },
  parameters: {
    ui: {
      legacyId: "R01",
      expected:
        "Offer a read-only status check; never automatically repeat completion.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "027", "R01"),
};
export const R02: Story = {
  name: "Requirements unavailable",
  args: { scenario: "R02" },
  parameters: {
    ui: {
      legacyId: "R02",
      expected:
        "Show read failure rather than known prerequisites and disable completion.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "027", "R02"),
};
export const R03: Story = {
  name: "Access removed",
  args: { scenario: "R03" },
  parameters: {
    ui: {
      legacyId: "R03",
      expected: "Remove all private job and delivery data.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "027", "R03"),
};
export const R04: Story = {
  name: "Requirements loading",
  args: { scenario: "R04" },
  parameters: {
    ui: {
      legacyId: "R04",
      expected: "Announce the read and prevent completion until resolved.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "027", "R04"),
};
