import type { LucideIcon } from "lucide-react";
import {
    METRIC,
    METRIC_ICON,
    METRIC_ICON_TONE,
    METRIC_LABEL,
    METRIC_TOTAL,
    METRIC_VALUE,
    type MetricTone
} from "#src/mission-overview/research-metric.const";

interface ResearchMetricProps {
    icon: LucideIcon;
    label: string;
    value: number;
    total: number;
    tone: MetricTone;
}

export function ResearchMetric({ icon: Icon, label, value, total, tone }: ResearchMetricProps) {
    return (
        <li className={METRIC}>
            <span className={`${METRIC_ICON} ${METRIC_ICON_TONE[tone]}`} aria-hidden="true">
                <Icon size={18} strokeWidth={1.8} />
            </span>
            <div>
                <span className={METRIC_LABEL}>{label}</span>
                <p className={METRIC_VALUE}>
                    {value}
                    <span className={METRIC_TOTAL}> / {total}</span>
                </p>
            </div>
        </li>
    );
}
