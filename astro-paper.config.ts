import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://site-eight-delta-28.vercel.app", // TODO: swap for custom domain once purchased
    title: "Kriti Dutta",
    description:
      "Engineer at BlackRock building open infrastructure for financial AI.",
    author: "Kriti Dutta",
    profile: "https://kritidutta.dev/about",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "America/New_York",
    dir: "ltr",
  },
  posts: {
    perPage: 5,
    perIndex: 5,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: false,                       // enable once GitHub repo is live
    },
    search: "pagefind",
  },
  socials: [
    { name: "github",   url: "https://github.com/kritidutta01" },
    { name: "linkedin", url: "https://www.linkedin.com/in/kriti-dutta-94b661107/" },
    { name: "mail",     url: "mailto:data.kriti.dutta@gmail.com" },
  ],
  shareLinks: [
    { name: "linkedin", url: "https://www.linkedin.com/sharing/share-offsite/?url=" },
    { name: "mail",     url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
