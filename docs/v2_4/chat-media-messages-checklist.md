# v2.4 聊天图片与表情 Checklist

## 背景

私聊目前只能发送文字和基础 emoji。真实聊天里经常需要发现场照片、截图、表情图或只发一张图片，因此本分支补齐聊天图片能力，并保持输入栏轻量。

## 分支

- [x] 新建并切换到 `feature/v2-4-chat-media-messages`

## 数据与上传

- [x] `DirectMessage` 增加 `imageUrls` 字段，支持一条消息附带多张图片
- [x] 新增数据库迁移 `20260716130000_add_direct_message_images`
- [x] 新增聊天图片上传路径 `direct-messages/{userId}/...`
- [x] 新增 `/api/uploads/direct-message-image`
- [x] Prisma Client 重新生成
- [x] 预览数据库已执行 `20260716130000_add_direct_message_images`

## 发送能力

- [x] 发送规则改成“文字或图片至少一项”
- [x] 支持纯图片消息
- [x] 支持文字 + 图片同时发送
- [x] 单条消息最多 4 张图片
- [x] 图片上传失败时保留输入框内容
- [x] 发送成功后清空文字、图片和表情面板

## 展示能力

- [x] 聊天气泡展示图片缩略图
- [x] 聊天气泡图片点击后使用站内全屏预览，不再跳转新标签页
- [x] 图片预览支持关闭、键盘 Esc 和多图左右切换
- [x] 图片预览支持大长图放大、缩小和拖动查看细节
- [x] 移动端图片预览支持左右滑动切换
- [x] 多图消息使用紧凑网格
- [x] 消息列表预览纯图片消息时显示“图片”
- [x] 桌面好友列表和移动端好友列表预览一致
- [x] 保留现有 emoji 表情面板

## 验收

- [ ] 文本消息仍可正常发送
- [ ] 图片消息可正常上传、发送和展示
- [ ] 纯图片消息不会被当成空消息拦截
- [ ] 发送失败时能看到错误提示
- [x] `npm run typecheck --workspace=apps/web` 通过
- [x] `git diff --check` 通过

## 私信发送速度优化方案

> 当前已经落实第一轮体验侧优化；耗时日志、压测和连接池评估仍需单独做。

### 问题判断

- [ ] 纯文本消息慢不是图片上传导致；纯文本不会请求 `/api/uploads/direct-message-image`
- [x] 当前发送体验依赖 server action 完整返回，按钮 pending 期间无法提前展示消息
- [x] 发送成功后会 revalidate `/messages` 和当前会话页，引发整页服务端重新取数
- [x] 消息详情页刷新时会同时取当前对话、好友列表、好友活动信号、好友申请，并标记通知已读
- [ ] Supabase pooler `connection_limit=1` 可能放大数据库请求排队时间

### P0：先量化慢在哪里

- [x] 给 `sendDirectMessageAction` 增加临时耗时日志：用户确认、DB 事务、analytics 排队、revalidate 总耗时
- [x] 给 `sendDirectMessage` 事务内部增加临时耗时日志：查会话、权限校验、创建消息、更新会话
- [ ] 在预览环境记录 20 次纯文本发送耗时，区分本机浏览器、Android WebView、移动网络
- [ ] 对比“发送 action 耗时”和“页面刷新完成耗时”，判断慢感主要来自服务端写入还是刷新取数
- [ ] 检查 Vercel Function 日志里是否有 Prisma `P2024`、Clerk 429、Supabase 连接等待或冷启动

### P0：前端发送体验优化

- [x] 发送时先本地追加一条临时消息，显示为“发送中”
- [x] 用户点击发送后立刻清空输入框，不等待 server action 完整返回
- [x] 服务端返回真实 `messageId` 后，用真实消息替换临时消息
- [x] 服务端失败时，将临时消息标记为“发送失败”，支持点击重试
- [x] 发送按钮只在当前请求提交瞬间短暂禁用，不因为整页刷新长时间不可用
- [x] 移动端保持输入框焦点和键盘状态，避免每次发送后页面跳动

### P0：服务端发送链路减重

- [x] 把发送消息需要的最小返回值收敛为 `messageId / createdAt / body / imageUrls / senderId`
- [x] 发送 action 改用 mutation 快路径获取用户资料，已有用户不再每次发送都请求 Clerk `currentUser()`
- [x] 消息写入事务返回轻量 conversation id，避免发送后重新读取完整会话字段
- [x] 发送成功后不要阻塞等待完整会话页刷新
- [x] 将非关键 revalidate 延后到后台刷新，只保证当前会话最终一致
- [x] `/messages` 列表页 revalidate 可以延后或按需触发，避免每条消息都同步刷新整个消息中心
- [x] `revalidatePath(/notifications)` 不应成为发送路径的必要步骤；私信通知策略需单独梳理

### P1：消息详情页查询减重

- [x] 移动端消息详情页优先只取当前 conversation 和最近 50 条消息
- [x] 好友列表、好友活动信号、好友申请在移动端详情页改为懒加载或不加载
- [x] 桌面端需要好友列表时再取 `getDirectMessageFriendRoster`
- [x] `getFriendNearestActivitySignals` 不应阻塞当前聊天窗口首屏
- [x] 标记私信通知已读可以后台执行，不阻塞首屏渲染

### P1：数据库与连接优化

- [ ] 评估生产环境 `DATABASE_URL` 的 `connection_limit=1` 是否过低
- [ ] 消息发送链路确认使用 pooler；迁移和管理任务继续使用 `DIRECT_URL`
- [ ] 检查 `Conversation(id, userAId/userBId)`、`DirectMessage(conversationId, createdAt)` 索引是否满足当前查询
- [ ] 如继续使用通知型未读私信，补充 `Notification(recipientId, actorId, type, readAt)` 查询索引评估
- [ ] 高峰期前用预览环境压测连续发送 50 条纯文本消息，观察 P95 延迟

### P1：刷新与同步策略

- [x] 当前 6 秒自动刷新只用于接收对方新消息，不用于确认自己刚发的消息
- [x] 自己发送成功后只触发轻量刷新当前 thread，不刷新非必要侧栏数据
- [ ] 页面重新聚焦时刷新当前会话，避免后台期间频繁请求
- [ ] 长期方案可评估 Supabase Realtime 或轻量轮询接口，只拉取 `lastMessageAt` 之后的新消息

### P2：最终体验验收

- [x] 纯文本发送点击后 100ms 内本地出现临时消息
- [ ] 正常网络下真实发送完成 P95 小于 1 秒
- [ ] 弱网下输入框不会卡住，失败消息可重试
- [ ] Android WebView 连发 10 条文本不丢、不重复、不乱序
- [ ] 图片消息上传和发送状态分离：上传慢不影响纯文本发送
