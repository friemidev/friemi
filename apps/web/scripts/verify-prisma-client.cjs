const { Prisma } = require("@prisma/client");

const models = Prisma.dmmf.datamodel.models;

function getModel(name) {
  return models.find((model) => model.name === name);
}

function hasField(modelName, fieldName) {
  const model = getModel(modelName);
  return Boolean(model?.fields.some((field) => field.name === fieldName));
}

const requiredModels = [
  "ActivityCoManager",
  "ActivityManagementLog",
  "Moment",
  "MomentImage",
  "MomentLike",
  "MomentComment",
  "Planet",
  "PlanetMember",
  "PlanetMessage",
  "PlanetMoment",
  "PlanetMomentComment",
  "PlanetMomentLike",
  "PlanetMomentCommentLike",
];
const requiredFields = [
  ["Activity", "coManagers"],
  ["Activity", "managementLogs"],
  ["UserProfile", "managedActivities"],
  ["UserProfile", "addedCoManagers"],
  ["UserProfile", "activityManagementLogs"],
  ["UserProfile", "moments"],
  ["Moment", "resharedMomentId"],
  ["Moment", "repostCount"],
  ["Notification", "momentId"],
  ["Notification", "momentCommentId"],
  ["Planet", "inviteCode"],
  ["Planet", "nameTranslations"],
  ["PlanetMoment", "likes"],
  ["PlanetMomentComment", "likes"],
];

const missingModels = requiredModels.filter(
  (modelName) => !getModel(modelName),
);
const missingFields = requiredFields.filter(
  ([modelName, fieldName]) => !hasField(modelName, fieldName),
);

if (missingModels.length > 0 || missingFields.length > 0) {
  const lines = [
    "Generated Prisma Client is out of sync with prisma/schema.prisma.",
  ];

  if (missingModels.length > 0) {
    lines.push(`Missing models: ${missingModels.join(", ")}`);
  }

  if (missingFields.length > 0) {
    lines.push(
      `Missing fields: ${missingFields
        .map(([modelName, fieldName]) => `${modelName}.${fieldName}`)
        .join(", ")}`,
    );
  }

  lines.push(
    "Run `npm run db:generate --workspace=apps/web` and redeploy from the commit that contains the matching Prisma migration.",
  );

  console.error(lines.join("\n"));
  process.exit(1);
}

console.log("Prisma Client verified against required application schema.");
