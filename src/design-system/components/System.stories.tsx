import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Action,
  BackLink,
  CloseControl,
  LifecycleBadge,
  Pagination,
  SelectControl,
  type JobStatus,
} from "./primitives";
import {
  Card,
  ConfirmationActions,
  Stack,
  StatusHeading,
} from "../compositions/layout";
const meta = {
  id: "system",
  title: "System/Contracts",
  component: LifecycleBadge,
  parameters: { ui: { owner: "design-system" } },
  render: () => (
    <div style={{ padding: "2rem", maxWidth: "60rem" }}>
      <Stack>
        <Card title="Lifecycle">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            {(
              [
                "Pending",
                "Accepted",
                "In Progress",
                "Completed",
                "Cancelled",
              ] as JobStatus[]
            ).map((status) => (
              <LifecycleBadge key={status} status={status} />
            ))}
          </div>
        </Card>
        <Card title="Action hierarchy">
          <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
            {(
              [
                "primary",
                "supporting",
                "safe",
                "utility",
                "quiet",
                "destructive",
              ] as const
            ).map((role) => (
              <Action key={role} role={role}>
                {role === "primary"
                  ? "Start job"
                  : role === "supporting"
                    ? "View activity"
                    : role === "safe"
                      ? "Keep job"
                      : role === "quiet"
                        ? "Got it"
                        : role === "destructive"
                          ? "Delete draft"
                          : "Refresh job"}
              </Action>
            ))}
          </div>
        </Card>
        <Card>
          <StatusHeading
            title="Shared heading"
            context="Job #41"
            status="Accepted"
          />
          <ConfirmationActions
            safe={<Action role="safe">Keep job</Action>}
            commit={<Action role="destructive">Confirm cancellation</Action>}
          />
        </Card>
        <Card title="Navigation">
          <BackLink href="#">Back to workspace</BackLink>
          <CloseControl onClick={() => {}} />
          <Pagination page={2} pages={3} onChange={() => {}} />
          <SelectControl
            label="Example status"
            value="Accepted"
            options={["Accepted", "In Progress", "Completed"].map((value) => ({
              value,
              label: value,
            }))}
            onChange={() => {}}
          />
        </Card>
      </Stack>
    </div>
  ),
} satisfies Meta<typeof LifecycleBadge>;
export default meta;
export const Contracts: StoryObj<typeof meta> = {
  args: { status: "Accepted" },
};
