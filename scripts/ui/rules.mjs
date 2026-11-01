export const protectedNames = new Set([
  "Action",
  "ActionLink",
  "LifecycleBadge",
  "AttachmentTag",
  "BackLink",
  "CloseControl",
  "ContentDialog",
  "SelectControl",
  "StatusHeading",
  "ConfirmationActions",
  "ProofRecord",
  "JobSummary",
  "Field",
  "EmptyState",
  "Loading",
  "LongTextDisclosure",
  "ProofLink",
  "InlineLink",
  "Feedback",
  "RecoveryPanel",
  "Card",
  "AppFrame",
  "ApplicationFrame",
  "Select",
]);
function unwrap(expression) {
  while (
    expression &&
    [
      "TSAsExpression",
      "TSSatisfiesExpression",
      "TSNonNullExpression",
      "ChainExpression",
    ].includes(expression.type)
  )
    expression = expression.expression;
  return expression;
}
export const ownershipRule = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      boundary: "{{reason}}",
      override:
        "{{name}} owns its internal styling. Edit its canonical owner or use a documented semantic variant.",
      duplicate:
        "Protected {{name}} markup must come from its canonical component.",
    },
  },
  create(context) {
    const previewRoute = (node) => {
      const value =
        node.type === "TemplateElement" ? node.value.raw : node.value;
      if (
        context.filename.replaceAll("\\", "/").includes("/design-system/") &&
        !context.filename.includes(".stories.") &&
        typeof value === "string" &&
        /(?:[?&](?:id=us(?:\d{3}--|$)|path=\/story\/)|^us\d{3}--)/.test(value)
      )
        context.report({
          node,
          messageId: "boundary",
          data: {
            reason:
              "Preview routes belong in features/shared/WorkbenchFrame; reusable UI takes navigation props.",
          },
        });
    };
    return {
      Literal: previewRoute,
      TemplateElement: previewRoute,
      JSXElement(node) {
        if (
          !context.filename.replaceAll("\\", "/").includes("/features/") ||
          node.openingElement.name.type !== "JSXIdentifier" ||
          node.openingElement.name.name !== "span"
        )
          return;
        const label = node.children
          .map((c) =>
            c.type === "JSXText"
              ? c.value
              : c.type === "JSXExpressionContainer" &&
                  c.expression.type === "Literal"
                ? c.expression.value
                : "",
          )
          .join("")
          .trim();
        if (
          [
            "Pending",
            "Accepted",
            "In Progress",
            "Completed",
            "Cancelled",
          ].includes(label) &&
          node.openingElement.attributes.some(
            (a) =>
              a.type === "JSXAttribute" &&
              ["style", "className"].includes(a.name.name),
          )
        )
          context.report({
            node,
            messageId: "duplicate",
            data: { name: "LifecycleBadge" },
          });
      },
      ImportDeclaration(node) {
        const source = String(node.source.value);
        const own = context.filename
          .replaceAll("\\", "/")
          .match(/\/features\/us(\d{3})\//)?.[1];
        const other = source.match(/(?:^|\/)us(\d{3})(?:\/|$)/)?.[1];
        if (own && other && own !== other)
          context.report({
            node,
            messageId: "override",
            data: { name: "Cross-feature private import" },
          });
      },
      JSXOpeningElement(node) {
        const name = node.name.type === "JSXIdentifier" ? node.name.name : null;
        for (const attr of node.attributes) {
          if (attr.type !== "JSXAttribute") continue;
          const style =
            attr.value?.type === "JSXExpressionContainer"
              ? unwrap(attr.value.expression)
              : null;
          if (
            attr.name.name === "style" &&
            attr.value?.type === "JSXExpressionContainer" &&
            style?.type === "ObjectExpression" &&
            !protectedNames.has(name) &&
            context.filename.replaceAll("\\", "/").includes("/features/")
          ) {
            for (const property of style.properties) {
              const propertyKey = unwrap(property.key);
              const key = propertyKey?.name ?? propertyKey?.value;
              if (
                typeof key === "string" &&
                (/^(color|background|backgroundColor|borderColor|boxShadow|fontFamily)$/.test(
                  key,
                ) ||
                  /^--(status|action|surface|text|link|feedback|warning|error|border|depth)/.test(
                    key,
                  ))
              )
                context.report({
                  node: property,
                  messageId: "override",
                  data: { name: "Semantic paint/inherited typography" },
                });
            }
          }
          if (
            name &&
            protectedNames.has(name) &&
            ["className", "style", "color", "fill", "borderColor"].includes(
              attr.name.name,
            )
          )
            context.report({
              node: attr,
              messageId: "override",
              data: { name },
            });
          const literal =
            attr.value?.type === "Literal"
              ? attr.value.value
              : attr.value?.type === "JSXExpressionContainer" &&
                  attr.value.expression?.type === "Literal"
                ? attr.value.expression.value
                : null;
          if (
            attr.name.name === "data-ui" &&
            protectedNames.has(literal) &&
            !context.filename.replaceAll("\\", "/").includes("/design-system/")
          )
            context.report({
              node: attr,
              messageId: "duplicate",
              data: { name: literal },
            });
        }
      },
    };
  },
};
