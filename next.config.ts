import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite abrir la app en modo desarrollo desde el celular (misma red WiFi).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  poweredByHeader: false,
};

export default nextConfig;
