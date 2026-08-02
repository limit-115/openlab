import type { CapabilityRequest } from "@lab/protocol/schemas";
import { KeyRound, LockKeyhole, Wrench } from "lucide-react";
import { EmptyState } from "#src/components/empty-state";
import { Panel } from "#src/components/panel";
import { formatDate, formatIdentifier } from "#src/lib/format";

interface CapabilitiesPanelProps {
    requests: CapabilityRequest[];
}

export function CapabilitiesPanel({ requests }: CapabilitiesPanelProps) {
    const openCount = requests.filter((request) => request.status === "open").length;

    return (
        <Panel
            title="Capabilities"
            eyebrow="External blockers"
            icon={KeyRound}
            action={
                openCount > 0 ? (
                    <span className="count-badge count-badge--alert">{openCount} needed</span>
                ) : null
            }
        >
            {requests.length > 0 ? (
                <div className="capability-list">
                    {requests.map((request) => (
                        <article
                            className={`capability capability--${request.status}`}
                            key={request.id}
                        >
                            <span className="capability__icon" aria-hidden="true">
                                {request.status === "open" ? (
                                    <LockKeyhole size={17} />
                                ) : (
                                    <Wrench size={17} />
                                )}
                            </span>
                            <div>
                                <header>
                                    <strong>{request.need}</strong>
                                    <span className={`tag tag--${request.status}`}>
                                        {request.status}
                                    </span>
                                </header>
                                <p>{request.reason}</p>
                                <div className="provisioning-hint">
                                    <span>Provision via CLI</span>
                                    <code>
                                        lab provide {formatIdentifier(request.id)}{" "}
                                        &lt;resource-reference&gt;
                                    </code>
                                    <small>{request.provisioning_hint}</small>
                                </div>
                                <footer>Requested {formatDate(request.created_at)}</footer>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <EmptyState
                    compact
                    title="All capabilities available"
                    description="There are no access, tool or infrastructure requests."
                />
            )}
        </Panel>
    );
}
