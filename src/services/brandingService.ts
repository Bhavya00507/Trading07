export interface BrandingConfig {
  appName: string;
  companyName: string;
  tagline: string;
  logoUrl: string;
  accentColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardBgColor: string;
  supportEmail: string;
  websiteUrl: string;
  copyright: string;
  themeMode: string;
}

const defaultBranding: BrandingConfig = {
  appName: "Quantum Terminal",
  companyName: "Quantum Capital Technologies",
  tagline: "Institutional Multi-Asset Trading Terminal",
  logoUrl: "/logo.svg",
  accentColor: "#00f0ff",
  secondaryColor: "#7000ff",
  backgroundColor: "#090d16",
  cardBgColor: "#121824",
  supportEmail: "support@quantumterminal.io",
  websiteUrl: "https://quantumterminal.io",
  copyright: "© 2026 Quantum Capital Technologies Inc. All Rights Reserved.",
  themeMode: "dark"
};

let currentBranding: BrandingConfig = { ...defaultBranding };

export async function loadBranding(): Promise<BrandingConfig> {
  try {
    const res = await fetch('./branding.json');
    if (res.ok) {
      const data = await res.json();
      currentBranding = { ...defaultBranding, ...data };
      applyBrandingStyles(currentBranding);
    }
  } catch (e) {
    console.warn('[Branding] Failed to load custom branding.json, using default institutional theme.');
    applyBrandingStyles(defaultBranding);
  }
  return currentBranding;
}

export function getBranding(): BrandingConfig {
  return currentBranding;
}

function applyBrandingStyles(config: BrandingConfig) {
  const root = document.documentElement;
  root.style.setProperty('--brand-accent', config.accentColor);
  root.style.setProperty('--brand-secondary', config.secondaryColor);
  root.style.setProperty('--brand-bg', config.backgroundColor);
  root.style.setProperty('--brand-card-bg', config.cardBgColor);
  document.title = config.appName;
}
