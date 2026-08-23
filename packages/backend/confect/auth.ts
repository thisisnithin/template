import { convexSiteUrl, readSync } from "./config";

export default {
  providers: [{ applicationID: "convex", domain: readSync(convexSiteUrl) }],
};
