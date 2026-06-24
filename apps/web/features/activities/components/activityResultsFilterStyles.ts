export const activityResultsFilterBarHeightClass = "h-8";

export const activityResultsFilterInnerHeightClass = "h-7";

export const activityViewToggleBarHeightClass = "h-9";

export const activityViewToggleInnerHeightClass = "h-8";

export const activityResultsFilterShellClass =
  "inline-flex items-center rounded-full bg-white/86 p-0.5 shadow-sm ring-1 ring-[#ead7b8]";

export const activityResultsFilterLabelClass =
  "inline-flex items-center text-xs font-medium leading-none text-[#6f4d34]";

export const activityResultsFilterControlClass =
  "inline-flex items-center justify-center text-xs font-semibold leading-none text-[#6f4d34]";

export const activityResultsFilterChipClass =
  "rounded-full px-2.5 sm:px-3";

export const activityResultsFilterStandaloneControlClass = [
  activityResultsFilterShellClass,
  activityResultsFilterBarHeightClass,
  activityResultsFilterControlClass,
  "gap-1.5 px-2.5 sm:px-3",
].join(" ");

export const activityResultsFilterSelectClass = [
  "inline-flex items-center rounded-full bg-white/86 shadow-sm ring-1 ring-[#ead7b8]",
  activityResultsFilterBarHeightClass,
  activityResultsFilterControlClass,
  "box-border min-h-0 min-w-[5rem] max-w-[7.5rem] cursor-pointer appearance-none truncate py-0 pl-2.5 pr-7 sm:min-w-[6.5rem] sm:max-w-none sm:pl-3 sm:pr-8",
  "bg-[length:0.625rem] bg-[right_0.55rem_center] bg-no-repeat sm:bg-[length:0.75rem] sm:bg-[right_0.65rem_center]",
  "bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236f4d34%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')]",
].join(" ");
