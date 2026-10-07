type MerchantAdminCopy = {
  common: {
    backToSettings: string;
    backToList: string;
    backToDetail: string;
    publicPage: string;
    managementAria: string;
  };
  list: {
    pageTitle: string;
    merchantsTab: string;
    count: (count: number) => string;
    intro: string;
    createWithAccount: string;
    createWithoutAccount: string;
    searchAria: string;
    searchPlaceholder: string;
    merchantAria: (name: string) => string;
    missingAddress: string;
    owner: (name: string) => string;
    pendingOwner: string;
    activities: (count: number) => string;
    noMerchants: string;
    noResults: string;
    noMerchantsHint: string;
    clearSearch: string;
  };
  detail: {
    pageTitle: string;
    summaryAria: (name: string) => string;
    bound: string;
    unbound: string;
    noOwner: string;
    noContact: string;
    actionsAria: string;
    coupons: string;
    couponsHint: string;
    bindOwner: string;
    bindOwnerHint: string;
    publicHint: string;
  };
  create: {
    pageTitle: string;
    intro: string;
    sectionTitle: string;
    name: string;
    description: string;
    descriptionPlaceholder: string;
    city: string;
    cityPlaceholder: string;
    address: string;
    more: string;
    slug: string;
    slugHint: string;
    email: string;
    website: string;
    latitude: string;
    longitude: string;
    save: string;
    clear: string;
    slugConflict: string;
    failed: string;
    networkError: string;
    success: string;
  };
  bind: {
    pageTitle: string;
    createPageTitle: string;
    alreadyBound: (name: string) => string;
    intro: (name: string) => string;
    createIntro: string;
    searchAria: string;
    searchPlaceholder: string;
    searchButton: string;
    results: (count: number) => string;
    friendCode: string;
    missingCode: string;
    select: string;
    cancel: string;
    confirm: (account: string, merchant: string) => string;
    confirmCreate: (account: string) => string;
    submit: string;
    submitCreate: string;
    noResults: string;
    noCreateResults: string;
    noResultsHint: string;
    conflict: string;
    failed: string;
    createFailed: string;
    networkError: string;
    createNetworkError: string;
    success: string;
    createSuccess: string;
  };
  coupons: {
    pageTitle: string;
    intro: (name: string) => string;
    templates: string;
    added: (count: number) => string;
    availableAria: string;
    thumbnailLabel: string;
    empty: string;
    platformTitle: string;
    selectStyle: string;
    add: string;
    addFailed: string;
    addSuccess: string;
    customTitle: string;
    showForm: string;
    hideForm: string;
    name: string;
    description: string;
    terms: string;
    background: string;
    foreground: string;
    accent: string;
    preview: string;
    previewBrandLabel: string;
    save: string;
    saveFailed: string;
    saveNetworkError: string;
    saveSuccess: string;
  };
};

