import { activityCategories, type ActivityCategory } from "@chill-club/shared";

export const activityFilterTypes = ["LOCAL", "TRIP"] as const;
export const activitySortOptions = ["soonest", "latest"] as const;

export type ActivityFilterType = (typeof activityFilterTypes)[number];
export type ActivitySortOption = (typeof activitySortOptions)[number];

export type ActivityFilters = {
  category?: ActivityCategory;
  city?: string;
  keyword?: string;
  sort: ActivitySortOption;
  type?: ActivityFilterType;
};

export type ActivityFilterSearchParams = Record<
  string,
  string | string[] | undefined
>;

const activityFilterQueryKeys = ["q", "category", "city", "type", "sort"];

type ActivityFilterRawValues = {
  category?: unknown;
  city?: unknown;
  keyword?: unknown;
  sort?: unknown;
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

export function normalizeActivityFilters(
  searchParams: ActivityFilterSearchParams = {},
): ActivityFilters {
  return normalizeActivityFilterValues({
    category: getSingleParam(searchParams, "category"),
    city: getSingleParam(searchParams, "city"),
    keyword: getSingleParam(searchParams, "q"),
    sort: getSingleParam(searchParams, "sort"),
    type: getSingleParam(searchParams, "type"),
  });
}

export function normalizeActivityFilterValues(
  values: ActivityFilterRawValues,
): ActivityFilters {
  const category = getStringValue(values.category);
  const type = getStringValue(values.type);
  const sort = getStringValue(values.sort);

  return {
    category: category && isActivityCategory(category) ? category : undefined,
    city: normalizeTextParam(getStringValue(values.city), 60),
    keyword: normalizeTextParam(getStringValue(values.keyword), 80),
    sort: sort && isActivitySortOption(sort) ? sort : "soonest",
    type: type && isActivityFilterType(type) ? type : undefined,
  };
}

export function normalizeActivityFilterFormData(
  formData: FormData,
): ActivityFilters {
  return normalizeActivityFilterValues({
    category: formData.get("category"),
    city: formData.get("city"),
    keyword: formData.get("q"),
    sort: formData.get("sort"),
    type: formData.get("type"),
  });
}

export function getActivityFilterQueryString(filters: ActivityFilters) {
  const query = new URLSearchParams();

  if (filters.keyword) query.set("q", filters.keyword);
  if (filters.category) query.set("category", filters.category);
  if (filters.city) query.set("city", filters.city);
  if (filters.type) query.set("type", filters.type);
  if (filters.sort === "latest") query.set("sort", filters.sort);

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

export function hasActiveActivityFilters(filters: ActivityFilters) {
  return Boolean(
    filters.keyword || filters.category || filters.city || filters.type,
  );
}
