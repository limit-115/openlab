import { startDaemon } from "#src/daemon-runtime/daemon-startup";

const daemon = await startDaemon();
daemon.app.log.info(
    { url: daemon.url, investigations: daemon.registry.list().length },
    "nightlab daemon ready"
);
