type AdminItemCopy = {
  merchant: {
    itemsLabel: string;
  };
  list: {
    title: string;
    countLabel: (count: number) => string;
    intro: string;
    new: string;
    searchPlaceholder: string;
    searchAria: string;
    searchButton: string;
    clear: string;
    resultRange: (
      query: string,
      start: number,
      end: number,
      total: number,
    ) => string;
    ticketType: string;
    independent: string;
    giftable: string;
    paused: string;
    remaining: (remaining: number, total: number) => string;
    emptyTitle: string;
    emptyHint: string;
    noResultsTitle: string;
    noResultsHint: string;
    viewAll: string;
    createFirst: string;
    paginationAria: string;
    previous: string;
    next: string;
    pageNumber: (current: number, total: number) => string;
  };
  frame: {
    ticketType: string;
    imageAlt: (title: string) => string;
    remaining: string;
    allocatedTotal: string;
    giftingAllowed: string;
    giftingPaused: string;
    backToList: string;
    backToDetail: string;
  };
  detail: {
    pageTitle: string;
    actionsAria: string;
    issueLabel: string;
    issueHint: string;
    issueEmptyHint: string;
    settingsLabel: string;
    settingsHint: string;
    historyLabel: string;
    historyHint: string;
    accessLabel: string;
    accessHint: string;
    redeemLabel: string;
    redeemHint: string;
  };
  settings: {
    pageTitle: string;
    imageTitle: string;
    imageHint: string;
    giftingTitle: string;
    currentAllowed: string;
    currentPaused: string;
  };
  issue: {
    pageTitle: string;
    formTitle: string;
    formHint: string;
    soldOutHint: string;
  };
  newItem: {
    pageTitle: string;
  };
  access: {
    pageTitle: string;
    merchantTitle: string;
    merchantHint: string;
    changeWarning: string;
    saveMerchant: string;
    merchantSaved: string;
    merchantFailed: string;
    managersLabel: string;
    managersHint: string;
    staffLabel: string;
    staffHint: string;
    redemptionsLabel: string;
    redemptionsHint: string;
  };
  image: {
    tooLarge: string;
    unsupportedType: string;
    storageUnavailable: string;
    uploadFailed: string;
    networkError: string;
    previewAlt: string;
    previewFailed: string;
    brokenPreview: string;
    noImage: string;
    uploading: string;
    replace: string;
    upload: string;
    remove: string;
    hint: string;
  };
  form: {
    merchantLabel: string;
    merchantNone: string;
    merchantHint: string;
    optionalImage: string;
    saveImage: string;
    imageUpdated: string;
    invalidImage: string;
    forbidden: string;
    saveFailed: string;
  };
};

