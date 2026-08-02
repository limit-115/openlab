import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "#src/design-system/card";
import {
    METRIC_CARD,
    METRIC_ICON,
    METRIC_LABEL,
    METRIC_ROW,
    METRIC_TOTAL,
    METRIC_VALUE
} from "#src/mission-overview/research-metric.const";

interface ResearchMetricProps {
    icon: LucideIcon;
    label: string;
    value: number;
    total: number;
}

export function ResearchMetric({ icon: Icon, label, value, total }: ResearchMetricProps) {
    return (
        <li>
            <Card size="sm" className={METRIC_CARD}>
                <CardContent className={METRIC_ROW}>
                    <span className={METRIC_ICON} aria-hidden="true">
                        <Icon className="size-5" />
                    </span>
                    <div className="flex flex-col gap-1.5">
                        <span className={METRIC_LABEL}>{label}</span>
                        <p className={METRIC_VALUE}>
                            {value}
                            <span className={METRIC_TOTAL}> / {total}</span>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </li>
    );
}
