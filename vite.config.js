import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "assets", // a pasta que você quer copiar
          dest: "", // destino dentro de dist ("" = raiz de dist)
        },
      ],
    }),
  ],
});
