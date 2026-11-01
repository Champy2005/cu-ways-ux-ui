import type { Meta, StoryObj } from "@storybook/react-vite";
import { MyJobs } from "./MyJobs";
import { verifyScenario } from "../../testing/scenario";
const meta = {
  id: "us025",
  title: "Pages/US025",
  component: MyJobs,
  args: { timing: "hold" },
  argTypes: {
    timing: { control: "select", options: ["hold", "auto", "stalled"] },
  },
  parameters: { ui: { feature: "025" } },
} satisfies Meta<typeof MyJobs>;
export default meta;
type Story = StoryObj<typeof meta>;
export const L01: Story = {
  name: "My Jobs loading",
  args: { scenario: "L01" },
  parameters: {
    ui: {
      legacyId: "L01",
      expected:
        "Show the My Jobs heading, filter skeleton, and three noninteractive card skeletons; mark the main region aria-busy. Do not flash an empty state or mutate data.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "L01"),
};
export const L02: Story = {
  name: "My Jobs with hired jobs",
  args: { scenario: "L02" },
  parameters: {
    ui: {
      legacyId: "L02",
      expected:
        "Show only owned jobs with Job #ID, survey names, creator, agreed price, deadline, lifecycle badge, and View job. Sort Job ID descending, 20 per page; do not show inline Start.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "L02"),
};
export const L03: Story = {
  name: "No active jobs",
  args: { scenario: "L03" },
  parameters: {
    ui: {
      legacyId: "L03",
      expected:
        "Show “No active jobs” and “Jobs appear here after a creator accepts your offer.” View all my jobs switches to All; also show Back to overview.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "L03"),
};
export const L04: Story = {
  name: "No hired jobs",
  args: { scenario: "L04" },
  parameters: {
    ui: {
      legacyId: "L04",
      expected:
        "Show “No hired jobs yet” and “Jobs appear here after a creator accepts your offer.” Do not route to the unavailable Invitations page as a successful next step.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "L04"),
};
export const L05: Story = {
  name: "No jobs for this status",
  args: { scenario: "L05" },
  parameters: {
    ui: {
      legacyId: "L05",
      expected:
        "Show “No jobs with this status” and retain the selected filter.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "L05"),
};
export const L06: Story = {
  name: "My Jobs load error",
  args: { scenario: "L06" },
  parameters: {
    ui: {
      legacyId: "L06",
      expected:
        "Show “Jobs couldn’t load. Try again.” Do not show fake records or empty-state language.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "L06"),
};
export const L07: Story = {
  name: "Previously loaded jobs",
  args: { scenario: "L07" },
  parameters: {
    ui: {
      legacyId: "L07",
      expected:
        "Show a warning that latest results could not load and mark retained cards “Previously loaded results.” Keep controls usable; opening a job always revalidates it.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "L07"),
};
export const L08: Story = {
  name: "Changing list filter or page",
  args: { scenario: "L08" },
  parameters: {
    ui: {
      legacyId: "L08",
      expected:
        "Keep the filter accessible while results load; preserve filter/page in the URL, reset page to 1 on filter change, announce result count, and ignore late responses from prior filters.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "L08"),
};
export const L09: Story = {
  name: "My Jobs unavailable",
  args: { scenario: "L09" },
  parameters: {
    ui: {
      legacyId: "L09",
      expected:
        "Show “My Jobs isn’t available yet. Please return to your overview.” Do not loop loading or substitute demo fixtures.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "L09"),
};
export const D01: Story = {
  name: "Job details loading",
  args: { scenario: "D01" },
  parameters: {
    ui: {
      legacyId: "D01",
      expected:
        "Keep the detail layout with skeleton content and no Start action; mark loading accessibly. Do not expose unverified job data.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "D01"),
};
export const D02: Story = {
  name: "Accepted job ready to start",
  args: { scenario: "D02" },
  parameters: {
    ui: {
      legacyId: "D02",
      expected:
        "Show the Contract heading, Accepted badge, agreed price, verified survey context and an enabled Start job action. Omit repeated explanations of the visible status.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "D02"),
};
export const D03: Story = {
  name: "Job details load error",
  args: { scenario: "D03" },
  parameters: {
    ui: {
      legacyId: "D03",
      expected:
        "Show “Job details couldn’t load” with “Try again.” Show no old job title, context, or enabled Start.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "D03"),
};
export const D04: Story = {
  name: "Job in progress",
  args: { scenario: "D04" },
  parameters: {
    ui: {
      legacyId: "D04",
      expected:
        "Show the Contract heading, In Progress badge and agreed price. Keep the page read-only with Refresh job and the consistent top-left return link; omit repeated status descriptions.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "D04"),
};
export const D05: Story = {
  name: "Completed or cancelled job",
  args: { scenario: "D05" },
  parameters: {
    ui: {
      legacyId: "D05",
      expected:
        "Show the matching textual badge and read-only context. Add no Start, review, payment, or cancellation action.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "D05"),
};
export const D06: Story = {
  name: "Job unavailable",
  args: { scenario: "D06" },
  parameters: {
    ui: {
      legacyId: "D06",
      expected:
        "Show “Job unavailable” and “This job couldn’t be found or you don’t have access to it.” Do not show job title, creator, offer, price, or other identifying context.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "D06"),
};
export const D07: Story = {
  name: "Marketer access required",
  args: { scenario: "D07" },
  parameters: {
    ui: {
      legacyId: "D07",
      expected:
        "Show “Marketer access required” and “Use an account with marketer access to view hired jobs.” Show no job data; role switching is not permission elevation.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "D07"),
};
export const D08: Story = {
  name: "Job details need refreshing",
  args: { scenario: "D08" },
  parameters: {
    ui: {
      legacyId: "D08",
      expected:
        "Show “Job details need refreshing” and “This job isn’t ready to start. Refresh its details or contact support.” Hide untrusted fields; do not mutate or display false status such as Cancelled.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "D08"),
};
export const D09: Story = {
  name: "Accepted job with optional context missing",
  args: { scenario: "D09" },
  parameters: {
    ui: {
      legacyId: "D09",
      expected:
        "Keep the normal Accepted detail and enabled Start action. Use “No brief attached,” “No deadline set,” “Target not specified,” “Link unavailable,” or “Not specified” for absent optional values; do not invent a deadline or block start.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "D09"),
};
export const D10: Story = {
  name: "Session expired",
  args: { scenario: "D10" },
  parameters: {
    ui: {
      legacyId: "D10",
      expected:
        "Send the viewer to sign-in with a same-origin allowlisted return URL. Show “Your session expired. Sign in to check this job’s status.” Re-read after login; never auto-start or auto-replay.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "D10"),
};
export const C01: Story = {
  name: "Confirm start",
  args: { scenario: "C01" },
  parameters: {
    ui: {
      legacyId: "C01",
      expected:
        "Use the declarative Start job title, Job #ID and the server-provided agreed THB price. Initially focus Cancel, or the visible heading if the dialog scrolls; preserve a focus trap and a close control. Do not repeat the obvious status transition.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "C01"),
};
export const C02: Story = {
  name: "Confirmation dismissed",
  args: { scenario: "C02" },
  parameters: {
    ui: {
      legacyId: "C02",
      expected:
        "Return to the Accepted detail and originating scroll position; restore focus to Start job when the page remains. Send zero start requests. Browser Back follows normal history and sends no mutation.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "C02"),
};
export const C03: Story = {
  name: "Start request submitting",
  args: { scenario: "C03" },
  parameters: {
    ui: {
      legacyId: "C03",
      expected:
        "Show one busy submission with concise progress. Prevent duplicate submission while keeping Close, Escape, outside dismissal and Continue browsing available. Dismissal preserves the operation and a View progress affordance.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "C03"),
};
export const C04: Story = {
  name: "Start request taking longer",
  args: { scenario: "C04" },
  parameters: {
    ui: {
      legacyId: "C04",
      expected:
        "Keep the same concise progress presentation and enabled dismissal. A 12-second presentation deadline becomes an unknown outcome with read recovery; it never asserts rollback or sends another POST.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "C04"),
};
export const C05: Story = {
  name: "Pending confirmation dismissed",
  args: { scenario: "C05" },
  parameters: {
    ui: {
      legacyId: "C05",
      expected:
        "Close the confirmation, keep the original operation active and expose View progress. Do not duplicate the write or claim cancellation. On return after document navigation, retain unknown/check state without replaying intent.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "C05"),
};
export const C06: Story = {
  name: "Safe return after navigation",
  args: { scenario: "C06" },
  parameters: {
    ui: {
      legacyId: "C06",
      expected:
        "Allow normal browser navigation without a beforeunload trap or undo promise. On return, make a fresh authoritative read through the safe internal return path; never auto-repeat POST or expose cached private details before authorization.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "C06"),
};
export const C07: Story = {
  name: "Job started",
  args: { scenario: "C07" },
  parameters: {
    ui: {
      legacyId: "C07",
      expected:
        "Close the dialog, show the In Progress badge and “Job started” / “Status changed to In Progress.” Announce once, focus the detail heading, invalidate list/detail caches, and retain the confirmed result if a background read fails.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "C07"),
};
export const C08: Story = {
  name: "Start rejected; recheck required",
  args: { scenario: "C08" },
  parameters: {
    ui: {
      legacyId: "C08",
      expected:
        "Close the dialog and show a persistent error alert with the latest details. Keep Start disabled until an authoritative read confirms retry eligibility; do not automatically POST. The approved docs specify no exact body copy for this rejection.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "C08"),
};
export const R01: Story = {
  name: "Checking job status",
  args: { scenario: "R01" },
  parameters: {
    ui: {
      legacyId: "R01",
      expected:
        "Close the dialog, show “Checking job status…,” and disable Start while issuing a fresh detail GET. A transport failure does not prove rollback.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "R01"),
};
export const R02: Story = {
  name: "Already in progress",
  args: { scenario: "R02" },
  parameters: {
    ui: {
      legacyId: "R02",
      expected:
        "Show In Progress and “This job is already in progress.” Do not send a second POST or claim this tab caused the transition.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "R02"),
};
export const R03: Story = {
  name: "Accepted after outcome check",
  args: { scenario: "R03" },
  parameters: {
    ui: {
      legacyId: "R03",
      expected:
        "Show “The latest check shows Accepted. You can try again.” Enable a fresh confirmation only under the atomic idempotent contract: an earlier request may still commit, so the GET alone does not make retry safe.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "R03"),
};
export const R04: Story = {
  name: "Start status not confirmed",
  args: { scenario: "R04" },
  parameters: {
    ui: {
      legacyId: "R04",
      expected:
        "Show “Start status not confirmed” and “We couldn’t confirm whether this job started. Refresh to check its current status.” Retain details only as last confirmed; do not label Accepted as current or enable Start.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "R04"),
};
export const R05: Story = {
  name: "Repeated start already in progress",
  args: { scenario: "R05" },
  parameters: {
    ui: {
      legacyId: "R05",
      expected:
        "Show the In Progress badge and informational “This job is already in progress.” Treat repeat start as success, not a 409; do not claim which session started it.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "R05"),
};
export const R06: Story = {
  name: "Job is terminal",
  args: { scenario: "R06" },
  parameters: {
    ui: {
      legacyId: "R06",
      expected:
        "Show the authoritative terminal badge and “This job is now {status} and can’t be started.” Remove Start; add no terminal action.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "R06"),
};
export const R07: Story = {
  name: "Start permission denied",
  args: { scenario: "R07" },
  parameters: {
    ui: {
      legacyId: "R07",
      expected:
        "Show “Unable to start job” and “You don’t have permission to start this job.” Remove Start and refresh details/capability; retain context only while read permission remains valid.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "R07"),
};
export const R08: Story = {
  name: "Access no longer available",
  args: { scenario: "R08" },
  parameters: {
    ui: {
      legacyId: "R08",
      expected:
        "Show the same generic “Job unavailable” page as a missing job, clear cached job details, and reveal no owner, offer, title, or price.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "R08"),
};
export const R09: Story = {
  name: "Session expired during start check",
  args: { scenario: "R09" },
  parameters: {
    ui: {
      legacyId: "R09",
      expected:
        "Clear private job details and show “Your session expired. Sign in to check this job’s status.” Use a safe return URL; re-read after sign-in and never auto-resubmit.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "R09"),
};
export const R10: Story = {
  name: "Required start details invalid",
  args: { scenario: "R10" },
  parameters: {
    ui: {
      legacyId: "R10",
      expected:
        "Show “This job isn’t ready to start. Refresh its details or contact support.” Do not show an offer selector or raw database/trigger errors; do not enable Start.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "R10"),
};
export const R11: Story = {
  name: "Offline before start",
  args: { scenario: "R11" },
  parameters: {
    ui: {
      legacyId: "R11",
      expected:
        "Retain the pink Start job affordance. Activation explains the connection requirement and sends no write; it does not silently queue a request. Accepted remains the last confirmed status until refreshed.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "R11"),
};
export const R12: Story = {
  name: "Rejected start; latest status unavailable",
  args: { scenario: "R12" },
  parameters: {
    ui: {
      legacyId: "R12",
      expected:
        "Show the start-status error and “Latest status unavailable.” Keep Start disabled until an authoritative refresh succeeds and no earlier start remains unresolved.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "R12"),
};
export const R13: Story = {
  name: "Rechecking after returning to the page",
  args: { scenario: "R13" },
  parameters: {
    ui: {
      legacyId: "R13",
      expected:
        "Run one background authoritative refresh, show “Checking job status…,” and disable Start while checking. Preserve focus; use no polling loop or realtime promise.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "R13"),
};
export const R14: Story = {
  name: "Latest details could not refresh after start",
  args: { scenario: "R14" },
  parameters: {
    ui: {
      legacyId: "R14",
      expected:
        "Keep In Progress labeled as last confirmed and show “Couldn’t load the latest details. Showing the last confirmed information.” Offer Refresh job; never revert to Accepted or claim the start failed.",
    },
  },
  play: async ({ canvasElement }) =>
    verifyScenario(canvasElement, "025", "R14"),
};
