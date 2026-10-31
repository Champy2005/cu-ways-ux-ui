import { setProjectAnnotations } from "@storybook/react-vite";
import * as preview from "./preview";
import * as a11y from "@storybook/addon-a11y/preview";
setProjectAnnotations([a11y, preview]);
