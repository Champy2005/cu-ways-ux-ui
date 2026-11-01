import type { Meta, StoryObj } from "@storybook/react-vite";
import { CloseControl } from "./primitives";

const meta = {
  id: "component-closecontrol",
  title: "Components/CloseControl",
  component: CloseControl,
  decorators: [
    (Story) => (
      <div style={{ padding: "1.5rem", maxWidth: "48rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CloseControl>;
export default meta;
export const Default: StoryObj<typeof meta> = { args: { onClick: () => {} } };
