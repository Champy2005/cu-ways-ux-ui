import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConfirmationActions } from "../compositions/layout";
import { Action } from "./primitives";
const meta = {
  id: "component-confirmationactions",
  title: "Components/ConfirmationActions",
  component: ConfirmationActions,
  decorators: [
    (Story) => (
      <div style={{ padding: "1.5rem", maxWidth: "48rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ConfirmationActions>;
export default meta;
export const Default: StoryObj<typeof meta> = {
  args: {
    safe: <Action role="safe">Keep job</Action>,
    commit: <Action role="destructive">Confirm cancellation</Action>,
  },
};
