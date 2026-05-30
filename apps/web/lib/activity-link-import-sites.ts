export type ActivityLinkImportSite = {
  exampleUrl: string;
  host: string;
  name: string;
};

export const activityLinkImportSites: ActivityLinkImportSite[] = [
  {
    host: "quefaire.paris.fr",
    name: "Que Faire a Paris",
    exampleUrl: "https://quefaire.paris.fr/...",
  },
  {
    host: "paris.fr",
    name: "Paris.fr",
    exampleUrl: "https://www.paris.fr/...",
  },
  {
    host: "opendata.paris.fr",
    name: "Paris OpenData",
    exampleUrl: "https://opendata.paris.fr/...",
  },
  {
    host: "sortiraparis.com",
    name: "Sortir a Paris",
    exampleUrl:
      "https://www.sortiraparis.com/zh/.../articles/346020-...",
  },
  {
    host: "playinparis.com",
    name: "Play in Paris",
    exampleUrl: "https://playinparis.com/event/...",
  },
  {
    host: "meetup.com",
    name: "Meetup",
    exampleUrl: "https://www.meetup.com/.../events/...",
  },
  {
    host: "eventbrite.fr",
    name: "Eventbrite",
    exampleUrl: "https://www.eventbrite.fr/e/...",
  },
  {
    host: "billetweb.fr",
    name: "Billetweb",
    exampleUrl: "https://www.billetweb.fr/...",
  },
];
