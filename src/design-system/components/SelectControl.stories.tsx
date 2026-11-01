import type { Meta, StoryObj } from "@storybook/react-vite";
import { SelectControl } from "./primitives";

const meta = {
  id: "component-selectcontrol",
  title: "Components/SelectControl",
  component: SelectControl,
  decorators: [
    (Story) => (
      <div style={{ padding: "1.5rem", maxWidth: "48rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SelectControl>;
export default meta;
export const Default: StoryObj<typeof meta> = {
  args: {
    label: "Status",
    value: "Accepted",
    options: [
      { value: "Accepted", label: "Accepted" },
      { value: "In Progress", label: "In Progress" },
    ],
    onChange: () => {},
  },
};
