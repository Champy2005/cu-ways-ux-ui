import type { Meta, StoryObj } from "@storybook/react-vite";
import { Action } from "./primitives";

const meta = {
  id: "component-action",
  title: "Components/Action",
  component: Action,
  decorators: [
    (Story) => (
      <div style={{ padding: "1.5rem", maxWidth: "48rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Action>;
export default meta;
export const Default: StoryObj<typeof meta> = {
  args: { children: "View activity", role: "supporting" },
};
