export function getViewerBookingCopy(locale: string) {
  if (locale === "fr") {
    return {
      title: "Mes réservations boutique",
      back: "Retour à mon profil",
      upcoming: "À venir",
      history: "Historique",
      empty: "Vous n'avez pas encore de réservation boutique.",
      browse: "Explorer les sorties",
      confirmed: "Inscription confirmée",
      datePassed: "Date passée",
      published: "Sortie créée",
      signupCancelled: "Inscription annulée",
      bookingCancelled: "Clôturée",
      viewBooking: "Voir la réservation",
      viewActivity: "Voir la sortie",
    };
  }
  if (locale === "en") {
    return {
      title: "My store bookings",
      back: "Back to my profile",
      upcoming: "Upcoming",
      history: "History",
      empty: "You have no store bookings yet.",
      browse: "Explore activities",
      confirmed: "Signup confirmed",
      datePassed: "Date passed",
      published: "Meetup created",
      signupCancelled: "Signup cancelled",
      bookingCancelled: "Closed",
      viewBooking: "View booking",
      viewActivity: "View meetup",
    };
  }
  return {
    title: "我的店铺预约",
    back: "返回我的主页",
    upcoming: "待举行",
    history: "历史记录",
    empty: "你还没有报名店铺预约。",
    browse: "浏览活动",
    confirmed: "已报名，待公布安排",
    datePassed: "预约日期已过",
    published: "聚吧已生成",
    signupCancelled: "已取消报名",
    bookingCancelled: "已关闭",
    viewBooking: "查看预约",
    viewActivity: "进入聚吧",
  };
}
