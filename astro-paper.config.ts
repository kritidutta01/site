import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://kritidutta.dev",          // TODO: update to your actual domain
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
    { name: "github",   url: "https://github.com/kritidutta" },  // TODO: confirm handle
    { name: "x",        url: "https://x.com/kritidutta" },        // TODO: confirm handle
    { name: "linkedin", url: "https://www.linkedin.com/in/kritidutta/" }, // TODO: confirm
    { name: "mail",     url: "mailto:data.kriti.dutta@gmail.com" },
  ],
  shareLinks: [
    { name: "x",        url: "https://x.com/intent/post?url=" },
    { name: "linkedin", url: "https://www.linkedin.com/sharing/share-offsite/?url=" },
    { name: "mail",     url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
