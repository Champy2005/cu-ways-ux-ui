import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProofRecord } from "../compositions/layout";
const meta = {
  id: "component-proofrecord",
  title: "Components/ProofRecord",
  component: ProofRecord,
  decorators: [
    (Story) => (
      <div style={{ padding: "1.5rem", maxWidth: "48rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProofRecord>;
export default meta;
export const Default: StoryObj<typeof meta> = {
  args: {
    url: "https://example.com/%zz?q=1#proof",
    timestamp: "Saved 28 Oct 2026, 14:20 ICT",
  },
};
