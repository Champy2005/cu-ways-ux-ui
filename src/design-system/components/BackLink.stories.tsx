import type { Meta, StoryObj } from "@storybook/react-vite";
import { BackLink } from "./primitives";

const meta = {
  id: "component-backlink",
  title: "Components/BackLink",
  component: BackLink,
  decorators: [
    (Story) => (
      <div style={{ padding: "1.5rem", maxWidth: "48rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BackLink>;
export default meta;
export const Default: StoryObj<typeof meta> = {
  args: { children: "Back to workspace", href: "#workspace" },
};
