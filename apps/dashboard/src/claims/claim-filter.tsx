import {
    CLAIM_FILTERS,
    type ClaimFilter,
    FILTER_BUTTON,
    FILTER_BUTTON_ACTIVE,
    FILTER_BUTTON_IDLE,
    FILTER_GROUP
} from "#src/claims/claim-filter.const";

interface ClaimFilterGroupProps {
    filter: ClaimFilter;
    onSelect: (filter: ClaimFilter) => void;
}

export function ClaimFilterGroup({ filter, onSelect }: ClaimFilterGroupProps) {
    return (
        <fieldset className={FILTER_GROUP}>
            <legend className="sr-only">Filter claims</legend>
            {CLAIM_FILTERS.map((item) => {
                const active = filter === item.value;

                return (
                    <button
                        key={item.value}
                        type="button"
                        className={`${FILTER_BUTTON} ${active ? FILTER_BUTTON_ACTIVE : FILTER_BUTTON_IDLE}`}
                        aria-pressed={active}
                        onClick={() => onSelect(item.value)}
                    >
                        {item.label}
                    </button>
                );
            })}
        </fieldset>
    );
}
