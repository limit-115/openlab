import { CLAIM_FILTERS, type ClaimFilter } from "#src/claims/claim-filter.const";
import { ToggleGroup, ToggleGroupItem } from "#src/design-system/toggle-group";

interface ClaimFilterGroupProps {
    filter: ClaimFilter;
    onSelect: (filter: ClaimFilter) => void;
}

export function ClaimFilterGroup({ filter, onSelect }: ClaimFilterGroupProps) {
    return (
        <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            spacing={0}
            value={filter}
            aria-label="Filter claims"
            onValueChange={(value) => {
                if (value) {
                    onSelect(value as ClaimFilter);
                }
            }}
        >
            {CLAIM_FILTERS.map((item) => (
                <ToggleGroupItem key={item.value} value={item.value}>
                    {item.label}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}
