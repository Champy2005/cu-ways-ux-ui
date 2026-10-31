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
  await expect(canvas.getByRole("main", { hidden: true })).toBeVisible();
  await expect(
    canvas.getByRole("heading", { level: 1, hidden: true }),
  ).toBeVisible();
  const specification = features[feature].find((s) => s.id === id);
  await expect(specification?.expected).toBeTruthy();
  if (feature === "026") {
    const state = proof.createDemoState(id);
    if (!state.job) {
      await expect(canvas.getByText("This job isn’t available")).toBeVisible();
      await expect(canvas.queryByText("Campus Dining")).not.toBeInTheDocument();
    } else if (state.listStatus === "loading")
      await expect(canvas.getByText("Loading saved proof")).toBeVisible();
    else if (state.listStatus === "failed")
      await expect(canvas.getByText("Saved proof unavailable")).toBeVisible();
    else {
      await expect(
        canvas.getByRole("heading", {
          name: `Saved proof (${state.rows.length})`,
          hidden: true,
        }),
      ).toBeVisible();
      await expect(canvas.getAllByText("In Progress")).toHaveLength(1);
    }
    if (["A02", "A03", "A05", "B01", "B04"].includes(id))
      await expect(doc.getByRole("dialog")).toBeVisible();
    if (id === "B01")
      await expect(doc.getByRole("alert")).toHaveTextContent("HTTP");
    if (!window.__UI_CAPTURE__ && id === "A01") {
      await userEvent.click(canvas.getByRole("button", { name: "Add proof" }));
      await userEvent.type(
        doc.getByRole("textbox", { name: "Delivery link" }),
        "https://example.com/proof/new",
      );
      await userEvent.click(doc.getByRole("button", { name: "Save proof" }));
      await expect(
        doc.getByRole("button", { name: "Save proof" }),
      ).toBeDisabled();
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
    }
    if (state.modal) await expect(doc.getByRole("dialog")).toBeVisible();
    if (!window.__UI_CAPTURE__ && id === "A04") {
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
    if (!window.__UI_CAPTURE__ && id === "A04") {
      await userEvent.click(canvas.getByRole("button", { name: "Read more" }));
      await expect(
        canvas.getByRole("button", { name: "Show less" }),
      ).toBeVisible();
    }
  } else {
    const state = createDemoState({ scenarioId: id });
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
    else if (state.route === "detail" && id !== "D03")
      await expect(
        canvas.getByRole("heading", { name: "Job overview", hidden: true }),
      ).toBeVisible();
    if (state.confirmationOpen)
      await expect(doc.getByRole("dialog")).toBeVisible();
    if (!window.__UI_CAPTURE__ && id === "C01") {
      await userEvent.click(doc.getByRole("button", { name: "Start job" }));
      await expect(doc.getByRole("dialog")).toHaveTextContent("Submitting");
      await userEvent.click(doc.getByRole("button", { name: "Close" }));
      await expect(
        canvas.getByRole("button", { name: "View progress" }),
      ).toBeVisible();
    }
  }
}
