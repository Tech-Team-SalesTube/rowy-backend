import { db } from "../firebaseConfig";
import { logo } from "../asciiLogo";
import { getGCPEmail, getProjectId } from "./utils";
import { getRowyApp, registerRowyApp } from "./createRowyApp";
import { logError } from "./createRowyApp";
import { execute } from "../terminalUtils";

const applyServiceAccount = async () => {
  execute("terraform -chdir=terraform output -json", (stdout) => {
    const output = JSON.parse(stdout);
    const serviceAccount = output.service_account_email.value;
    console.log({ serviceAccount });
    const command = `gcloud run services update rowy-run --service-account ${serviceAccount} --platform managed`;
    console.log(command);
    execute(command, (stdout) => {});
  });
};
async function start() {
  try {
    applyServiceAccount();
    const projectId = getProjectId();
    const rowyRunUrl = process.env.SERVICE_URL;
    const rowyAppURL = `https://${process.env.GOOGLE_CLOUD_PROJECT}.rowy.app/setup?rowyRunUrl=${process.env.SERVICE_URL}`;
    const update = {
      rowyRunBuildStatus: "COMPLETE",
      rowyRunUrl,
    };
    await db.doc("/_rowy_/settings").update(update);

    const gcpEmail = await getGCPEmail();
    if (typeof gcpEmail !== "string") {
      throw new Error("cloud shell ");
    }
    const userManagement = {
      owner: {
        email: gcpEmail,
      },
    };

    await db.doc("_rowy_/userManagement").set(userManagement, { merge: true });

    const firebaseConfig = await getRowyApp(projectId);
    const { success, message }: any = await registerRowyApp({
      ownerEmail: gcpEmail,
      firebaseConfig,
      secret: process.env.ROWY_SECRET,
      rowyRunUrl: process.env.SERVICE_URL,
    });
    if (!success && message !== "project already exists")
      throw new Error(message);
    console.log(logo);
    console.log(
      `
  🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
  🟩  🎊  Successfully deployed Rowy Run 🎊                                                  🟩
  🟩                                                                                       🟩
  🟩  Continue the setup process by going to the link below:                               🟩
  🟩  👉 ${rowyAppURL}  🟩
  🟩                                                                                       🟩
  🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩`
    );
  } catch (error: any) {
    console.log(error);
    await logError({
      event: "post-create",
      error: error.message,
    });
    throw new Error(error.message);
  }
}

start();
