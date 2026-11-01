import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContentDialog, Field } from "./primitives";

const meta = {
  id: "component-contentdialog",
  title: "Components/ContentDialog",
  component: ContentDialog,
  decorators: [
    (Story) => (
      <div style={{ padding: "1.5rem", maxWidth: "48rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ContentDialog>;
export default meta;
export const Default: StoryObj<typeof meta> = {
  args: {
    open: true,
    title: "Add proof",
    onClose: () => {},
    children: <Field label="Delivery link" value="" onChange={() => {}} />,
  },
};
