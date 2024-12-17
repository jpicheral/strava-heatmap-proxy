#!/usr/bin/env -S deno run --allow-net --allow-env --unstable

import { chromium } from "https://deno.land/x/playwright/mod.ts";

const STRAVA_EMAIL = Deno.env.get("STRAVA_EMAIL")!;
const STRAVA_PASSWORD = Deno.env.get("STRAVA_PASSWORD")!;

function getCookies(cookies: Array<{ name: string; value: string }>) {
  return cookies.map(cookie => `${cookie.name}=${cookie.value}`).join(";");
}

const browser = await chromium.launch();
const page = await browser.newPage();

// Ouvrir la page de login
await page.goto("https://www.strava.com/login");

// Remplir le formulaire de login
await page.fill('input[name="email"]', STRAVA_EMAIL);
await page.fill('input[name="password"]', STRAVA_PASSWORD);
await page.click('button[type="submit"]');

// Attendre la redirection ou l'authentification
await page.waitForNavigation({ url: "https://www.strava.com/dashboard" });

// Extraire les cookies de la session
const cookies = await page.context().cookies();
const cookiesString = getCookies(cookies);

// Accéder aux cookies nécessaires pour les heatmaps
const authResp = await page.goto("https://heatmap-external-a.strava.com/auth");

// Extraire les cookies spécifiques
const authCookies = await page.context().cookies();
const authCookiesString = getCookies(authCookies);

// Identifiant utilisateur (strava_remember_id)
const stravaId = cookies.find((cookie) =>
  cookie.name === "strava_remember_id"
)?.value;

if (!stravaId) {
  throw new Error("Could not find strava_remember_id.");
}

// Filtrer les cookies nécessaires
const requiredCookieNames = new Set([
  "CloudFront-Policy",
  "CloudFront-Key-Pair-Id",
  "CloudFront-Signature",
  "_strava4_session",
]);

const requiredCookies = cookies.concat(authCookies).filter(cookie =>
  requiredCookieNames.has(cookie.name)
);
const stravaCookies = getCookies(requiredCookies);

console.log(`STRAVA_ID='${stravaId}'`);
console.log(`STRAVA_COOKIES='${stravaCookies}'`);

await browser.close();
