import { updateConfig, getProjectId } from "./utils";
import { db } from "../firebaseConfig";
import { logError } from "./createRowyApp";
async function start() {
  const projectId = getProjectId();
  if (!projectId) {
    throw new Error("GOOGLE_CLOUD_PROJECT env variable is not set");
  }
  try {
    updateConfig("projectId", projectId);
    const settings = {
      rowyRunBuildStatus: "BUILDING",
      rowyRunRegion: process.env.GOOGLE_CLOUD_REGION,
    };
    await db.doc("_rowy_/settings").set(settings, { merge: true });
    const publicSettings = {
      signInOptions: ["google"],
    };
    await db.doc("_rowy_/publicSettings").set(publicSettings, { merge: true });
  } catch (error) {
    console.log(error);
    logError({
      event: "pre-build",
      error,
    });
    throw new Error(`Rowy deployment failed: ${JSON.stringify(error)}`);
  }
}

start();
