import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pagination } from "./primitives";

const meta = {
  id: "component-pagination",
  title: "Components/Pagination",
  component: Pagination,
  decorators: [
    (Story) => (
      <div style={{ padding: "1.5rem", maxWidth: "48rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Pagination>;
export default meta;
export const Default: StoryObj<typeof meta> = {
  args: { page: 2, pages: 3, onChange: () => {} },
};