const copies: Record<"zh-CN" | "en" | "fr", MerchantAdminCopy> = {
  "zh-CN": {
    common: {
      backToSettings: "返回账户设置",
      backToList: "返回店铺列表",
      backToDetail: "返回店铺详情",
      publicPage: "公开主页",
      managementAria: "管理内容",
    },
    list: {
      pageTitle: "店铺与物品",
      merchantsTab: "店铺",
      count: (count) => `合作店铺 ${count}`,
      intro: "选择店铺查看详情，或添加新店铺。",
      createWithAccount: "为账号开通新店铺",
      createWithoutAccount: "添加未绑定店铺",
      searchAria: "搜索店铺",
      searchPlaceholder: "搜索店名、城市或店家账号",
      merchantAria: (name) => `管理店铺 ${name}`,
      missingAddress: "未填写地址",
      owner: (name) => `店家 ${name}`,
      pendingOwner: "待绑定店家",
      activities: (count) => `${count} 个活动`,
      noMerchants: "还没有店铺",
      noResults: "没有匹配的店铺",
      noMerchantsHint: "添加未绑定店铺，或为现有 Friemi 账号开通新店铺。",
      clearSearch: "清空搜索",
    },
    detail: {
      pageTitle: "店铺详情",
      summaryAria: (name) => `${name} 店铺资料`,
      bound: "已绑定",
      unbound: "未绑定",
      noOwner: "未绑定店家账号",
      noContact: "未填写联系方式",
      actionsAria: "店铺管理操作",
      coupons: "优惠券模板",
      couponsHint: "查看和添加店家可发布的优惠券。",
      bindOwner: "绑定店家账号",
      bindOwnerHint: "选择一个 Friemi 账号管理这家店铺。",
      publicHint: "查看访客看到的店铺页面。",
    },
    create: {
      pageTitle: "添加未绑定店铺",
      intro: "保存店铺资料后，可在店铺详情绑定店家账号。",
      sectionTitle: "店铺资料",
      name: "店铺名称",
      description: "店铺简介",
      descriptionPlaceholder: "介绍店铺的类型和特色",
      city: "城市",
      cityPlaceholder: "例如：巴黎",
      address: "详细地址",
      more: "更多资料",
      slug: "URL 标识",
      slugHint: "留空则根据店名自动生成",
      email: "联系邮箱",
      website: "官网",
      latitude: "纬度",
      longitude: "经度",
      save: "创建店铺",
      clear: "清空",
      slugConflict: "店铺 URL 标识已存在，请更换一个标识",
      failed: "店铺创建失败，请检查必填信息",
      networkError: "店铺创建失败，请稍后重试",
      success: "合作店铺已创建",
    },
    bind: {
      pageTitle: "绑定店家账号",
      createPageTitle: "为账号开通新店铺",
      alreadyBound: (name) => `这家店铺已绑定 ${name}。`,
      intro: (name) =>
        `选择要管理「${name}」的 Friemi 账号。每个账号只能绑定一家店铺。`,
      createIntro: "选择现有 Friemi 账号，系统会为其创建新店铺并开通店家权限。",
      searchAria: "搜索 Friemi 用户",
      searchPlaceholder: "输入昵称、邮箱或 6 位 Friemi 个人号",
      searchButton: "查找账号",
      results: (count) => `搜索结果 · ${count}`,
      friendCode: "Friemi 个人号",
      missingCode: "未生成",
      select: "选择此账号",
      cancel: "取消选择",
      confirm: (account, merchant) =>
        `确认将「${account}」绑定到「${merchant}」？绑定后该账号可管理这家店铺。`,
      confirmCreate: (account) =>
        `确认为「${account}」创建新店铺并开通店家权限？`,
      submit: "确认绑定账号",
      submitCreate: "确认开通新店铺",
      noResults: "没有找到可绑定账号",
      noCreateResults: "没有找到可开通账号",
      noResultsHint:
        "请检查昵称、邮箱或 6 位 Friemi 个人号；已管理其他店铺的账号不会显示。",
      conflict: "账号或店铺已绑定，请刷新后重试",
      failed: "绑定失败，请确认账号和店铺仍然有效",
      createFailed: "开通失败，请确认账号仍然有效",
      networkError: "绑定失败，请稍后重试",
      createNetworkError: "开通失败，请稍后重试",
      success: "账号已绑定到此店铺",
      createSuccess: "新店铺已开通",
    },
    coupons: {
      pageTitle: "优惠券模板",
      intro: (name) => `管理「${name}」可供店家发布的优惠券模板。`,
      templates: "已添加模板",
      added: (count) => `已添加 ${count}`,
      availableAria: "店铺可用模板",
      thumbnailLabel: "优惠券",
      empty: "暂无模板。添加一个模板后，店家才能发布优惠券。",
      platformTitle: "添加平台模板",
      selectStyle: "选择样式",
      add: "添加到此店铺",
      addFailed: "模板添加失败，请稍后重试",
      addSuccess: "模板已添加到此店铺",
      customTitle: "自定义模板",
      showForm: "创建自定义模板",
      hideForm: "收起",
      name: "模板名称",
      description: "默认优惠内容",
      terms: "默认使用规则",
      background: "底色",
      foreground: "文字",
      accent: "强调",
      preview: "优惠券预览",
      previewBrandLabel: "Friemi 优惠券",
      save: "保存模板",
      saveFailed: "自定义模板创建失败，请检查内容",
      saveNetworkError: "自定义模板创建失败，请稍后重试",
      saveSuccess: "自定义模板已添加",
    },
  },
  en: {
    common: {
      backToSettings: "Back to account settings",
      backToList: "Back to stores",
      backToDetail: "Back to store details",
      publicPage: "Public page",
      managementAria: "Manage content",
    },
    list: {
      pageTitle: "Stores and items",
      merchantsTab: "Stores",
      count: (count) => `Partner stores ${count}`,
      intro: "Choose a store to see its details, or add a new one.",
      createWithAccount: "Open a store for an account",
      createWithoutAccount: "Add a store without an owner",
      searchAria: "Search stores",
      searchPlaceholder: "Search by store, city, or owner",
      merchantAria: (name) => `Manage ${name}`,
      missingAddress: "No address",
      owner: (name) => `Owner ${name}`,
      pendingOwner: "Owner not linked",
      activities: (count) => `${count} activities`,
      noMerchants: "No stores yet",
      noResults: "No matching stores",
      noMerchantsHint:
        "Add a store without an owner, or open one for an existing Friemi account.",
      clearSearch: "Clear search",
    },
    detail: {
      pageTitle: "Store details",
      summaryAria: (name) => `Details for ${name}`,
      bound: "Owner linked",
      unbound: "No owner",
      noOwner: "No owner linked",
      noContact: "No contact details",
      actionsAria: "Store management actions",
      coupons: "Coupon templates",
      couponsHint: "View or add coupons the owner can publish.",
      bindOwner: "Link an owner account",
      bindOwnerHint: "Choose a Friemi account to manage this store.",
      publicHint: "View the store page visitors see.",
    },
    create: {
      pageTitle: "Add a store without an owner",
      intro: "After saving the store, you can link an owner from its details.",
      sectionTitle: "Store details",
      name: "Store name",
      description: "Description",
      descriptionPlaceholder:
        "Describe the type of store and what makes it special",
      city: "City",
      cityPlaceholder: "For example, Paris",
      address: "Street address",
      more: "More details",
      slug: "URL slug",
      slugHint: "Leave empty to generate it from the store name",
      email: "Contact email",
      website: "Website",
      latitude: "Latitude",
      longitude: "Longitude",
      save: "Create store",
      clear: "Clear",
      slugConflict: "This store URL is already in use. Choose another slug.",
      failed: "Could not create the store. Check the required fields.",
      networkError: "Could not create the store. Try again later.",
      success: "Store created",
    },
    bind: {
      pageTitle: "Link an owner account",
      createPageTitle: "Open a store for an account",
      alreadyBound: (name) => `This store is already linked to ${name}.`,
      intro: (name) =>
        `Choose the Friemi account that will manage ${name}. Each account can manage one store.`,
      createIntro:
        "Choose an existing Friemi account to create its store and grant owner access.",
      searchAria: "Search Friemi accounts",
      searchPlaceholder: "Name, email, or 6-digit Friemi code",
      searchButton: "Find account",
      results: (count) => `Results · ${count}`,
      friendCode: "Friemi code",
      missingCode: "Not generated",
      select: "Select account",
      cancel: "Cancel selection",
      confirm: (account, merchant) =>
        `Link ${account} to ${merchant}? This account will be able to manage the store.`,
      confirmCreate: (account) =>
        `Create a store for ${account} and grant owner access?`,
      submit: "Confirm link",
      submitCreate: "Confirm new store",
      noResults: "No eligible account found",
      noCreateResults: "No eligible account found",
      noResultsHint:
        "Check the name, email, or 6-digit Friemi code. Accounts managing another store are excluded.",
      conflict:
        "The account or store is already linked. Refresh and try again.",
      failed:
        "Could not link the account. Check that the account and store are still available.",
      createFailed:
        "Could not open the store. Check that the account is still available.",
      networkError: "Could not link the account. Try again later.",
      createNetworkError: "Could not open the store. Try again later.",
      success: "Account linked to this store",
      createSuccess: "New store opened",
    },
    coupons: {
      pageTitle: "Coupon templates",
      intro: (name) =>
        `Manage coupon templates that the owner of ${name} can publish.`,
      templates: "Added templates",
      added: (count) => `${count} added`,
      availableAria: "Available store templates",
      thumbnailLabel: "Coupon",
      empty: "No templates yet. Add one so the owner can publish coupons.",
      platformTitle: "Add platform template",
      selectStyle: "Choose a style",
      add: "Add to this store",
      addFailed: "Could not add the template. Try again later.",
      addSuccess: "Template added to this store",
      customTitle: "Custom template",
      showForm: "Create custom template",
      hideForm: "Hide form",
      name: "Template name",
      description: "Default offer",
      terms: "Default terms",
      background: "Background",
      foreground: "Text",
      accent: "Accent",
      preview: "Coupon preview",
      previewBrandLabel: "Friemi coupon",
      save: "Save template",
      saveFailed: "Could not create the template. Check its content.",
      saveNetworkError: "Could not create the template. Try again later.",
      saveSuccess: "Custom template added",
    },
  },
  fr: {
    common: {
      backToSettings: "Retour aux paramètres du compte",
      backToList: "Retour aux établissements",
      backToDetail: "Retour à l’établissement",
      publicPage: "Page publique",
      managementAria: "Gestion du contenu",
    },
    list: {
      pageTitle: "Établissements et objets",
      merchantsTab: "Établissements",
      count: (count) => `Établissements partenaires ${count}`,
      intro:
        "Choisissez un établissement pour voir ses détails, ou ajoutez-en un.",
      createWithAccount: "Créer pour un compte",
      createWithoutAccount: "Ajouter sans gérant",
      searchAria: "Rechercher un établissement",
      searchPlaceholder: "Nom, ville ou compte du gérant",
      merchantAria: (name) => `Gérer ${name}`,
      missingAddress: "Adresse non renseignée",
      owner: (name) => `Gérant : ${name}`,
      pendingOwner: "Gérant à associer",
      activities: (count) => `${count} activités`,
      noMerchants: "Aucun établissement",
      noResults: "Aucun résultat",
      noMerchantsHint:
        "Ajoutez un établissement sans gérant ou créez-en un pour un compte Friemi existant.",
      clearSearch: "Effacer la recherche",
    },
    detail: {
      pageTitle: "Détails de l’établissement",
      summaryAria: (name) => `Informations de ${name}`,
      bound: "Gérant associé",
      unbound: "Sans gérant",
      noOwner: "Aucun compte gérant associé",
      noContact: "Coordonnées non renseignées",
      actionsAria: "Actions de gestion de l’établissement",
      coupons: "Modèles de bons",
      couponsHint: "Voir ou ajouter les bons que le gérant peut publier.",
      bindOwner: "Associer un compte gérant",
      bindOwnerHint:
        "Choisissez le compte Friemi qui gérera cet établissement.",
      publicHint: "Voir la page de l’établissement destinée aux visiteurs.",
    },
    create: {
      pageTitle: "Ajouter sans gérant",
      intro:
        "Après l’enregistrement, associez un gérant depuis les détails de l’établissement.",
      sectionTitle: "Informations de l’établissement",
      name: "Nom de l’établissement",
      description: "Description",
      descriptionPlaceholder:
        "Présentez l’activité et les particularités de l’établissement",
      city: "Ville",
      cityPlaceholder: "Par exemple, Paris",
      address: "Adresse",
      more: "Plus d’informations",
      slug: "Identifiant URL",
      slugHint: "Laissez vide pour le générer à partir du nom",
      email: "E-mail de contact",
      website: "Site web",
      latitude: "Latitude",
      longitude: "Longitude",
      save: "Créer l’établissement",
      clear: "Effacer",
      slugConflict:
        "Cette URL est déjà utilisée. Choisissez un autre identifiant.",
      failed: "Création impossible. Vérifiez les champs obligatoires.",
      networkError: "Création impossible. Réessayez plus tard.",
      success: "Établissement créé",
    },
    bind: {
      pageTitle: "Associer un compte gérant",
      createPageTitle: "Créer pour un compte",
      alreadyBound: (name) => `Cet établissement est déjà associé à ${name}.`,
      intro: (name) =>
        `Choisissez le compte Friemi qui gérera ${name}. Un compte ne peut gérer qu’un établissement.`,
      createIntro:
        "Choisissez un compte Friemi existant pour créer son établissement et lui donner l’accès gérant.",
      searchAria: "Rechercher un compte Friemi",
      searchPlaceholder: "Nom, e-mail ou code Friemi à 6 chiffres",
      searchButton: "Rechercher",
      results: (count) => `Résultats · ${count}`,
      friendCode: "Code Friemi",
      missingCode: "Non généré",
      select: "Choisir ce compte",
      cancel: "Annuler la sélection",
      confirm: (account, merchant) =>
        `Associer ${account} à ${merchant} ? Ce compte pourra gérer cet établissement.`,
      confirmCreate: (account) =>
        `Créer un établissement pour ${account} et lui donner l’accès gérant ?`,
      submit: "Confirmer l’association",
      submitCreate: "Confirmer la création",
      noResults: "Aucun compte éligible",
      noCreateResults: "Aucun compte éligible",
      noResultsHint:
        "Vérifiez le nom, l’e-mail ou le code Friemi à 6 chiffres. Les comptes gérant déjà un autre établissement sont exclus.",
      conflict:
        "Le compte ou l’établissement est déjà associé. Actualisez puis réessayez.",
      failed:
        "Association impossible. Vérifiez que le compte et l’établissement sont disponibles.",
      createFailed:
        "Création impossible. Vérifiez que le compte est disponible.",
      networkError: "Association impossible. Réessayez plus tard.",
      createNetworkError: "Création impossible. Réessayez plus tard.",
      success: "Compte associé à cet établissement",
      createSuccess: "Nouvel établissement créé",
    },
    coupons: {
      pageTitle: "Modèles de bons",
      intro: (name) =>
        `Gérez les modèles de bons que le gérant de ${name} peut publier.`,
      templates: "Modèles ajoutés",
      added: (count) => `${count} ajoutés`,
      availableAria: "Modèles disponibles pour l’établissement",
      thumbnailLabel: "Bon",
      empty:
        "Aucun modèle. Ajoutez-en un pour que le gérant puisse publier des bons.",
      platformTitle: "Ajouter un modèle de la plateforme",
      selectStyle: "Choisir un style",
      add: "Ajouter à cet établissement",
      addFailed: "Ajout impossible. Réessayez plus tard.",
      addSuccess: "Modèle ajouté à cet établissement",
      customTitle: "Modèle personnalisé",
      showForm: "Créer un modèle personnalisé",
      hideForm: "Masquer le formulaire",
      name: "Nom du modèle",
      description: "Offre par défaut",
      terms: "Conditions par défaut",
      background: "Fond",
      foreground: "Texte",
      accent: "Accent",
      preview: "Aperçu du bon",
      previewBrandLabel: "Bon Friemi",
      save: "Enregistrer le modèle",
      saveFailed: "Création impossible. Vérifiez le contenu.",
      saveNetworkError: "Création impossible. Réessayez plus tard.",
      saveSuccess: "Modèle personnalisé ajouté",
    },
  },
};

export function getMerchantAdminCopy(locale: string): MerchantAdminCopy {
  return copies[locale === "en" || locale === "fr" ? locale : "zh-CN"];
}
