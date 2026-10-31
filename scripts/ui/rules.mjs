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
]);
export const ownershipRule = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      override:
        "{{name}} owns its internal styling. Edit its canonical owner or use a documented semantic variant.",
      duplicate:
        "Protected {{name}} markup must come from its canonical component.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name.type === "JSXIdentifier" ? node.name.name : null;
        for (const attr of node.attributes) {
          if (attr.type !== "JSXAttribute") continue;
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
          if (
            attr.name.name === "data-ui" &&
            attr.value?.type === "Literal" &&
            protectedNames.has(attr.value.value) &&
            !context.filename.replaceAll("\\", "/").includes("/design-system/")
          )
            context.report({
              node: attr,
              messageId: "duplicate",
              data: { name: attr.value.value },
            });
        }
      },
    };
  },
};
