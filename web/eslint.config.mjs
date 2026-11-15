import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  { ignores: ["src/types/api.generated.d.ts"] },
  ...nextVitals,
  ...nextTs,
];

export default eslintConfig;