const copies: Record<"zh-CN" | "en" | "fr", AdminItemCopy> = {
  "zh-CN": {
    merchant: { itemsLabel: "物品管理" },
    list: {
      title: "物品管理",
      countLabel: (count) => `票券 ${count}`,
      intro: "目前支持票券物品。选择票券后管理图片、分配数量与查看记录。",
      new: "新建票券",
      searchPlaceholder: "搜索票券名称",
      searchAria: "按名称搜索票券",
      searchButton: "搜索",
      clear: "清除",
      resultRange: (query, start, end, total) =>
        `${query ? `“${query}”的搜索结果：` : ""}第 ${start}–${end} 件，共 ${total} 件票券`,
      ticketType: "票券物品",
      independent: "独立票券",
      giftable: "允许赠送",
      paused: "暂停赠送",
      remaining: (remaining, total) => `待分配 ${remaining} / 总量 ${total}`,
      emptyTitle: "还没有票券物品",
      emptyHint: "先新建票券并设置数量，再从物品详情分配给指定账户。",
      noResultsTitle: "没有找到匹配的票券",
      noResultsHint: "换一个名称搜索，或清除搜索查看所有票券。",
      viewAll: "查看所有票券",
      createFirst: "新建第一件票券物品",
      paginationAria: "物品列表分页",
      previous: "上一页",
      next: "下一页",
      pageNumber: (current, total) => `第 ${current} / ${total} 页`,
    },
    frame: {
      ticketType: "票券物品",
      imageAlt: (title) => `${title}物品图片`,
      remaining: "待分配",
      allocatedTotal: "已分配 / 总量",
      giftingAllowed: "允许",
      giftingPaused: "暂停",
      backToList: "返回物品列表",
      backToDetail: "返回物品详情",
    },
    detail: {
      pageTitle: "物品详情",
      actionsAria: "物品管理操作",
      issueLabel: "分配给账户",
      issueHint: "按 Friemi 码或二维码确认账户，选择数量后放入背包。",
      issueEmptyHint: "这一批已全部分配，可查看记录。",
      settingsLabel: "图片与赠送设置",
      settingsHint: "上传背包展示图，管理是否允许持有人赠送。",
      historyLabel: "分配与赠送记录",
      historyHint: "分别查看管理员分配和账户间赠送的历史。",
      accessLabel: "门店与核销权限",
      accessHint: "关联门店，指定票券负责人并管理核销权限。",
      redeemLabel: "入场核销",
      redeemHint: "扫描持票人的二维码，确认后核销单张票券。",
    },
    settings: {
      pageTitle: "物品设置",
      imageTitle: "背包展示图片",
      imageHint: "这张图片会显示在物品列表和用户背包中。",
      giftingTitle: "账户间赠送",
      currentAllowed: "当前：允许赠送",
      currentPaused: "当前：暂停赠送",
    },
    issue: {
      pageTitle: "分配物品",
      formTitle: "分配给指定账户",
      formHint: "确认接收账户，再填写这次放入背包的数量。",
      soldOutHint: "这一批物品已全部分配。",
    },
    newItem: { pageTitle: "新建票券物品" },
    access: {
      pageTitle: "门店与核销权限",
      merchantTitle: "票券归属",
      merchantHint: "只可关联一个门店。未关联门店的票券由指定负责人管理。",
      changeWarning: "更换或移除门店会撤销现有核销授权，历史记录仍会保留。",
      saveMerchant: "保存门店归属",
      merchantSaved: "门店归属已更新。",
      merchantFailed: "无法更新，请核对门店后重试。",
      managersLabel: "票券负责人",
      managersHint: "指定可管理这类票券核销人员的账号。",
      staffLabel: "核销人员",
      staffHint: "查看邀请状态与核销权限。",
      redemptionsLabel: "核销记录",
      redemptionsHint: "按时间查看每一张已核销的票。",
    },
    image: {
      tooLarge: "图片不能超过 10 MB，请选择更小的文件。",
      unsupportedType: "不支持这种图片格式，请换一张 JPG、PNG 或 WebP 图片。",
      storageUnavailable: "图片存储暂时不可用，请稍后再试。",
      uploadFailed: "图片上传失败，请重新选择图片。",
      networkError: "图片上传失败，请检查网络后重试。",
      previewAlt: "物品图片预览",
      previewFailed: "这张图片无法显示，请重新上传后再保存。",
      brokenPreview: "图片无法预览，请重新上传",
      noImage: "尚未上传图片",
      uploading: "上传中…",
      replace: "更换图片",
      upload: "上传图片",
      remove: "移除图片",
      hint: "建议使用 JPG、PNG 或 WebP，文件不超过 10 MB。保存后将在背包中展示。",
    },
    form: {
      merchantLabel: "关联门店（可选）",
      merchantNone: "独立票券，不关联门店",
      merchantHint: "关联后，门店负责人可管理这类票的核销人员与记录。",
      optionalImage: "物品图片（可选）",
      saveImage: "保存图片",
      imageUpdated: "物品图片已更新。",
      invalidImage: "图片地址无效，请重新上传后再保存。",
      forbidden: "当前账号无权修改这件物品。",
      saveFailed: "保存失败，请稍后重试。",
    },
  },
  en: {
    merchant: { itemsLabel: "Items" },
    list: {
      title: "Item management",
      countLabel: (count) => `Tickets ${count}`,
      intro:
        "Ticket items are currently supported. Select a ticket to manage its image, allocations, and history.",
      new: "Create ticket",
      searchPlaceholder: "Search ticket names",
      searchAria: "Search tickets by name",
      searchButton: "Search",
      clear: "Clear",
      resultRange: (query, start, end, total) =>
        `${query ? `Results for “${query}”: ` : ""}${start}–${end} of ${total} tickets`,
      ticketType: "Ticket item",
      independent: "Independent ticket",
      giftable: "Gifting allowed",
      paused: "Gifting paused",
      remaining: (remaining, total) =>
        `Unallocated ${remaining} / Total ${total}`,
      emptyTitle: "No ticket items yet",
      emptyHint:
        "Create a ticket and set its quantity, then allocate it to an account from the item detail page.",
      noResultsTitle: "No matching tickets",
      noResultsHint: "Try another name or clear the search to see all tickets.",
      viewAll: "View all tickets",
      createFirst: "Create your first ticket item",
      paginationAria: "Item list pages",
      previous: "Previous",
      next: "Next",
      pageNumber: (current, total) => `Page ${current} of ${total}`,
    },
    frame: {
      ticketType: "Ticket item",
      imageAlt: (title) => `Image for ${title}`,
      remaining: "Unallocated",
      allocatedTotal: "Allocated / Total",
      giftingAllowed: "Allowed",
      giftingPaused: "Paused",
      backToList: "Back to item list",
      backToDetail: "Back to item details",
    },
    detail: {
      pageTitle: "Item details",
      actionsAria: "Item management actions",
      issueLabel: "Allocate to an account",
      issueHint:
        "Verify an account by Friemi code or QR code, then choose how many tickets to add to its bag.",
      issueEmptyHint:
        "All tickets in this batch have been allocated. You can view the history.",
      settingsLabel: "Image and gifting settings",
      settingsHint:
        "Upload the image shown in bags and choose whether holders may gift tickets.",
      historyLabel: "Allocation and gift history",
      historyHint:
        "View admin allocations and gifts between accounts separately.",
      accessLabel: "Store and check-in access",
      accessHint: "Link a store and manage ticket managers and check-in access.",
      redeemLabel: "Check in tickets",
      redeemHint: "Scan a guest's ticket QR code and confirm one ticket at a time.",
    },
    settings: {
      pageTitle: "Item settings",
      imageTitle: "Bag display image",
      imageHint: "This image appears in the item list and users’ bags.",
      giftingTitle: "Gifting between accounts",
      currentAllowed: "Current setting: gifting allowed",
      currentPaused: "Current setting: gifting paused",
    },
    issue: {
      pageTitle: "Allocate items",
      formTitle: "Allocate to a specific account",
      formHint:
        "Verify the receiving account, then enter the number of tickets to add to its bag.",
      soldOutHint: "All items in this batch have been allocated.",
    },
    newItem: { pageTitle: "Create ticket item" },
    access: {
      pageTitle: "Store and check-in access",
      merchantTitle: "Ticket owner",
      merchantHint: "Link one store, or assign a manager for an independent ticket.",
      changeWarning: "Changing or removing the store revokes current check-in access. History remains.",
      saveMerchant: "Save linked store",
      merchantSaved: "Linked store updated.",
      merchantFailed: "Could not update the store. Check the selection and try again.",
      managersLabel: "Ticket managers",
      managersHint: "Assign accounts that can manage check-in staff for this ticket.",
      staffLabel: "Check-in staff",
      staffHint: "Review invitations and check-in access.",
      redemptionsLabel: "Check-in history",
      redemptionsHint: "Review each checked-in ticket in time order.",
    },
    image: {
      tooLarge: "Images must be 10 MB or smaller. Choose a smaller file.",
      unsupportedType:
        "This image format is not supported. Choose a JPG, PNG, or WebP image.",
      storageUnavailable:
        "Image storage is temporarily unavailable. Try again later.",
      uploadFailed: "Image upload failed. Select the image again.",
      networkError: "Image upload failed. Check your connection and try again.",
      previewAlt: "Item image preview",
      previewFailed:
        "This image cannot be displayed. Upload another image before saving.",
      brokenPreview: "Preview unavailable. Upload another image.",
      noImage: "No image uploaded",
      uploading: "Uploading…",
      replace: "Replace image",
      upload: "Upload image",
      remove: "Remove image",
      hint: "JPG, PNG, or WebP is recommended, up to 10 MB. The saved image will appear in bags.",
    },
    form: {
      merchantLabel: "Linked store (optional)",
      merchantNone: "Independent ticket, no store",
      merchantHint: "The store owner can manage check-in staff and records for this ticket.",
      optionalImage: "Item image (optional)",
      saveImage: "Save image",
      imageUpdated: "Item image updated.",
      invalidImage: "Invalid image URL. Upload the image again before saving.",
      forbidden: "Your account cannot edit this item.",
      saveFailed: "Could not save the image. Try again later.",
    },
  },
  fr: {
    merchant: { itemsLabel: "Objets" },
    list: {
      title: "Gestion des objets",
      countLabel: (count) => `Billets ${count}`,
      intro:
        "Les billets sont actuellement pris en charge. Sélectionnez-en un pour gérer son image, ses attributions et son historique.",
      new: "Créer un billet",
      searchPlaceholder: "Rechercher un billet par nom",
      searchAria: "Rechercher des billets par nom",
      searchButton: "Rechercher",
      clear: "Effacer",
      resultRange: (query, start, end, total) =>
        `${query ? `Résultats pour « ${query} » : ` : ""}${start}–${end} sur ${total} billets`,
      ticketType: "Billet",
      independent: "Billet indépendant",
      giftable: "Cadeau autorisé",
      paused: "Cadeau suspendu",
      remaining: (remaining, total) =>
        `Non attribués ${remaining} / Total ${total}`,
      emptyTitle: "Aucun billet pour le moment",
      emptyHint:
        "Créez un billet et définissez sa quantité, puis attribuez-le à un compte depuis sa page de détail.",
      noResultsTitle: "Aucun billet trouvé",
      noResultsHint:
        "Essayez un autre nom ou effacez la recherche pour voir tous les billets.",
      viewAll: "Voir tous les billets",
      createFirst: "Créer votre premier billet",
      paginationAria: "Pages de la liste des objets",
      previous: "Précédent",
      next: "Suivant",
      pageNumber: (current, total) => `Page ${current} sur ${total}`,
    },
    frame: {
      ticketType: "Billet",
      imageAlt: (title) => `Image de ${title}`,
      remaining: "Non attribués",
      allocatedTotal: "Attribués / Total",
      giftingAllowed: "Autorisé",
      giftingPaused: "Suspendu",
      backToList: "Retour à la liste des objets",
      backToDetail: "Retour aux détails de l’objet",
    },
    detail: {
      pageTitle: "Détails de l’objet",
      actionsAria: "Actions de gestion de l’objet",
      issueLabel: "Attribuer à un compte",
      issueHint:
        "Vérifiez un compte par code Friemi ou QR, puis choisissez le nombre de billets à ajouter à son sac.",
      issueEmptyHint:
        "Tous les billets de ce lot ont été attribués. Vous pouvez consulter l’historique.",
      settingsLabel: "Image et cadeaux",
      settingsHint:
        "Importez l’image affichée dans les sacs et choisissez si les détenteurs peuvent offrir des billets.",
      historyLabel: "Historique des attributions et cadeaux",
      historyHint:
        "Consultez séparément les attributions par l’administration et les cadeaux entre comptes.",
      accessLabel: "Boutique et accès au contrôle",
      accessHint: "Associer une boutique et gérer les responsables et contrôleurs.",
      redeemLabel: "Valider les billets",
      redeemHint: "Scannez le QR code d’un invité et confirmez un billet à la fois.",
    },
    settings: {
      pageTitle: "Paramètres de l’objet",
      imageTitle: "Image affichée dans le sac",
      imageHint:
        "Cette image apparaît dans la liste des objets et dans les sacs des utilisateurs.",
      giftingTitle: "Cadeaux entre comptes",
      currentAllowed: "Réglage actuel : cadeaux autorisés",
      currentPaused: "Réglage actuel : cadeaux suspendus",
    },
    issue: {
      pageTitle: "Attribuer des billets",
      formTitle: "Attribuer à un compte précis",
      formHint:
        "Vérifiez le compte destinataire, puis indiquez le nombre de billets à ajouter à son sac.",
      soldOutHint: "Tous les billets de ce lot ont été attribués.",
    },
    newItem: { pageTitle: "Créer un billet" },
    access: {
      pageTitle: "Boutique et accès au contrôle",
      merchantTitle: "Responsable du billet",
      merchantHint: "Associez une seule boutique ou désignez un responsable indépendant.",
      changeWarning: "Changer ou retirer la boutique révoque les accès actuels. L’historique reste conservé.",
      saveMerchant: "Enregistrer la boutique",
      merchantSaved: "Boutique associée mise à jour.",
      merchantFailed: "Impossible de mettre la boutique à jour. Vérifiez votre choix.",
      managersLabel: "Responsables du billet",
      managersHint: "Désigner les comptes qui peuvent gérer les contrôleurs.",
      staffLabel: "Équipe de contrôle",
      staffHint: "Voir les invitations et les accès au contrôle.",
      redemptionsLabel: "Historique des contrôles",
      redemptionsHint: "Voir chaque billet contrôlé par ordre chronologique.",
    },
    image: {
      tooLarge:
        "L’image doit faire 10 Mo maximum. Choisissez un fichier plus petit.",
      unsupportedType:
        "Ce format d’image n’est pas pris en charge. Choisissez une image JPG, PNG ou WebP.",
      storageUnavailable:
        "Le stockage des images est momentanément indisponible. Réessayez plus tard.",
      uploadFailed: "L’import de l’image a échoué. Sélectionnez-la à nouveau.",
      networkError:
        "L’import de l’image a échoué. Vérifiez votre connexion et réessayez.",
      previewAlt: "Aperçu de l’image de l’objet",
      previewFailed:
        "Cette image ne peut pas s’afficher. Importez-en une autre avant d’enregistrer.",
      brokenPreview: "Aperçu indisponible. Importez une autre image.",
      noImage: "Aucune image importée",
      uploading: "Import en cours…",
      replace: "Remplacer l’image",
      upload: "Importer une image",
      remove: "Retirer l’image",
      hint: "JPG, PNG ou WebP recommandé, 10 Mo maximum. L’image enregistrée apparaîtra dans les sacs.",
    },
    form: {
      merchantLabel: "Boutique associée (facultatif)",
      merchantNone: "Billet indépendant, sans boutique",
      merchantHint: "Le responsable de la boutique pourra gérer le contrôle et son historique.",
      optionalImage: "Image de l’objet (facultative)",
      saveImage: "Enregistrer l’image",
      imageUpdated: "Image de l’objet mise à jour.",
      invalidImage:
        "Adresse de l’image invalide. Importez-la à nouveau avant d’enregistrer.",
      forbidden: "Votre compte ne peut pas modifier cet objet.",
      saveFailed: "Impossible d’enregistrer l’image. Réessayez plus tard.",
    },
  },
};

export function getAdminItemCopy(locale: string): AdminItemCopy {
  return copies[locale === "en" || locale === "fr" ? locale : "zh-CN"];
}
