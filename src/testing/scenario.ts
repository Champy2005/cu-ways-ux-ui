import { expect, within, userEvent, waitFor } from "storybook/test";
import type { FeatureId } from "../fixtures/catalog";
import { features } from "../fixtures/catalog";
import * as proof from "../features/us026/model.mjs";
import * as complete from "../features/us027/model.mjs";
import * as cancel from "../features/us028/model.mjs";
import * as review from "../features/us034/model.mjs";
import { createDemoState } from "../features/us025/model.mjs";

declare global {
  interface Window {
    __UI_CAPTURE__?: boolean;
  }
}
/** Each legacy identity owns an executable observable-state contract. */
export async function verifyScenario(
  element: HTMLElement,
  feature: FeatureId,
  id: string,
) {
  const canvas = within(element);
  const doc = within(element.ownerDocument.body);
  const interactionTest =
    import.meta.env.MODE === "test" && !window.__UI_CAPTURE__;
  await expect(canvas.getByRole("main", { hidden: true })).toBeVisible();
  await expect(
    canvas.getByRole("heading", { level: 1, hidden: true }),
  ).toBeVisible();
  // A portal dialog title group is not another application banner landmark.
  await expect(
    element.ownerDocument.querySelectorAll('[data-ui="ContentDialog"] header'),
  ).toHaveLength(0);
  const specification = features[feature].find((s) => s.id === id);
  await expect(specification?.expected).toBeTruthy();
  if (feature === "026") {
    const state = proof.createDemoState(id);
    if (!state.job) {
      await expect(canvas.getByText("This job isn’t available")).toBeVisible();
      await expect(canvas.queryByText("Campus Dining")).not.toBeInTheDocument();
    } else if (state.listStatus === "loading")
      await expect(canvas.getByText("Loading saved proof")).toBeVisible();
    else if (state.listStatus === "failed") {
      await expect(canvas.getByText("Couldn’t load saved proof")).toBeVisible();
      await expect(
        element.querySelectorAll('[data-ui="RecoveryPanel"]'),
      ).toHaveLength(1);
      await expect(
        canvas.getByRole("button", { name: "Try again" }),
      ).toBeEnabled();
    } else {
      await expect(
        canvas.getByRole("heading", {
          name: `Saved proof (${state.rows.length})`,
          hidden: true,
        }),
      ).toBeVisible();
      await expect(canvas.getAllByText("In Progress")).toHaveLength(1);
      await expect(
        element.querySelector('[data-ui="LifecycleBadge"]'),
      ).toHaveAttribute("data-status", state.job.status);
    }
    if (["A02", "A03", "A05", "B01", "B04"].includes(id))
      await expect(doc.getByRole("dialog")).toBeVisible();
    if (id === "B01") {
      await expect(doc.getByRole("alert")).toHaveTextContent("HTTP");
      await expect(
        doc.getByRole("textbox", { name: "Delivery link" }),
      ).toHaveFocus();
    }
    if (interactionTest && id === "A01") {
      await userEvent.click(canvas.getByRole("button", { name: "Add proof" }));
      await userEvent.type(
        doc.getByRole("textbox", { name: "Delivery link" }),
        "https://example.com/proof/new",
      );
      await userEvent.click(doc.getByRole("button", { name: "Save proof" }));
      await expect(doc.getByRole("button", { name: "Saving…" })).toBeDisabled();
      await userEvent.click(doc.getByRole("button", { name: "Close" }));
      await waitFor(() =>
        expect(doc.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      await userEvent.click(
        canvas.getByRole("button", { name: "View progress" }),
      );
      await expect(doc.getByRole("dialog")).toHaveTextContent("Saving proof");
      await userEvent.click(doc.getByRole("button", { name: "Check status" }));
      await expect(
        canvas.getByRole("heading", { name: "Saved proof (1)" }),
      ).toBeVisible();
    }
  } else if (feature === "027" || feature === "028") {
    const state = feature === "027" ? complete.seed(id) : cancel.seed(id);
    if (!state.access) {
      await expect(canvas.getByText("Job unavailable")).toBeVisible();
      await expect(
        canvas.queryByText("Campus dining survey"),
      ).not.toBeInTheDocument();
    } else if (state.pending === "read")
      await expect(
        canvas.getByRole("button", { name: "Stop waiting" }),
      ).toBeEnabled();
    else if (state.message !== "read-failed") {
      await expect(
        canvas.getByText(state.status, { exact: true }),
      ).toBeVisible();
      await expect(
        element.querySelector('[data-ui="LifecycleBadge"]'),
      ).toHaveAttribute("data-status", state.status);
    }
    if (
      feature === "027" &&
      ["B03", "B04", "A06", "R02", "R03", "R04"].includes(id)
    )
      await expect(
        canvas.queryByRole("button", {
          name: "Run completion check",
          hidden: true,
        }),
      ).not.toBeInTheDocument();
    if (feature === "028" && ["B01", "B02", "B03", "B04", "A06"].includes(id))
      await expect(
        canvas.queryByRole("button", {
          name: "Cancel job",
          hidden: true,
        }),
      ).not.toBeInTheDocument();
    if (feature === "028" && id === "B04")
      await expect(
        canvas.getByRole("button", { name: "Check job status" }),
      ).toBeEnabled();
    if (id === "A06") {
      await expect(
        canvas.getByRole("heading", {
          name: feature === "027" ? "Completion record" : "Cancellation record",
        }),
      ).toBeVisible();
      if (feature === "027") {
        await expect(
          canvas.queryByText("Job is In Progress"),
        ).not.toBeInTheDocument();
        await expect(
          element.querySelectorAll('[data-missing="true"]'),
        ).toHaveLength(0);
      }
    }
    if (
      interactionTest &&
      feature === "027" &&
      ["A01", "A03", "B01", "B02"].includes(id)
    ) {
      await userEvent.click(
        canvas.getByRole("button", { name: "Run completion check" }),
      );
      await expect(doc.getByRole("dialog")).toHaveTextContent(
        id === "A03" ? "Complete job" : "Requirements incomplete",
      );
    }
    if (
      interactionTest &&
      feature === "028" &&
      ["A01", "A02", "A03"].includes(id)
    ) {
      await userEvent.click(canvas.getByRole("button", { name: "Cancel job" }));
      await expect(doc.getByRole("dialog")).toHaveTextContent(
        "Confirm cancellation",
      );
      await userEvent.click(doc.getByRole("button", { name: "Keep job" }));
      await waitFor(() =>
        expect(doc.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      await expect(
        canvas.getByText(state.status, { exact: true }),
      ).toBeVisible();
    }
    if (state.modal) await expect(doc.getByRole("dialog")).toBeVisible();
    if (interactionTest && id === "A04") {
      await userEvent.click(
        doc.getByRole("button", {
          name:
            feature === "027" ? "Confirm completion" : "Confirm cancellation",
        }),
      );
      await expect(doc.getByRole("dialog")).toHaveTextContent("Submitting");
      await userEvent.click(doc.getByRole("button", { name: "Close" }));
      await expect(
        canvas.getByRole("button", { name: "View progress" }),
      ).toBeEnabled();
      await userEvent.click(
        canvas.getByRole("button", { name: "View progress" }),
      );
      await userEvent.click(doc.getByRole("button", { name: "Check status" }));
      await expect(
        canvas.getByText(feature === "027" ? "Completed" : "Cancelled", {
          exact: true,
        }),
      ).toBeVisible();
    }
  } else if (feature === "034") {
    const state = review.seed(id);
    if (!state.access)
      await expect(canvas.getByText("Profile unavailable")).toBeVisible();
    else if (state.pending)
      await expect(
        canvas.getByRole("button", { name: "Stop waiting" }),
      ).toBeEnabled();
    else if (state.error)
      await expect(
        canvas.getByRole("button", { name: "Try again" }),
      ).toBeEnabled();
    else if (!state.rows.length)
      await expect(canvas.getByText("No ratings yet")).toBeVisible();
    else {
      await expect(
        canvas.getByRole("heading", { name: "Verified reviews" }),
      ).toBeVisible();
      if (id === "B02")
        await expect(
          canvas.getByText("No reviews match this rating"),
        ).toBeVisible();
    }
    if (interactionTest && id === "A04") {
      await userEvent.click(canvas.getByRole("button", { name: "Read more" }));
      await expect(
        canvas.getByRole("button", { name: "Show less" }),
      ).toBeVisible();
    }
  } else {
    const state = createDemoState({ scenarioId: id });
    const summaries = element.querySelectorAll('[data-ui="JobSummary"]');
    if (
      state.route === "list" &&
      state.privateDataVisible &&
      !["L01", "L03", "L04", "L05", "L06", "L08", "L09"].includes(id)
    ) {
      await expect(summaries.length).toBeGreaterThan(0);
      for (const summary of summaries)
        await expect(
          summary.querySelectorAll('[data-ui="LifecycleBadge"]'),
        ).toHaveLength(1);
    }
    if (!state.privateDataVisible || id === "L09")
      await expect(canvas.getByRole("status")).toBeVisible();
    else if (["L01", "L08", "D01", "R01", "R13"].includes(id))
      await expect(
        canvas.getByRole("button", { name: "Stop waiting" }),
      ).toBeEnabled();
    else if (["L03", "L04", "L05"].includes(id))
      await expect(
        canvas.getByRole("button", { name: "View all my jobs" }),
      ).toBeEnabled();
    else if (state.route === "detail" && !["D03", "D08"].includes(id))
      await expect(
        canvas.getByRole("heading", { name: "Job overview", hidden: true }),
      ).toBeVisible();
    if (id === "D08")
      await expect(
        canvas.queryByText("THB", { exact: false }),
      ).not.toBeInTheDocument();
    if (state.confirmationOpen)
      await expect(doc.getByRole("dialog")).toBeVisible();
    if (interactionTest && id === "C01") {
      await userEvent.click(doc.getByRole("button", { name: "Start job" }));
      await expect(doc.getByRole("dialog")).toHaveTextContent("Submitting");
      await userEvent.click(doc.getByRole("button", { name: "Close" }));
      await expect(
        canvas.getByRole("button", { name: "View progress" }),
      ).toBeVisible();
    }
  }
}
