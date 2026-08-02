import { startDaemon } from "#src/daemon-runtime/daemon-startup";

const taskPath = process.argv[2];
if (taskPath === undefined) {
    throw new Error("Usage: node src/main.ts <task.json>");
}

const daemon = await startDaemon({ taskPath });
daemon.app.log.info({ url: daemon.url, lab_id: daemon.workspace.labId }, "lab daemon ready");
