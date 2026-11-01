import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusHeading } from "../compositions/layout";
const meta = {
  id: "component-statusheading",
  title: "Components/StatusHeading",
  component: StatusHeading,
  decorators: [
    (Story) => (
      <div style={{ padding: "1.5rem", maxWidth: "48rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StatusHeading>;
export default meta;
export const Default: StoryObj<typeof meta> = {
  args: { title: "Campus Dining", context: "Job #41", status: "In Progress" },
};
