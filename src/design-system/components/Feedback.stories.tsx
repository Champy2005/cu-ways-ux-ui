import type { Meta, StoryObj } from "@storybook/react-vite";
import { Feedback } from "./primitives";

const meta = {
  id: "component-feedback",
  title: "Components/Feedback",
  component: Feedback,
  decorators: [
    (Story) => (
      <div style={{ padding: "1.5rem", maxWidth: "48rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Feedback>;
export default meta;
export const Default: StoryObj<typeof meta> = {
  args: {
    title: "Save not confirmed",
    tone: "warning",
    children: "Check the saved list before retrying.",
  },
};
