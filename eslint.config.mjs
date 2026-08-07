import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: currentDirectory });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "next-env.d.ts"],
  },
  {
    files: ["src/lib/themeparks.ts", "src/app/explore/page.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
