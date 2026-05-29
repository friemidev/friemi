import { activityCategories, type ActivityCategory } from "@chill-club/shared";

export const activityFilterTypes = ["LOCAL", "TRIP"] as const;
export const activitySortOptions = ["recommended", "soonest", "latest"] as const;
export const activityTimeStates = ["ONGOING", "UPCOMING", "ENDED"] as const;

export type ActivityFilterType = (typeof activityFilterTypes)[number];
export type ActivitySortOption = (typeof activitySortOptions)[number];
export type ActivityTimeState = (typeof activityTimeStates)[number];

export type ActivityFilters = {
  category?: ActivityCategory;
  city?: string;
  keyword?: string;
  page: number;
  sort: ActivitySortOption;
  timeState?: ActivityTimeState;
  type?: ActivityFilterType;
};

export type ActivityFilterSearchParams = Record<
  string,
  string | string[] | undefined
>;

const activityFilterQueryKeys = [
  "q",
  "category",
  "city",
  "type",
  "time",
  "sort",
  "page",
];

type ActivityFilterRawValues = {
  category?: unknown;
  city?: unknown;
  keyword?: unknown;
  page?: unknown;
  sort?: unknown;
  timeState?: unknown;
  type?: unknown;
};

export const activityCategoryOptions = (
  Object.keys(activityCategories) as ActivityCategory[]
).sort((left, right) => {
  if (left === "OTHER") {
    return 1;
  }

  if (right === "OTHER") {
    return -1;
  }

  return 0;
});

function getSingleParam(searchParams: ActivityFilterSearchParams, key: string) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function getActivityFilterRawQueryString(
  searchParams: ActivityFilterSearchParams,
) {
  const query = new URLSearchParams();

  for (const key of activityFilterQueryKeys) {
    const value = searchParams[key];

    if (typeof value === "string") {
      query.set(key, value);
    }
  }

  return query.toString();
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function normalizeTextParam(value: string | undefined, maxLength: number) {
  const normalizedValue = value?.trim().replace(/\s+/g, " ");

  return normalizedValue ? normalizedValue.slice(0, maxLength) : undefined;
}

function isActivityCategory(value: string): value is ActivityCategory {
  return value in activityCategories;
}

function isActivityFilterType(value: string): value is ActivityFilterType {
  return activityFilterTypes.some((type) => type === value);
}

function isActivitySortOption(value: string): value is ActivitySortOption {
  return activitySortOptions.some((sort) => sort === value);
}

function isActivityTimeState(value: string): value is ActivityTimeState {
  return activityTimeStates.some((timeState) => timeState === value);
}

function normalizePageParam(value: string | undefined) {
  const page = Number(value);

  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return Math.min(page, 100);
}

export function hasActiveActivityFilters(filters: {
  category?: unknown;
  city?: unknown;
  keyword?: unknown;
  timeState?: unknown;
  type?: unknown;
}) {
  return Boolean(
    filters.keyword ||
      filters.category ||
      filters.city ||
      filters.type ||
      filters.timeState,
  );
}

export function getDefaultActivitySort(filters: {
  category?: unknown;
  city?: unknown;
  keyword?: unknown;
  timeState?: unknown;
  type?: unknown;
}): ActivitySortOption {
  return hasActiveActivityFilters(filters) ? "soonest" : "recommended";
}

export function normalizeActivityFilters(
  searchParams: ActivityFilterSearchParams = {},
): ActivityFilters {
  return normalizeActivityFilterValues({
    category: getSingleParam(searchParams, "category"),
    city: getSingleParam(searchParams, "city"),
    keyword: getSingleParam(searchParams, "q"),
    page: getSingleParam(searchParams, "page"),
    sort: getSingleParam(searchParams, "sort"),
    timeState: getSingleParam(searchParams, "time"),
    type: getSingleParam(searchParams, "type"),
  });
}

export function normalizeActivityFilterValues(
  values: ActivityFilterRawValues,
): ActivityFilters {
  const category = getStringValue(values.category);
  const city = normalizeTextParam(getStringValue(values.city), 60);
  const keyword = normalizeTextParam(getStringValue(values.keyword), 80);
  const page = getStringValue(values.page);
  const type = getStringValue(values.type);
  const timeState = getStringValue(values.timeState);
  const sort = getStringValue(values.sort);
  const filters = {
    category: category && isActivityCategory(category) ? category : undefined,
    city,
    keyword,
    timeState:
      timeState && isActivityTimeState(timeState) ? timeState : undefined,
    type: type && isActivityFilterType(type) ? type : undefined,
  };

  return {
    ...filters,
    page: normalizePageParam(page),
    sort:
      sort && isActivitySortOption(sort)
        ? sort
        : getDefaultActivitySort(filters),
  };
}

export function normalizeActivityFilterFormData(
  formData: FormData,
): ActivityFilters {
  return normalizeActivityFilterValues({
    category: formData.get("category"),
    city: formData.get("city"),
    keyword: formData.get("q"),
    page: formData.get("page"),
    sort: formData.get("sort"),
    timeState: formData.get("time"),
    type: formData.get("type"),
  });
}

export function getActivityFilterQueryString(filters: ActivityFilters) {
  const query = new URLSearchParams();

  if (filters.keyword) query.set("q", filters.keyword);
  if (filters.category) query.set("category", filters.category);
  if (filters.city) query.set("city", filters.city);
  if (filters.type) query.set("type", filters.type);
  if (filters.timeState) query.set("time", filters.timeState);
  if (filters.sort !== getDefaultActivitySort(filters)) {
    query.set("sort", filters.sort);
  }
  if (filters.page > 1) query.set("page", String(filters.page));

  return query.toString();
}

export function getActivityFilterHref(
  baseHref: string,
  filters: ActivityFilters,
) {
  const queryString = getActivityFilterQueryString(filters);

  return queryString ? `${baseHref}?${queryString}` : baseHref;
}

export function isCanonicalActivityFilterSearchParams(
  searchParams: ActivityFilterSearchParams = {},
) {
  const keys = Object.keys(searchParams);
  const hasUnknownKey = keys.some(
    (key) => !activityFilterQueryKeys.includes(key),
  );
  const hasRepeatedValue = keys.some((key) => Array.isArray(searchParams[key]));

  if (hasUnknownKey || hasRepeatedValue) {
    return false;
  }

  return (
    getActivityFilterRawQueryString(searchParams) ===
    getActivityFilterQueryString(normalizeActivityFilters(searchParams))
  );
}
