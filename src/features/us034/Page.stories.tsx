import type { Meta, StoryObj } from "@storybook/react-vite";
import { Reviews } from "./Reviews";
import { verifyScenario } from "../../testing/scenario";
const meta = {
  id: "us034",
  title: "Pages/US034",
  component: Reviews,
  args: { timing: "hold", fixture: "standard" },
  argTypes: {
    timing: { control: "select", options: ["hold", "auto", "stalled"] },
  },
  parameters: { ui: { feature: "034" } },
} satisfies Meta<typeof Reviews>;
export default meta;
type Story = StoryObj<typeof meta>;
export const A01: Story = {
  name: "Verified reviews",
  args: { scenario: "A01" },
  parameters: {
    ui: {
      legacyId: "A01",
      expected: "Show average, count and verified cards from completed jobs.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "034", "A01"),
};
export const A02: Story = {
  name: "No reviews yet",
  args: { scenario: "A02" },
  parameters: {
    ui: {
      legacyId: "A02",
      expected:
        "Show No reviews yet and No ratings yet without a 0.00 average.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "034", "A02"),
};
export const A03: Story = {
  name: "Rating-only reviews",
  args: { scenario: "A03" },
  parameters: {
    ui: {
      legacyId: "A03",
      expected:
        "Show rating, date and a plain job reference without inventing a comment or linking to inaccessible private details.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "034", "A03"),
};
export const A04: Story = {
  name: "Long written review",
  args: { scenario: "A04" },
  parameters: {
    ui: {
      legacyId: "A04",
      expected:
        "Show a bounded preview with native Read full review / Show less disclosure. Preserve the complete Unicode comment, author, date and rating; expansion survives appearance re-renders.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "034", "A04"),
};
export const A05: Story = {
  name: "Next review page",
  args: { scenario: "A05" },
  parameters: {
    ui: {
      legacyId: "A05",
      expected: "Show bounded pagination and retain rating filter.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "034", "A05"),
};
export const B01: Story = {
  name: "Nonqualifying records excluded",
  args: { scenario: "B01" },
  parameters: {
    ui: {
      legacyId: "B01",
      expected: "Exclude them from cards, count, average and distribution.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "034", "B01"),
};
export const B02: Story = {
  name: "No matching rating",
  args: { scenario: "B02" },
  parameters: {
    ui: {
      legacyId: "B02",
      expected:
        "Keep the true overall rating, show a compact filter-specific empty state and Show all ratings reset. Omit redundant single-page pagination.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "034", "B02"),
};
export const R01: Story = {
  name: "Reviews loading",
  args: { scenario: "R01" },
  parameters: {
    ui: {
      legacyId: "R01",
      expected: "Do not invent a zero rating or empty review conclusion.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "034", "R01"),
};
export const R02: Story = {
  name: "Reviews read failed",
  args: { scenario: "R02" },
  parameters: {
    ui: {
      legacyId: "R02",
      expected: "Show retry and suppress the unavailable rating.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "034", "R02"),
};
export const R03: Story = {
  name: "Profile unavailable",
  args: { scenario: "R03" },
  parameters: {
    ui: {
      legacyId: "R03",
      expected: "Show a generic unavailable state without review details.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "034", "R03"),
};
