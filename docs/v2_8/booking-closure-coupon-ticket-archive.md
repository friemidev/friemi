# 关闭预约与优惠券、票券归档

## 产品规则

- 门店主人在预约管理页关闭预约。关闭后停止接收新预约，长期聚吧退出公开展示；已有预约及历史保留，仍可接受、拒绝和取消。
- 重新开启预约会恢复长期聚吧的公开展示及原有日期规则。
- 优惠券与票券采用归档，不提供删除操作。归档只停止新的优惠券领取和管理员票券分配。
- 已领取优惠券在原有效期内仍可核销；已发出的票券继续按原有赠送和核销规则使用。
- 移出归档保留原来的上架、赠送、数量和有效期设置。原本下架的优惠券仍保持下架。

## 页面入口

| 操作 | 页面 |
| --- | --- |
| 关闭、重新开启预约 | `/profile/store/bookings` |
| 归档优惠券、移出归档 | `/profile/store/coupons/[couponId]` |
| 查看归档优惠券 | `/profile/store/coupons?filter=archived` |
| 归档票券、移出归档 | `/admin/items/[definitionId]/settings` |
| 查看归档票券 | `/admin/merchants?view=items&archived=1` |

普通列表排除归档记录。归档筛选保留搜索能力，票券列表分页同时保留归档条件。手机端优惠券归档入口无需横向滚动即可看到。

## 数据库

迁移 `20261013160000_coupon_ticket_archives` 为 `Coupon` 和 `InventoryItemDefinition` 添加可空的 `archivedAt` 字段及列表查询索引。已有记录默认未归档，迁移不改动库存、领取或核销记录。

预览数据库已应用迁移，字段、索引、迁移完成状态和校验和均已核对。迁移前完整备份保存在本机：`/home/ubuntu23/Bureau/friemi-backups/preview-before-archive-20261013-132704.dump`，并已验证可读取。生产数据库待本批发布时迁移。

## 验收

- 应用构建及类型检查通过；优惠券规则、预约服务、开放日期与票券核销的 33 项相关单元测试通过。
- `probe-coupon-ticket-archive-preview.ts`：使用临时预览数据验证归档拦截新领取、新分配，已发出记录保留，移出归档恢复原状态。
- `probe-archive-ui-preview-browser.mjs`：商家与管理员真实测试账号在手机、桌面操作归档并查看归档筛选，无横向溢出。
- `probe-booking-closure-preview-browser.mjs`：关闭时拦截已打开的旧预约表单，已有预约仍可接受，重新开启后可提交新预约，检查手机与桌面布局。
- 所有专项验收的临时账户和记录已清理。
