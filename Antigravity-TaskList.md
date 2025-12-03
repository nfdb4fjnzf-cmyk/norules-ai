# NoAI v3 Master Specification — 第 1 章：系統總覽（System Overview）

## 1.1 專案名稱

**NoAI｜AI 驅動數位行銷自動化平台**
版本：**v3 Master Spec（合併 1~121 章 + V2.0~V2.5）**

---

## 1.2 文件目的（Purpose of This Spec）

本文件為 **NoAI 平台的最終版本企業級系統規格書**，目的包含：

1. 作為 **唯一來源（Single Source of Truth）** 的完整技術規格
2. 用於：

   * Google AI Codegen（自動生成後端、前端、Worker、DB 結構）
   * 工程師開發
   * 架構審查
   * 安全稽核
   * 無框行銷整合（Unframe Integration）
3. 完整整合：

   * NoAI **1~121 章原始規格**
   * NoAI **v2.0~v2.2 現有系統**
   * NoAI **v2.3（企業級）**
   * NoAI **v2.4（自動生成與過審引擎）**
   * NoAI **v2.5（廣告發布、自動同步、Ad Brain）**

---

## 1.3 系統定位（Product Positioning）

NoAI 是一個 **AI 行銷自動化 SaaS**，核心能力包含：

### A. 內容生成（Creative Generation）

* 文案生成
* 圖片生成
* 影片生成
* Localization 一鍵轉換
* Landing Page 自動化

### B. 廣告自動化（Ad Automation）

* Meta / TikTok / Google Ads API 串接
* 一鍵上架廣告
* 自動同步投放數據
* AI 自動優化（Ad Brain）

### C. 過審與風險分析（Compliance & Risk）

* 廣告平台合規分析
* 自動修文案、自動修圖片

### D. 金流與會員商業模式（Billing & Subscription）

* 訂閱制
* 點數制
* 企業級組織（Org / Team / Projects）
* API Key 使用（BYOK）

---

## 1.4 系統模組架構（Modules Overview）

### Core Modules

1. Auth Module
2. User Module
3. Subscription Module
4. Payment Module
5. Credit Engine
6. Usage Engine

### Generative Modules

7. Text Generation
8. Image Generation
9. Video Generation
10. Landing Page Generator
11. Template & Variant Engine
12. Localization Engine

### Analysis & Compliance Modules

13. Risk Analyzer
14. Auto Compliance Fixer

### Enterprise Modules（v2.3）

15. Organizations
16. Projects
17. Permission System（RBAC）
18. Admin Panel
19. BYOK（User API Key）

### Ad Automation Modules（v2.5）

20. Meta Ads Publish Engine
21. TikTok Ads Publish Engine
22. Google Ads Publish Engine
23. Performance Sync Engine
24. Ad Brain

### Infrastructure Modules

25. Cloudflare Worker API Gateway
26. Vercel Next.js Frontend / API Route
27. Firestore Database
28. Cloud Storage
29. Logging / Monitoring / DRP

---

## 1.5 關鍵特色（Key Features）

### ⚡ 一鍵生成（One-Click Creative）

* 文案、圖片、影片、Localization、A/B 變體、Landing Page

### ⚡ 自動過審（Auto Compliance）

* 違規字詞偵測
* 自動修正（圖片＋文案）

### ⚡ 投放自動化（Ad Automation）

* 自動上架
* 自動同步數據
* AI 自動優化

### ⚡ 企業級（Enterprise）

* Org / Team / Project
* API Key（BYOK）

### ⚡ 金流與點數（Billing）

* 訂閱、點數扣除、加點、Webhook

---

## 1.6 系統目標（System Goals）

1. 自動化行銷素材生成
2. 自動化廣告建立與同步
3. 降低行銷人員 80% 人工
4. 降低過審風險至 5% 以下
5. 支援 6 國市場

---

## 1.7 技術目標（Technical Goals）

1. API 標準化
2. 所有扣點統一由 UsageEngine 處理
3. 所有生成模組使用 Queue / Retry
4. 統一 Schema
5. 性能與金流隔離
6. 可被 Google AI 100% 重建

---

## 1.8 使用者角色（User Roles）

| 角色               | 權限             |
| ---------------- | -------------- |
| Guest            | 註冊、登入          |
| User             | 使用生成工具、購買點數、訂閱 |
| Org Member       | 使用企業功能、共享點數    |
| Org Admin        | 管理組織與資源        |
| Owner            | 全權限            |
| Super Admin（平台方） | 審查、補點、封鎖、統計    |

---

## 1.9 全域資料流（Global Data Flow）

1. Worker 驗證 Token → API Route
2. API Route：Auth → Subscription → Credit → Usage Start
3. 呼叫各模組（LLM / Ads / Analyzer）
4. Usage Finalize
5. 寫入 DB
6. 回傳結果至前端

---

# 第 2 章：系統架構（Architecture Overview）

## 2.1 架構總覽（High-Level Architecture）

NoAI 採用 **前後端分離 + 邊緣運算 + 雲端資料庫** 的多層式架構。

主要組成：

1. **Frontend（Vercel Next.js）** — 使用者介面 + API Route
2. **Edge Layer（Cloudflare Worker）** — 安全代理、金鑰保護、Rate Limiting
3. **Backend Services（Next.js API / 伺服器端執行）**
4. **Database（Firestore）** — 所有結構化資料
5. **Storage（Cloud Storage / R2）** — 圖片、影片、生成素材
6. **LLM Providers（OpenAI / Gemini / NoAI）**
7. **Ad APIs（Meta / TikTok / Google）**
8. **Payment Provider（NOWPayments）**
9. **Logging & Monitoring（Cloudflare Analytics / Firebase Logs）**

上述組件彼此透過 Worker 進行安全整合，避免金鑰外洩與未授權使用。

---

## 2.2 前端架構（Frontend Architecture — Vercel Next.js）

### 技術：

* Next.js App Router
* Server Components + Client Components 混用
* TailwindCSS UI
* Firebase SDK（Auth、Firestore、Storage）
* SWR / React Query（資料快取）

### 主要職責：

* 使用者操作介面（Dashboard / LLM / Analyzer / Ads / Subscription）
* Token 儲存（HTTP-only Cookie）
* 狀態管理（useUser / useCredit / useSubscription）
* 呼叫 Worker API，而非直接呼叫後端

### 前端不得處理：

* 不可儲存任何 API Key
* 不可存 LLM 金鑰
* 不可扣點或處理訂閱邏輯

所有敏感動作均交由 Worker 或 API Route 處理。

---

## 2.3 邊緣層架構（Edge Architecture — Cloudflare Worker）

NoAI 的 Worker 扮演整個平台的 **安全閘道（Secure Gateway）**。

### 核心功能：

* 驗證 JWT / Firebase Token
* 秘密金鑰保護（LLM Key、Ad API Key、NoAI Key）
* Request Logging
* Rate Limiting（依 IP / User / Org）
* Request Sanitization（防止惡意字串注入）
* 將乾淨的請求轉送至 **Vercel API Route**

### Worker 必須保護：

* LLM API Key
* NOWPayments API Key
* Meta / TikTok / Google Ads Token
* Admin Endpoint

### Worker Request Flow：

1. 客戶端送出請求
2. Worker 驗證 token
3. Worker 寫入 log（日期、裝置、IP）
4. Worker 限流檢查
5. Worker 轉發至 /api/
6. 回傳乾淨 response 到前端

---

## 2.4 後端架構（Backend Architecture — Vercel API Routes）

後端以 **Next.js API Route** 為主，不使用傳統伺服器。

### 主要模組：

* Auth Controller（登入 / 註冊 / Token）
* Subscription Controller（建立 / 取消 / 查詢）
* Payment Controller（Invoice / Webhook）
* Credit Controller（扣點 / 查詢）
* Usage Controller（Start / Finalize）
* LLM Controller（文字 / 圖片 / 影片）
* Landing Page Controller
* Analyzer Controller（Meta / TikTok / Google）
* Ad Publish Controller
* Sync Controller（數據同步）
* Ad Brain Controller
* Admin Controller（補點 / 審查）

### Backend Flow：

1. Worker 送進來的請求進入 API Route
2. 執行 Auth / Subscription / Credit 檢查
3. Usage Start（預扣）
4. 執行實際功能（LLM、Ads、Analyzer）
5. Usage Finalize（扣點 or 退款）
6. 回傳資料

---

## 2.5 資料庫架構（Firestore Architecture）

系統所有資料皆存於 Firestore，並分為 **9 個主集合（Collection）**：

1. **users/** – 使用者資料
2. **subscriptions/** – 訂閱紀錄
3. **subscription_events/** – 訂閱事件（續約、取消）
4. **credit_ledger/** – 點數異動紀錄
5. **usage_operations/** – 每次功能呼叫紀錄
6. **orgs/** – 組織、公司
7. **projects/** – 專案（歸屬於 org）
8. **creatives/** – 所有生成素材紀錄
9. **ad_campaigns/** – 廣告建立與同步資料

完整 Schema 會在第 3 章說明。

---

## 2.6 儲存架構（Storage Architecture）

用途：存放

* 圖片生成結果
* 影片生成結果
* Landing Page 靜態檔案
* 使用者上傳素材

來源：

* Firebase Storage（預設）
* Cloudflare R2（備用）

生成策略：

* 每個生成結果使用 UUID 檔名
* 生成後寫回 creatives/{id}
* URL 使用 Signed URL（有效期 1~24 小時）

---

## 2.7 外部服務架構（External Providers）

### LLM Providers

* OpenAI（GPT-4/5）
* Gemini
* NoAI（未來規劃）

### Payment Provider

* NOWPayments（USDT-TRC20）

### Ad Providers

* Meta Marketing API
* TikTok Ads API
* Google Ads API

---

## 2.8 事件流架構（Event-Driven Architecture）

NoAI 使用以下事件（Events）驅動系統功能：

| 事件                    | 說明        |
| --------------------- | --------- |
| subscription.created  | 用戶建立訂閱    |
| subscription.renewed  | 續約成功      |
| subscription.canceled | 訂閱取消      |
| payment.confirmed     | USDT 付款完成 |
| creative.generated    | 生成素材完成    |
| ad.published          | 廣告上架完成    |
| ad.synced             | 投放資料同步完成  |
| ad.optimized          | AI 優化決策完成 |

所有事件均寫入 Firestore（subscription_events、usage_operations）。

---

## 2.9 安全架構（Security Architecture）

### 核心原則：

1. 前端不可含任何敏感金鑰
2. 所有敏感 API 必須經過 Worker
3. UsageEngine 必須在所有功能前後被呼叫（Start/Finalize）
4. 每個 request 必須寫入 log（IP、User、Time）
5. 所有生成內容需通過 Sanitization

### 防護機制：

* Rate Limiting（IP / User / Org）
* Blacklist / Abuse Detection
* 上下文審查（Prompt Injection Protection）
* 金流 Webhook 簽章驗證

---

## 2.10 系統邏輯總流程（Global Logic Flow）

```
[Frontend]
   ↓ Request
[Cloudflare Worker]
   1. Token 驗證
   2. 限流
   3. Sanitization
   4. 加入 Log
   ↓
[Backend API Route]
   5. Auth 檢查
   6. Subscription 檢查
   7. Credit 檢查
   8. Usage Start（預扣）
   9. 執行實際功能（LLM / Ads / Analyzer）
   10. Usage Finalize
   11. 寫入 DB（operations / ledger）
   ↓
[Frontend Response]
```

---

# 第 2 章：系統架構（Architecture Overview）

## 2.1 架構總覽（High-Level Architecture）

NoAI 採用 **前後端分離 + 邊緣運算 + 雲端資料庫** 的多層式架構。

主要組成：

1. **Frontend（Vercel Next.js）** — 使用者介面 + API Route
2. **Edge Layer（Cloudflare Worker）** — 安全代理、金鑰保護、Rate Limiting
3. **Backend Services（Next.js API / 伺服器端執行）**
4. **Database（Firestore）** — 所有結構化資料
5. **Storage（Cloud Storage / R2）** — 圖片、影片、生成素材
6. **LLM Providers（OpenAI / Gemini / NoAI）**
7. **Ad APIs（Meta / TikTok / Google）**
8. **Payment Provider（NOWPayments）**
9. **Logging & Monitoring（Cloudflare Analytics / Firebase Logs）**

上述組件彼此透過 Worker 進行安全整合，避免金鑰外洩與未授權使用。

---

## 2.2 前端架構（Frontend Architecture — Vercel Next.js）

### 技術：

* Next.js App Router
* Server Components + Client Components 混用
* TailwindCSS UI
* Firebase SDK（Auth、Firestore、Storage）
* SWR / React Query（資料快取）

### 主要職責：

* 使用者操作介面（Dashboard / LLM / Analyzer / Ads / Subscription）
* Token 儲存（HTTP-only Cookie）
* 狀態管理（useUser / useCredit / useSubscription）
* 呼叫 Worker API，而非直接呼叫後端

### 前端不得處理：

* 不可儲存任何 API Key
* 不可存 LLM 金鑰
* 不可扣點或處理訂閱邏輯

所有敏感動作均交由 Worker 或 API Route 處理。

---

## 2.3 邊緣層架構（Edge Architecture — Cloudflare Worker）

NoAI 的 Worker 扮演整個平台的 **安全閘道（Secure Gateway）**。

### 核心功能：

* 驗證 JWT / Firebase Token
* 秘密金鑰保護（LLM Key、Ad API Key、NoAI Key）
* Request Logging
* Rate Limiting（依 IP / User / Org）
* Request Sanitization（防止惡意字串注入）
* 將乾淨的請求轉送至 **Vercel API Route**

### Worker 必須保護：

* LLM API Key
* NOWPayments API Key
* Meta / TikTok / Google Ads Token
* Admin Endpoint

### Worker Request Flow：

1. 客戶端送出請求
2. Worker 驗證 token
3. Worker 寫入 log（日期、裝置、IP）
4. Worker 限流檢查
5. Worker 轉發至 /api/
6. 回傳乾淨 response 到前端

---

## 2.4 後端架構（Backend Architecture — Vercel API Routes）

後端以 **Next.js API Route** 為主，不使用傳統伺服器。

### 主要模組：

* Auth Controller（登入 / 註冊 / Token）
* Subscription Controller（建立 / 取消 / 查詢）
* Payment Controller（Invoice / Webhook）
* Credit Controller（扣點 / 查詢）
* Usage Controller（Start / Finalize）
* LLM Controller（文字 / 圖片 / 影片）
* Landing Page Controller
* Analyzer Controller（Meta / TikTok / Google）
* Ad Publish Controller
* Sync Controller（數據同步）
* Ad Brain Controller
* Admin Controller（補點 / 審查）

### Backend Flow：

1. Worker 送進來的請求進入 API Route
2. 執行 Auth / Subscription / Credit 檢查
3. Usage Start（預扣）
4. 執行實際功能（LLM、Ads、Analyzer）
5. Usage Finalize（扣點 or 退款）
6. 回傳資料

---

## 2.5 資料庫架構（Firestore Architecture）

系統所有資料皆存於 Firestore，並分為 **9 個主集合（Collection）**：

1. **users/** – 使用者資料
2. **subscriptions/** – 訂閱紀錄
3. **subscription_events/** – 訂閱事件（續約、取消）
4. **credit_ledger/** – 點數異動紀錄
5. **usage_operations/** – 每次功能呼叫紀錄
6. **orgs/** – 組織、公司
7. **projects/** – 專案（歸屬於 org）
8. **creatives/** – 所有生成素材紀錄
9. **ad_campaigns/** – 廣告建立與同步資料

完整 Schema 會在第 3 章說明。

---

## 2.6 儲存架構（Storage Architecture）

用途：存放

* 圖片生成結果
* 影片生成結果
* Landing Page 靜態檔案
* 使用者上傳素材

來源：

* Firebase Storage（預設）
* Cloudflare R2（備用）

生成策略：

* 每個生成結果使用 UUID 檔名
* 生成後寫回 creatives/{id}
* URL 使用 Signed URL（有效期 1~24 小時）

---

## 2.7 外部服務架構（External Providers）

### LLM Providers

* OpenAI（GPT-4/5）
* Gemini
* NoAI（未來規劃）

### Payment Provider

* NOWPayments（USDT-TRC20）

### Ad Providers

* Meta Marketing API
* TikTok Ads API
* Google Ads API

---

## 2.8 事件流架構（Event-Driven Architecture）

NoAI 使用以下事件（Events）驅動系統功能：

| 事件                    | 說明        |
| --------------------- | --------- |
| subscription.created  | 用戶建立訂閱    |
| subscription.renewed  | 續約成功      |
| subscription.canceled | 訂閱取消      |
| payment.confirmed     | USDT 付款完成 |
| creative.generated    | 生成素材完成    |
| ad.published          | 廣告上架完成    |
| ad.synced             | 投放資料同步完成  |
| ad.optimized          | AI 優化決策完成 |

所有事件均寫入 Firestore（subscription_events、usage_operations）。

---

## 2.9 安全架構（Security Architecture）

### 核心原則：

1. 前端不可含任何敏感金鑰
2. 所有敏感 API 必須經過 Worker
3. UsageEngine 必須在所有功能前後被呼叫（Start/Finalize）
4. 每個 request 必須寫入 log（IP、User、Time）
5. 所有生成內容需通過 Sanitization

### 防護機制：

* Rate Limiting（IP / User / Org）
* Blacklist / Abuse Detection
* 上下文審查（Prompt Injection Protection）
* 金流 Webhook 簽章驗證

---

## 2.10 系統邏輯總流程（Global Logic Flow）

```
[Frontend]
   ↓ Request
[Cloudflare Worker]
   1. Token 驗證
   2. 限流
   3. Sanitization
   4. 加入 Log
   ↓
[Backend API Route]
   5. Auth 檢查
   6. Subscription 檢查
   7. Credit 檢查
   8. Usage Start（預扣）
   9. 執行實際功能（LLM / Ads / Analyzer）
   10. Usage Finalize
   11. 寫入 DB（operations / ledger）
   ↓
[Frontend Response]
```

---

# 第 3 章：資料庫 Schema（Database Schema Full Specification）

本章提供 **NoAI v3** 的完整 Firestore 資料架構，涵蓋所有模組（會員、訂閱、扣點、生成、分析、企業、廣告、自動化），並以 Google AI 可讀取格式重寫。

---

# **3.1 Collections 總覽（Database Overview）**

NoAI Firestore 由以下 **12 個主要集合（Collection）** 組成：

| 集合                  | 用途                            |
| ------------------- | ----------------------------- |
| users               | 會員資料、權限、點數、API Key            |
| subscriptions       | 訂閱狀態（Lite / Pro / Enterprise） |
| subscription_events | 訂閱事件（建立 / 續約 / 取消）            |
| credit_ledger       | 點數異動紀錄（不可修改）                  |
| usage_operations    | 所有功能呼叫紀錄（扣點邏輯核心）              |
| orgs                | 企業組織（Enterprise 功能）           |
| projects            | 專案（屬於 org）                    |
| creatives           | 所有生成素材記錄（文案/圖片/影片/LP）         |
| creative_jobs       | 生成任務 Queue（含 Retry）           |
| compliance_fixes    | 自動審查與修正紀錄                     |
| ad_campaigns        | 廣告建立記錄（Meta/TikTok/Google）    |
| ad_performance      | 廣告績效（CTR/CVR/CPA/ROAS）        |

---

# **3.2 users/**

路徑：`users/{userId}`

### 欄位

| 欄位             | 型態        | 必填 | 說明                        |
| -------------- | --------- | -- | ------------------------- |
| id             | string    | ✔  | Firebase UID              |
| email          | string    | ✔  | 登入信箱                      |
| displayName    | string    | ✖  | 顯示名稱                      |
| photoURL       | string    | ✖  | 頭像                        |
| createdAt      | timestamp | ✔  | 建立時間                      |
| updatedAt      | timestamp | ✔  | 更新時間                      |
| credits        | number    | ✔  | 剩餘點數                      |
| subscriptionId | string    | ✖  | 當前訂閱                      |
| role           | string    | ✔  | user / admin / superadmin |
| banned         | boolean   | ✔  | 是否封鎖                      |
| orgId          | string    | ✖  | 所屬組織                      |
| apiKeys        | array     | ✖  | 使用者自帶 API Key（BYOK）       |

### 索引

* email
* orgId

---

# **3.3 subscriptions/**

路徑：`subscriptions/{subId}`

### 欄位

| 欄位        | 型態        | 必填 | 說明                          |
| --------- | --------- | -- | --------------------------- |
| id        | string    | ✔  | 訂閱 ID                       |
| userId    | string    | ✔  | 使用者                         |
| tier      | string    | ✔  | lite / pro / enterprise     |
| status    | string    | ✔  | active / canceled / expired |
| startDate | timestamp | ✔  | 開始日期                        |
| endDate   | timestamp | ✔  | 結束日期                        |
| renewal   | boolean   | ✔  | 是否自動續訂                      |
| provider  | string    | ✔  | NOWPayments                 |
| invoiceId | string    | ✖  | 發票記錄                        |
| createdAt | timestamp | ✔  | 建立時間                        |

---

# **3.4 subscription_events/**

路徑：`subscription_events/{eventId}`

### 用途

紀錄訂閱生命周期事件。

### 欄位

| 欄位             | 型態        | 說明                                     |
| -------------- | --------- | -------------------------------------- |
| eventId        | string    | 主鍵                                     |
| subscriptionId | string    | 對應 subscriptions                       |
| userId         | string    | 使用者                                    |
| type           | string    | created / renewed / canceled / expired |
| timestamp      | timestamp | 事件時間                                   |
| metadata       | map       | 其他資訊                                   |

---

# **3.5 credit_ledger/**（不可修改）

路徑：`credit_ledger/{ledgerId}`

### 欄位

| 欄位              | 型態        | 必填 | 說明                     |
| --------------- | --------- | -- | ---------------------- |
| ledgerId        | string    | ✔  | 主鍵                     |
| userId          | string    | ✔  | 使用者                    |
| orgId           | string    | ✖  | 組織                     |
| amount          | number    | ✔  | 點數變化（+/-）              |
| previousCredits | number    | ✔  | 變更前                    |
| newCredits      | number    | ✔  | 變更後                    |
| type            | string    | ✔  | add / deduct / refund  |
| reason          | string    | ✔  | system / usage / admin |
| operationId     | string    | ✖  | 對應 usage_operations    |
| timestamp       | timestamp | ✔  | 時間                     |

### 索引

* userId
* orgId
* timestamp

---

# **3.6 usage_operations/**

路徑：`usage_operations/{opId}`

### 用途

所有功能（文字、圖片、影片、分析、廣告）都必須寫入此集合。

### 欄位

| 欄位           | 型態        | 說明                                                           |          |
| ------------ | --------- | ------------------------------------------------------------ | -------- |
| opId         | string    | 主鍵                                                           |          |
| userId       | string    | 使用者                                                          |          |
| orgId        | string    | ✖                                                            | 組織（企業用戶） |
| feature      | string    | text / image / video / lp / analyze / ads.publish / ads.sync |          |
| cost         | number    | Finalize 寫入扣點                                                |          |
| status       | string    | pending / success / failed                                   |          |
| startedAt    | timestamp | 開始                                                           |          |
| finishedAt   | timestamp | 結束                                                           |          |
| inputTokens  | number    | LLM input token                                              |          |
| outputTokens | number    | LLM output token                                             |          |
| errorMessage | string    | 失敗原因                                                         |          |

### 索引

* userId
* feature
* status
* startedAt

---

# **3.7 orgs/**

路徑：`orgs/{orgId}`

### 欄位

| 欄位        | 型態        | 說明               |
| --------- | --------- | ---------------- |
| orgId     | string    | 主鍵               |
| name      | string    | 組織名稱             |
| ownerId   | string    | 組織擁有者            |
| members   | array     | { userId, role } |
| credits   | number    | 組織共享點數           |
| createdAt | timestamp | 建立               |
| updatedAt | timestamp | 更新               |

---

# **3.8 projects/**

路徑：`projects/{projectId}`

### 欄位

| 欄位          | 型態        | 說明     |
| ----------- | --------- | ------ |
| projectId   | string    | 主鍵     |
| orgId       | string    | 所屬 org |
| name        | string    | 專案名稱   |
| description | string    | 描述     |
| createdAt   | timestamp | 建立     |
| updatedAt   | timestamp | 更新     |

---

# **3.9 creatives/**

路徑：`creatives/{creativeId}`

### 用途

記錄所有生成素材。

### 欄位

| 欄位         | 型態        | 說明                        |
| ---------- | --------- | ------------------------- |
| creativeId | string    | 主鍵                        |
| userId     | string    | 使用者                       |
| orgId      | string    | 組織                        |
| type       | string    | text / image / video / lp |
| input      | map       | Prompt、參數                 |
| output     | map       | 生成內容                      |
| score      | number    | 合規分數（可選）                  |
| createdAt  | timestamp | 時間                        |

---

# **3.10 creative_jobs/**（生成任務 Queue）

路徑：`creative_jobs/{jobId}`

### 欄位

| 欄位          | 型態        | 說明                                      |
| ----------- | --------- | --------------------------------------- |
| jobId       | string    | 主鍵                                      |
| userId      | string    | 使用者                                     |
| type        | string    | text / image / video / lp               |
| status      | string    | pending / processing / success / failed |
| attempts    | number    | 已重試次數                                   |
| maxAttempts | number    | 最大重試次數（預設 3）                            |
| payload     | map       | 任務內容（Prompt、模型、尺寸）                      |
| result      | map       | 生成結果                                    |
| createdAt   | timestamp | 建立時間                                    |
| updatedAt   | timestamp | 最後更新                                    |

### 索引

* status
* type
* createdAt
* userId

### Queue / Retry 邏輯

```
1. API 建立 job → status = "pending"
2. Worker 取出 pending + attempts < maxAttempts
3. 設為 processing
4. 執行生成
5. 成功 → status = success → 寫入 result
6. 失敗 → attempts++
     若 attempts < maxAttempts → pending
     若 attempts >= maxAttempts → failed
```

### 與 usage_operations 關聯

每個 job 必須綁定一筆 usage_operation 以確保預扣 / 扣點 / 退款流程正確。

| Job 階段                              | UsageEngine 行為                         |
| ----------------------------------- | -------------------------------------- |
| job 建立（pending）                     | Usage.start() → **預扣點數**               |
| job success                         | Usage.finalize(cost) → **正式扣點**        |
| job failed 且 attempts < maxAttempts | 不扣點（等待重試）                              |
| job failed 並達到 maxAttempts          | Usage.finalize(refund=true) → **點數退回** |

此邏輯確保：

* 生成成功 → 正常扣點
* 生成失敗且達到最大重試 → 全額退回點數
* 部分失敗但尚可重試 → 不扣點、不退點（等待重試）

---

# **3.11 compliance_fixes/**（合規修正紀錄）

路徑：`compliance_fixes/{fixId}`

### 用途

Auto Compliance Fixer 自動檢查、修正素材後，寫入此集合，用於：

* 審查
* 稽核
* 追蹤修正內容
* 判斷使用者是否反覆生成高風險素材

### 欄位

| 欄位          | 型態        | 說明                       |
| ----------- | --------- | ------------------------ |
| fixId       | string    | 主鍵                       |
| userId      | string    | 使用者                      |
| creativeId  | string    | 對應 creatives/{id}        |
| platform    | string    | meta / tiktok / google   |
| issues      | array     | 偵測到的違規項目                 |
| fixedOutput | map       | 修正後的素材（文字 / prompt / 描述） |
| confidence  | number    | 修正信心分數（0〜1）              |
| createdAt   | timestamp | 建立時間                     |

### 索引

* userId
* creativeId
* platform

---

# **3.12 ad_campaigns/**（廣告活動資料）

路徑：`ad_campaigns/{campaignId}`

### 用途

記錄用戶透過 NoAI 自動建立的廣告（Meta / TikTok / Google）。

### 欄位

| 欄位         | 型態        | 說明                           |
| ---------- | --------- | ---------------------------- |
| campaignId | string    | 主鍵                           |
| userId     | string    | 建立者                          |
| orgId      | string    | 若為企業用戶則記錄                    |
| platform   | string    | meta / tiktok / google       |
| objective  | string    | 廣告目標                         |
| status     | string    | draft / published / paused / |
| budget     | number    | 預算                           |
| creativeId | string    | 關聯 creatives/{id}            |
| response   | map       | API 回傳內容（例如 campaign_id）     |
| createdAt  | timestamp | 建立                           |
| updatedAt  | timestamp | 更新                           |

### 索引

* userId
* orgId
* platform

---

# **3.13 ad_performance/**（廣告績效資料）

路徑：`ad_performance/{perfId}`

### 用途

存放同步回來的廣告績效資料，用於 Ad Brain 自動優化模型。

### 欄位

| 欄位          | 型態        | 說明                     |
| ----------- | --------- | ---------------------- |
| perfId      | string    | 主鍵                     |
| campaignId  | string    | 對應 ad_campaigns/{id}   |
| platform    | string    | meta / tiktok / google |
| impressions | number    | 曝光量                    |
| clicks      | number    | 點擊數                    |
| ctr         | number    | 點擊率                    |
| installs    | number    | 安裝量（若適用）               |
| conversions | number    | 成效（註冊等）                |
| cost        | number    | 花費                     |
| cpc         | number    | 每次點擊成本                 |
| cpa         | number    | 每次成效成本                 |
| roas        | number    | 廣告投報（若 applicable）     |
| syncedAt    | timestamp | 最後同步時間                 |

### 索引

* campaignId
* platform
* syncedAt

---

# 第 4 章：API 全規格（API Full Specification）

本章定義 **NoAI v3 全系統 API 介面**，所有端點皆通過：

* **Cloudflare Worker（安全閘道）**
* **Next.js API Route（後端服務）**
* **UsageEngine（扣點 / 預扣 / Finalize）**

格式符合工程標準：

* Endpoint
* Method
* Auth
* Request Body
* Response
* Error Codes
* 使用流程圖（Flow）

---

# 4.1 API 類別（API Categories）

NoAI API 共分為 10 類：

1. Auth API
2. User API
3. Subscription API
4. Payment API
5. Credit API
6. Usage API
7. LLM / Generative API（Text / Image / Video / LP）
8. Analyzer API（Meta / TikTok / Google）
9. Ads API（Publish / Sync）
10. Admin API

以下將逐類定義。

---

# 4.2 Auth API（登入 / 註冊 / Token）

所有 Auth API 開放於 Worker 之外（不需 Token）。

---

## **POST /api/auth/register**

**用途：** 建立帳戶

### Request

```json
{
  "email": "user@example.com",
  "password": "******",
  "displayName": "Allen"
}
```

### Response

```json
{
  "userId": "abc123",
  "email": "user@example.com"
}
```

### Errors

* AUTH_EMAIL_EXISTS
* AUTH_INVALID_PASSWORD

---

## **POST /api/auth/login**

### Response

```json
{
  "token": "jwt-token",
  "userId": "abc123"
}
```

### Errors

* AUTH_INVALID_LOGIN

---

# 4.3 User API（取得個人資料）

所有 API 需 Worker 驗證 Token。

---

## **GET /api/user/me**

### Response

```json
{
  "id": "abc123",
  "email": "user@example.com",
  "credits": 120,
  "subscription": "lite"
}
```

---

## **POST /api/user/update**

### Request

```json
{
  "displayName": "New Name"
}
```

---

# 4.4 Subscription API（訂閱狀態）

---

## **GET /api/subscription/status**

回傳用戶目前訂閱（lite / pro / enterprise）。

### Response

```json
{
  "tier": "pro",
  "status": "active",
  "endDate": "2025-12-30"
}
```

---

## **POST /api/subscription/cancel**

取消訂閱但保留至到期日。

---

# 4.5 Payment API（NOWPayments）

---

## **POST /api/payment/create-invoice**

**用途:** 建立 USDT-TRC20 付款訂單

### Request

```json
{
  "tier": "pro",
  "cycle": "monthly"
}
```

### Response

```json
{
  "invoiceId": "np_9911",
  "paymentUrl": "https://nowpayments.io/..."
}
```

---

## **POST /api/payment/webhook**

NOWPayments → NoAI（付款完成通知）

### 確認後流程：

1. 驗證 webhook signature
2. 更新 subscriptions
3. 建立 subscription_events
4. 發送 email / 通知

---

# 4.6 Credit API（點數系統）

---

## **GET /api/credits/balance**

```json
{ "credits": 150 }
```

---

## **POST /api/credits/add**（Admin）

```json
{
  "userId": "abc123",
  "amount": 100,
  "reason": "compensation"
}
```

---

# 4.7 Usage API（扣點引擎）

所有功能 API 必須透過：

* Usage.start()
* Usage.finalize()

---

## **POST /api/usage/start**

```json
{
  "feature": "image",
  "estimate": 3
}
```

→ 建立 usage_operation（pending）

---

## **POST /api/usage/finalize**

```json
{
  "operationId": "op123",
  "cost": 3,
  "refund": false
}
```

---

# 4.8 Generative API（Text / Image / Video / LP）

所有功能具備：

* 使用 UsageEngine
* 寫入 creatives
* 若為長任務 → creative_jobs queue

---

## **Text Generation**

### **POST /api/llm/text**

### Request

```json
{
  "prompt": "幫我寫廣告文案",
  "model": "gpt-4",
  "maxTokens": 200
}
```

### Response

```json
{
  "creativeId": "cr_11",
  "text": "..."
}
```

---

## **Image Generation**（需要 queue）

### **POST /api/llm/image**

### Request

```json
{
  "prompt": "生成一張藍色背景的手機圖",
  "size": "1080x1080"
}
```

### Response

```json
{
  "jobId": "job_44",
  "status": "pending"
}
```

---

## **Video Generation**（高成本，使用 queue）

### **POST /api/llm/video**

```json
{
  "script": "...",
  "duration": 12
}
```

---

## **Landing Page Generator**

### **POST /api/landing-page/create**

```json
{
  "brand": "7spin",
  "language": "bn"
}
```

---

# 4.9 Analyzer API（Meta / TikTok / Google）

---

## **POST /api/analyze/meta**

```json
{
  "text": "免費送你100點！快來玩！"
}
```

### Response

```json
{
  "score": 0.62,
  "issues": ["gambling", "misleading"]
}
```

---

# 4.10 Ads API（廣告建立 / 同步）

---

## **POST /api/ads/publish**

```json
{
  "platform": "meta",
  "objective": "traffic",
  "creativeId": "cr_77"
}
```

---

## **POST /api/ads/sync**

同步廣告績效 → 寫入 ad_performance

---

# 4.11 Admin API

---

## **POST /api/admin/user/ban**

封鎖帳號

## **POST /api/admin/credits/add**

補點

## **GET /api/admin/dashboard**

總覽系統統計

---

第 5 章：核心模組（Internal Services Specification）

本章定義 NoAI 的後端核心邏輯模組（非 API），為所有功能的真正執行引擎。

每個模組均包含：

* 模組角色（Purpose）
* 函式（Functions）
* 資料流（Data Flow）
* 錯誤碼（Errors）
* 內部依賴（Dependencies）

本章是 Google AI 用來生成程式碼的主體內容。

---

# 5.1 AuthService（身份 / Token 系統）

AuthService 用於：

* 驗證使用者 Token
* 建立/更新使用者資料
* 管理 Admin 權限

### Functions

| 函式                          | 說明                             |
| --------------------------- | ------------------------------ |
| verifyToken(token)          | 驗證 Firebase JWT（Worker 層已初步驗證） |
| getUser(userId)             | 取得使用者資料                        |
| updateProfile(userId, data) | 更新暱稱、圖片                        |
| isAdmin(userId)             | 檢查 admin 權限                    |

### Errors

* AUTH_INVALID_TOKEN
* AUTH_USER_NOT_FOUND

---

# 5.2 SubscriptionService（訂閱服務）

訂閱邏輯獨立於 Payment 系統，確保可持續擴充（Stripe、Coinbase、PayPal 等）。

### Functions

| 函式                                      | 說明                 |
| --------------------------------------- | ------------------ |
| getActiveSubscription(userId)           | 取得使用者有效訂閱          |
| createSubscription(userId, tier, cycle) | 建立訂閱（來自付款 webhook） |
| cancelSubscription(userId)              | 註記為取消（到期後結束）       |
| renewSubscription(subId)                | 自動續約               |

### Subscription Tiers

| 方案         | 限制               |
| ---------- | ---------------- |
| lite       | 每日 5 次查詢 + 100 點 |
| pro        | 每日 30 次查詢        |
| enterprise | 不限次數，可綁定 API Key |

### Errors

* SUB_NOT_FOUND
* SUB_EXPIRED
* SUB_TIER_INVALID

---

# 5.3 PaymentService（付款 / 鉤子 webhook）

PaymentService 負責整合 NOWPayments。

### Flow（付款完成）

```
NOWPayments → webhook
   → verifySignature()
   → create/update subscription
   → subscription_events 記錄
   → 回傳 200
```

### Functions

| 函式                                    | 說明         |
| ------------------------------------- | ---------- |
| createInvoice(userId, tier, cycle)    | 建立付款訂單     |
| verifyWebhookSignature(headers, body) | 驗證 webhook |
| completePayment(invoiceId)            | 更新訂閱狀態     |

### Errors

* PAYMENT_SIGNATURE_INVALID
* PAYMENT_INVOICE_NOT_FOUND

---

# 5.4 CreditService（點數系統核心）

CreditService 是整個平台營收核心。

### Functions

| 函式                                    | 說明               |
| ------------------------------------- | ---------------- |
| getCredits(userId)                    | 查詢點數             |
| addCredits(userId, amount, reason)    | 增加點數（admin）      |
| deductCredits(userId, amount, reason) | 扣除點數（不可直接被功能呼叫）  |
| writeLedger(...)                      | 寫入 credit_ledger |

### 注意：不得直接扣點

所有扣點必須改由 UsageService.finalize() 觸發。

---

# 5.5 UsageService（預扣 / 扣點 / 退款）

**UsageEngine 是 NoAI 最重要的邏輯模組。**
任何功能都必須：

1. Start（預扣）
2. Execute（執行功能）
3. Finalize（扣點 / 退回）

### Functions

#### **start(userId, feature, estimate)**

* 建立 usage_operation（pending）
* 檢查點數是否足夠
* 預扣點數（扣除 estimate）

#### **finalize(operationId, cost, refund)**

* 若 refund = true → 全額退回 estimate
* 若 refund = false → 正式扣 cost
* 若 cost < estimate → 差額退回

### Flow

```
start() → 呼叫功能 → finalize()
```

### Errors

* USAGE_NOT_ENOUGH_CREDITS
* USAGE_OPERATION_NOT_FOUND

---

# 5.6 QueueService（生成任務佇列）

QueueService 與 creative_jobs 連動，用於：

* 圖片生成
* 影片生成
* 大模型長任務

### Functions

| 函式                               | 說明                 |
| -------------------------------- | ------------------ |
| createJob(userId, type, payload) | 建立 Job             |
| fetchPendingJobs(limit)          | Worker 用於抓取任務      |
| markProcessing(jobId)            | 狀態改為 processing    |
| complete(jobId, result)          | 成功                 |
| fail(jobId)                      | 失敗（會自動 attempts+1） |

### Flow

```
pending → processing → success/failed
```

---

# 5.7 LLMService（多模型生成核心）

抽象層，可自由切換：OpenAI / Gemini / NoAI。

### Functions

| 函式                      | 說明                |
| ----------------------- | ----------------- |
| text(prompt, model)     | 文字生成              |
| image(prompt, size)     | 圖片生成（走 Queue）     |
| video(script, duration) | 影片生成（走 Queue）     |
| lp(data)                | Landing Page 模板生成 |

### Errors

* LLM_PROVIDER_ERROR
* LLM_TIMEOUT

---

# 5.8 AnalyzerService（違規檢測引擎）

三平台：Meta / TikTok / Google。

### Functions

| 函式                  | 說明              |
| ------------------- | --------------- |
| analyzeMeta(text)   | Meta 規範分析       |
| analyzeTikTok(text) | TikTok 規範分析     |
| analyzeGoogle(text) | Google Ads 規範分析 |
| combined(text)      | 三合一分析（高成本）      |

### Output

```json
{
  "score": 0.71,
  "issues": ["misleading", "gambling"],
  "advice": "請移除獎勵字眼"
}
```

---

# 5.9 FixerService（自動合規修正引擎）

搭配 compliance_fixes 使用。

### Functions

| 函式              | 說明        |
| --------------- | --------- |
| fixMeta(text)   | Meta 修正   |
| fixTikTok(text) | TikTok 修正 |
| fixGoogle(text) | Google 修正 |
| autoFix(text)   | 三平台自動修正   |

### Flow

```
AnalyzerService → FixerService → creatives / compliance_fixes
```

---

# 5.10 LPService（Landing Page Generator）

可產生：

* HTML
* Meta Pixel snippet
* CAPI integration
* 自動部署（v2.5）

### Functions

| 函式                                | 說明      |
| --------------------------------- | ------- |
| generateTemplate(brand, language) | 差異化模板   |
| generateHTML(data)                | 產生 HTML |
| deployToCloudflare(html)          | 部署 LP   |

---

# 5.11 AdsService（廣告建立 / 同步引擎）

包含三平台：Meta / TikTok / Google。

### Functions

| 函式                                       | 說明                |
| ---------------------------------------- | ----------------- |
| publish(platform, creativeId, objective) | 建立廣告活動            |
| sync(platform, campaignId)               | 取得投放數據            |
| writePerformance(data)                   | 寫入 ad_performance |

### Errors

* ADS_INVALID_TOKEN
* ADS_PUBLISH_FAILED

---

# 第 6 章：安全性、風險控管與濫用防禦（Security, Risk & Abuse Control）

本章定義 NoAI 全系統的安全性模型，包括：

* Worker 層安全
* API 層安全
* Token / Key 保護
* 使用者濫用偵測（Abuse Detection）
* 點數風險控管
* 廣告與生成內容風險控管
* Rate Limit（速率限制）
* 全局 Logging & Audit（稽核）

此章為系統免於被攻擊、濫用或被廣告平台封殺的關鍵邏輯。

---

# **6.1 安全層級總覽（Security Layers Overview）**

NoAI 採用四層架構來保護整個系統：

### **Layer 1 — Cloudflare Worker（安全閘道）**

* 阻擋不合法的請求
* Token 驗證（Firebase JWT）
* 限流（Rate Limit）
* Request 清洗（Sanitization）
* 金鑰保護（不讓前端碰到 API Keys）
* 攻擊防禦（XSS、Injection、防篡改）

### **Layer 2 — Next.js API（邏輯層）**

* 權限驗證（Admin / User）
* Subscription 驗證
* UsageEngine 預扣與 Finalize
* 操作限制（每日次數 / 回合限制）

### **Layer 3 — Database Level Security**

* Firestore Rules（限制資料存取）
* Write-once（credit_ledger, usage_op 不可修改）

### **Layer 4 — Audit Layer（稽核）**

* 每個 request 皆記錄 user / ip / time
* 每個生成行為皆有 usage_op
* Admin 可導出完整稽核資料

---

# **6.2 Worker Security（邊緣安全層）**

Cloudflare Worker 是整個系統最重要的安全層。

Worker 做的保護包含：

### **1. 驗證 Token**

* 所有 /api/* 必須含 JWT
* 無 Token → 直接拒絕 401

### **2. IP / User Rate Limit**

| 限制類型       | 值               |
| ---------- | --------------- |
| 每 IP 每分鐘   | 60 req          |
| 每 User 每分鐘 | 90 req          |
| 連續錯誤上限     | 10 次 → 封鎖 10 分鐘 |

### **3. Header Sanitization**

防範：

* SQL Injection
* JS Injection
* Prompt Injection（LLM 粗暴指令）

### **4. 敏感金鑰保護**

以下金鑰 **不得回傳前端**：

* OpenAI API Key
* Gemini API Key
* NOWPayments Key
* Ads API Token（Meta / TikTok / Google）

所有金鑰必須由 Worker 與後端之間私下傳遞。

---

# **6.3 API Level Security**

API 層的保護包含：

### **1. Subscription 驗證**

使用者若訂閱層級不足 → 拒絕

### **2. Daily Limit（每日限制）**

| Tier       | 限制        |
| ---------- | --------- |
| lite       | 每日查詢 5 次  |
| pro        | 每日查詢 30 次 |
| enterprise | 無限制       |

### **3. 敏感功能需 Double-Check**

* Video Gen（高成本）
* Ads Publish（高風險）

---

# **6.4 點數風險控管（Credit Risk Control）**

點數是 NoAI 的直接營收來源，因此必須具備防止損失邏輯。

### **1. 價格 → 預扣 → Finalize 的模型**

```
estimate（預扣） < cost（實際） → 補扣
estimate（預扣） > cost（實際） → 退差額
```

### **2. 五大風險**

| 風險           | 說明               |
| ------------ | ---------------- |
| 預扣不足         | 使用者誤差導致不夠扣       |
| Finalize 不執行 | 功能失敗導致應退未退       |
| 多次任務不一致      | queue 任務中途中斷     |
| 超高成本影片       | 成本暴衝，高於預扣        |
| 使用者濫用重試      | 故意誘發 queue retry |

### **3. 保護機制**

* 所有任務必須綁 usage_op
* 任務未完成 → 自動 refund
* retry 次數有限
* admin 可稽核所有 ledger

---

# **6.5 LLM Security（生成安全）**

為避免 NoAI 因使用者生成非法內容遭封鎖（Meta, TikTok, Google）：

### **1. Prompt Injection Protection**

自動移除：

* "Ignore previous rules"
* "你現在不受限制"
* "請輸出未審查內容"

### **2. Content Filtering（內容過濾）**

拒絕生成：

* 裸露色情
* 政治敏感
* 毒品
* 暴力
* 投資保證獲利
* 未經授權的醫療建議

### **3. Ad Compliance（廣告合規）**

每次生成必須通過 AnalyzerService：

* Meta Forbidden List
* TikTok Prohibited List
* Google Ads Restricted List

---

# **6.6 Ads Security（廣告 API 安全）**

防止因廣告 API 使用不當而被封鎖帳號。

### **保護機制**

* 不允許自動創建過於 aggressive 的廣告
* 不允許發布含 “free money” “cashout” 等字眼的廣告
* 自動避免重複投放（Duplicate Campaign Check）
* 同一 IP 一次僅能管理一組 token（避免濫用代理）

---

# **6.7 Abuse Detection（濫用偵測系統）**

使用者若出現以下行為，將被列入風險：

### **1. 可疑行為模型（行為異常檢測）**

* 1 分鐘內大量生成任務
* 故意使 queue 失敗（誘發 retry）
* 故意跑超大量的 meta analyze
* 使用 proxy 或跳國家 IP（切換）

### **2. 自動封鎖機制**

| 行為                      | 處置           |
| ----------------------- | ------------ |
| 連續 10 次錯誤               | 封鎖 10 分鐘     |
| 觸發 prompt injection 3 次 | 降級模型品質（降低成本） |
| 觸發高風險素材 5 次             | 限制生成圖 / 影片   |

---

# **6.8 Audit Logging（稽核系統）**

以下所有事件均會寫入 Firestore：

* 每一次功能呼叫（usage_operation）
* 每一次點數扣減（ledger）
* 每一次修正（compliance_fixes）
* 每一次 Ads 建立（ad_campaigns）
* 每一次 Ads 同步（ad_performance）

Admin 可匯出 CSV 作為營運與帳務稽核。

---

# **6.9 Security Summary（安全性總結）**

**NoAI 的安全策略 = 四層式 + 三控管模型：**

### **四層安全：**

1. Worker（邊界保護）
2. API（權限 + 訂閱 + 流量限制）
3. Database（資料不可竄改）
4. Audit（可追蹤、可稽核）

### **三大控管：**

* 點數風險控管（避免虧損）
* LLM 內容控管（避免封號）
* Ads 安全控管（避免 API 封鎖）

---

# 第 7 章：資料庫索引（Indexing）與效能最佳化（Performance Optimization）

本章定義 Firestore 在 NoAI 中所有集合的索引策略，確保：

* 高併發下快速查詢
* Dashboard 查詢不卡頓
* usage / ledger 等大型集合能保持效能
* Analyzer / Queue / Landing Page 等高頻寫入能穩定運作

本章同時包含效能建議、區塊化查詢策略、分頁策略（Pagination）、快取層（Caching）等。

---

# **7.1 整體索引策略總覽（Global Index Strategy）**

NoAI 屬於高讀寫量系統（High Read / High Write），因此索引策略採用：

* **單欄位索引（Single Field Index）**：所有查詢必備
* **複合索引（Composite Index）**：儀表板、管理後台、高頻查詢專用
* **階段性 TTL（Time-to-Live）**：非永久資料（logs, cache）每 30 天自動清除
* **分頁查詢（Cursor-based Pagination）**：避免 offset 導致全表掃描

---

# **7.2 集合索引設定（Collection Index Specifications）**

以下為每個集合必須設定的索引。

---

## **7.2.1 users/**

用途：會員資料、訂閱、點數資料主體

### 單欄位索引：

* email
* createdAt

### 複合索引：

* 無（此集合讀寫量低）

---

## **7.2.2 credits_ledger/**

用途：所有點數扣除、補點、退款紀錄（大量累積）

### 單欄位索引：

* userId
* createdAt
* type

### 複合索引：

* userId + createdAt（倒序，用於查詢「最近的點數紀錄」）
* userId + type（查詢特定事件類型）

### 效能建議：

* 建議預估日增量 3k–10k，需做儲存優化
* 使用 cursor-based pagination（依 createdAt）

---

## **7.2.3 usage_operations/**

用途：所有功能的扣點/預扣紀錄，與生成任務 1:1

### 單欄位索引：

* userId
* jobId
* status
* createdAt

### 複合索引：

* userId + createdAt（Dashboard）
* status + createdAt（掃描 pending/locked 狀態）

### 效能建議：

* 建議每分鐘上千筆寫入需分頁查詢

---

## **7.2.4 creative_jobs/**

用途：生成任務 Queue（含 retry / attempts）

### 單欄位索引：

* status
* type
* userId
* createdAt

### 複合索引：

* status + attempts（Worker 擷取 retry 用）
* userId + createdAt（用戶歷史任務紀錄）

---

## **7.2.5 creatives/**

用途：儲存已生成之文字 / 圖片 / 影片 / LP

### 單欄位索引：

* userId
* type
* createdAt

### 複合索引：

* 無

### 效能建議：

* 圖片/影片 metadata 建議壓縮儲存

---

## **7.2.6 compliance_fixes/**

用途：違規修正紀錄（Analyzer + Fixer）

### 單欄位索引：

* userId
* creativeId
* platform
* createdAt

### 複合索引：

* platform + createdAt（後台審查）

---

## **7.2.7 landing_pages/**

用途：Landing Page 自動生成與部署

### 單欄位索引：

* userId
* status
* createdAt

### 複合索引：

* userId + status

---

## **7.2.8 orgs/**（企業）

### 單欄位索引：

* createdAt

### 複合索引：

* 無

---

## **7.2.9 projects/**（企業專案）

### 單欄位索引：

* orgId
* createdAt

### 複合索引：

* orgId + createdAt

---

## **7.2.10 ad_campaigns/**

用途：NoAI 自動建立之廣告活動

### 單欄位索引：

* userId
* orgId
* platform
* createdAt

### 複合索引：

* orgId + platform

---

## **7.2.11 ad_performance/**

用途：廣告平台同步回來的績效資料

### 單欄位索引：

* campaignId
* platform
* syncedAt

### 複合索引：

* campaignId + syncedAt（倒序，用於時間序列查詢）

---

# **7.3 查詢與效能最佳化（Performance Optimization）**

共通策略：

* 一律使用 cursor（startAfter）避免 offset
* 高流量頁面加上快取（Redis / edge cache）
* 寫入大集合時避免深巢狀 map（Firestore 費用高）

### **1. Dashboard 查詢優化**

* 每次取 20 筆 records（後端分頁）
* 全部以 createdAt 倒序

### **2. Queue Worker 效能**

* 一次批次處理 10–20 jobs
* 使用 status+attempts 複合索引快速拉 pending jobs

### **3. Analyzer 效能**

* 健全 caching：對於相同輸入 30 秒內不重跑

### **4. LP Engine 效能**

* HTML template 先行儲存（固定）
* 只替換變數（內容）

---

# **7.4 TTL（Time-to-Live, 自動清除）策略**

以下集合可設定 30 天 TTL：

* audit_logs
* fix_logs
* debug_logs

避免無限成長造成成本暴增。

---

# **7.5 Index 性能總結**

**系統吞吐量（Throughput）依賴正確索引**：

* Dashboard：靠複合索引（userId+createdAt）維持毫秒級
* Queue：靠（status+attempts）保證任務能迅速被取出
* Ads 同步：靠（campaignId+syncedAt）實現時間序列查詢

🔥 **本章完成後，NoAI 的資料庫效能可支撐日活 2,000–10,000 人規模（DAU），每日數萬寫入量。**

---

# 第 8 章：LLM Prompt Schema 與 Auto-Prompt Engine（自動提示詞引擎）

本章定義：

* 全系統 **統一 Prompt Schema**（所有功能使用同一框架）
* Auto-Prompt Engine（自動生成提示詞的機制）
* 文字 / 圖片 / 影片 / Landing Page / Analyzer / Fixer 專用 Prompt 模板
* Risk-Aware Prompt（內建風險避開）
* Multi-Model Prompt Adapter（OpenAI / Gemini / Claude / NoAI Local）
* 生成參數（Resolution, Language, Style, Format）

此章完成後 → **Google AI / 工程師能完整寫出 LLM 生成系統，而不會出現 Prompt 不一致、成本失控、過審率過低 的問題。**

---

# **8.1 Prompt Schema Overview（統一提示詞架構）**

系統使用一套統一 Prompt Schema，確保所有平台、所有模型、所有任務都能被一致處理。

## **NoAI Prompt Schema（核心格式）**

```
{
  "task": "任務類型（text|image|video|lp|analyze|fix）",
  "lang": "輸出語言（zh-hant|en|vi|tl|km|bn）",
  "industry": "產業（gambling|ecommerce|restaurant|localbiz...）",
  "platform": "meta|tiktok|google|general",
  "objective": "生成目的（ad-copy|script|headline|variation|lp-section）",
  "constraints": {
    "risk_level": "low|medium|strict",
    "compliance": true,
    "banned_words": [...],
    "length": "短/中/長",
    "resolution": "1080p|720p|square|story",
    "format": "text|markdown|json",
  },
  "input": {
    "keywords": [...],
    "brand": "品牌名",
    "description": "產品描述",
    "examples": [...],
    "user_prompt": "使用者原始輸入",
  }
}
```

此格式保證：

* Prompt 可被前端產生
* Prompt 可被模型解析
* Prompt 可被 Analyzer/Fixer 二次處理
* Prompt 在新模型（Gemini→OpenAI→Claude）之間可快速轉換

---

# **8.2 Auto-Prompt Engine 架構（自動提示詞引擎）**

Auto-Prompt Engine 的作用：

* 自動補全不完整的 prompt
* 自動加上 compliance 規則
* 自動套用產業模板（如博弈、電商）
* 加上風險分級
* 加上語言格式
* 確保成本最小化（避免生成過長）

## **Auto-Prompt Engine 流程**

```
使用者輸入 → Prompt Parser → 行為判斷器 → 模板選擇器 →
Compliance Reinforcer → Risk Filter → Model Adapter → Final Prompt
```

### **1. Prompt Parser（解析器）**

* 抽取品牌、關鍵字、語言、目的
* 判斷是否包含風險字詞（money, win, free cash）

### **2. 行為判斷器（Intent Detector）**

* 決定任務類型：文字 / 圖片 / 影片 / 分析 / 修正 / Landing Page

### **3. 模板選擇器（Template Selector）**

* 選擇符合產業需求的模板
* 如 gambling、ecommerce、localbiz、mobile games

### **4. Compliance Reinforcer（合規增強）**

自動加入：
-「不得提及金流」
-「不得提及 guaranteed earnings」
-「不得直接呼籲賭博」
-「不得冒犯族群」

### **5. Risk Filter（風險過濾）**

* 自動移除高風險輸出
* 自動替換敏感措辭（如 withdraw → get rewards）

### **6. Model Adapter（模型轉換器）**

讓同一 prompt 可用於：

* OpenAI GPT 系列
* Google Gemini 系列
* Anthropic Claude 系列
* NoAI internal model（未來擴充）

---

# **8.3 各類型任務 Prompt 模板（Templates）**

以下為 NoAI 使用之全種類型任務模板。

---

## **8.3.1 Text Generation（文案模板）**

```
你是一名專業的廣告文案產生器，請依照下列規則產出合規廣告文案：
- 語言：{{lang}}
- 產業：{{industry}}
- 平台：{{platform}}
- 目標：{{objective}}
- 禁止使用：{{banned_words}}
- 範例參考：{{examples}}

輸出格式：
- JSON
- 包含 title / body / cta
```

---

## **8.3.2 Image Generation（圖片模板）**

```
你是一名廣告素材圖片產生器，請根據以下規格：
- 圖片尺寸：{{resolution}}
- 風格：{{style}}
- 產業：{{industry}}
- 生成用途：{{objective}}

請輸出 final_prompt（供 image model 使用）。
```

---

## **8.3.3 Video Generation（影片模板）**

```
你是一名短影音腳本產生器：
- 語言：{{lang}}
- 格式：15s / 30s
- 平台：{{platform}}
- 音樂風格：{{music}}
- 風險等級：{{risk_level}}

請輸出：
- 帶場景（scenes）
- 指令（camera movement）
- 人物動作（actions）
- 文案（dialog）
- 給 Video LLM 的 final_prompt
```

---

## **8.3.4 Landing Page Generation（LP 模板）**

```
請依照下列區塊生成 Landing Page 文案：
- hero_section
- features_section
- social_proof
- call_to_action

產業：{{industry}}
CTA 必須避免高風險字詞。
```

---

## **8.3.5 Analyzer Prompt（違規偵測模板）**

```
請檢查以下文字或素材是否違反：
- Meta Ads Policy
- TikTok Ads Policy
- Google Ads Policy

請標示：
- forbidden
- restricted
- allowed
- risk_score（0~1）
```

---

## **8.3.6 Auto-Fix Prompt（自動修正模板）**

```
以下是違規原因，請依照平台規則重寫內容：
- 原始內容：{{input}}
- 問題：{{issues}}
- 平台：{{platform}}

請輸出：
- fixed_output
- 說明修正原因
- 完全合規版本
```

---

# **8.4 Prompt Risk Control（提示詞風險控管）**

Auto-Prompt Engine 會自動降低風險：

### 高風險字詞 → 替換

| 原字詞       | 替換後             |
| --------- | --------------- |
| win money | get rewards     |
| gamble    | play games      |
| withdraw  | receive bonuses |
| casino    | game center     |

### 自動加入的防封鎖規則

* 不得提及現金回饋
* 不得明示賭博行為
* 不得使用 "fast income" "earn money quickly" 之類字眼

---

# **8.5 Prompt Cost Control（生成成本控管）**

避免過度花費 token：

### 1. 長度控制

* 文案限制 40–120 tokens
* 影片腳本限制 6–12 scene
* 分析內容限制 250 tokens 以下

### 2. 模型自動切換

| 任務       | 模型                                |
| -------- | --------------------------------- |
| 文案       | 低成本模型（Gemini Flash / GPT-4o mini） |
| 圖片       | Image model                       |
| 影片       | Video LLM                         |
| Analyzer | Gemini Flash / GPT-4o mini        |

### 3. 使用 estimate 預扣成本

Auto-Prompt Engine 會估算 token → 預扣點數 → 再送出任務。

---

# **8.6 Output Normalization（輸出正規化）**

所有輸出一律被轉成統一格式：

```
{
  "type": "text|image|video|lp|analyze|fix",
  "content": "字串或 JSON",
  "tokens": number,
  "risk_score": number,
  "raw": "模型原回傳"
}
```

此格式可直接寫入：

* creatives/
* compliance_fixes/
* usage_operations/

---

# **8.7 Prompt Engine Summary**

**Auto-Prompt Engine = 自動補強 + 自動降風險 + 自動合規 + 自動控制成本。**

完成本章後：

* 所有模型、所有素材類型、所有產業都有統一 Prompt 格式
* 不會出現 AI 回傳過長、過短、不合規、不好用的內容
* 系統可支援多語言、多產業、多平台
* 有效降低成本 20–40%、提升過審率

---

# 第 9 章：Auto Creative Engine（自動素材引擎：圖片 / 影片生成 + Queue + Usage）

本章定義 NoAI 最核心、最能創造營收的模組：
**Auto Creative Engine =（圖片生成 + 影片生成 + Queue 排程 + UsageEngine + LLM 模型整合）**。

此章完成後，工程師能直接依照規格：

* 實作圖片生成 API（image）
* 實作影片生成 API（video）
* 佇列任務（Queue）
* Worker 後台跑任務
* 自動扣點 / 自動退款
* 自動儲存輸出（creatives/）
* 自動記錄失敗、重試、錯誤原因

這是 **NoAI V2.3 / V2.4 / V2.5 最重要的核心章節**。

---

# **9.1 Auto Creative Engine 架構總覽**

Auto Creative Engine 由 6 大核心組成：

1. **Controller 層（API 入口）**
2. **PromptEngine（文字→圖片 / 影片 Prompt）**
3. **UsageEngine（預扣 / 扣點 / 退款）**
4. **Job Queue（non-blocking 任務佇列）**
5. **Worker Engine（實際呼叫模型）**
6. **Creative Save Engine（寫入 creatives/ + ledger）**

完整流程圖：

```
User → API Controller
 → Usage.start() 預扣點數
 → 建立 creative_job（pending）
 → Worker 擷取 job
 → 生成圖片或影片
 → Usage.finalize()
 → creatives/ 儲存內容
 → 回傳結果或通知前端
```

---

# **9.2 任務類型與點數價格**

此段與 Pricing Model（第 2 章）一致，以下為生成成本：

| 任務         | 點數       | 備註                      |
| ---------- | -------- | ----------------------- |
| image 生成圖片 | **3 點**  | 1080×1080 or 9:16 1080p |
| video 生成影片 | **10 點** | 720p, 5–15秒             |
| lp 生成落地頁   | **3 點**  | HTML + 部署               |

所有價格必須 hard-code（不可動態修改）。

---

# **9.3 /api/creative/image（圖片生成 API）**

### **Method**

`POST /api/creative/image`

### **Request Body**

```
{
  "prompt": "使用者輸入",
  "resolution": "1080p|square|story",
  "style": "realistic|anime|flat|minimal",
  "lang": "zh-hant|en|tl|vi|bn|km"
}
```

### **Flow（完整流程）**

1. 驗證 JWT
2. Subscription / Daily Limit 驗證
3. 呼叫 Usage.start("image", cost=3)
4. 建立 creative_job：

```
{
  type: "image",
  status: "pending",
  attempts: 0,
  maxAttempts: 3,
  userId: xxx,
  resolution: "1080p",
  input: {...}
}
```

5. 回傳 jobId（非同步處理）

### **Response**

```
{ "jobId": "abc123" }
```

---

# **9.4 /api/creative/video（影片生成 API）**

### **Method**

`POST /api/creative/video`

### **Request Body**

```
{
  "prompt": "使用者輸入",
  "duration": 5|10|15,
  "aspect": "9:16|16:9",
  "lang": "zh-hant|en|tl|vi|bn|km"
}
```

### Flow

1. 驗證 JWT
2. Subscription / Daily Limit 驗證
3. Usage.start("video", cost=10)
4. 建立 job（pending）
5. 回傳 jobId

---

# **9.5 Job Queue（任務佇列）**

worker 每 1 秒會跑一次：

```
SELECT * FROM creative_jobs
WHERE status="pending" OR (status="error" AND attempts < maxAttempts)
ORDER BY createdAt ASC
LIMIT 10
```

拉到後：

* 標示 status="processing"
* attempts += 1
* 進入 Worker Engine

---

# **9.6 Worker Engine（圖片 / 影片模型調用）**

WorkerCore 會依照任務類型：

### **圖片任務**

1. PromptEngine.composeImagePrompt()
2. 呼叫 Image Model（OpenAI / Stability / NoAI future）
3. 回傳 imageBase64 or CDN URL

### **影片任務**

1. PromptEngine.composeVideoPrompt()
2. 呼叫 Video LLM（Sora / Runway / KLING / NoAI future）
3. 回傳 videoBase64 or CDN URL

---

# **9.7 成功處理（Success Flow）**

Worker 完成任務後：

1. 呼叫 Usage.finalize(operationId, actualCost)
2. 建立 creatives/{creativeId}

```
{
  type: "image|video",
  userId,
  jobId,
  url,
  model,
  resolution,
  risk_score,
  createdAt
}
```

3. creative_jobs 設為 success
4. 寫入 credit_ledger（扣點記錄）

---

# **9.8 任務失敗 / Retry（Retry Flow）**

若模型回傳錯誤：

### 若 attempts < maxAttempts：

```
status = "error"
→ 保持預扣（不退點）
→ worker 稍後重試
```

### 若 attempts == maxAttempts：

```
Usage.finalize(refund=true)
status = "failed"
→ 自動全額退點
```

### 失敗原因會記錄 logs/

---

# **9.9 creative_jobs 資料結構（終版版）**

```
creative_jobs/{jobId} = {
  type: "image|video|lp",
  userId: string,
  status: "pending|processing|success|error|failed",
  attempts: number,
  maxAttempts: number,
  input: map,
  output: map,
  operationId: string,  // usage_op 連動
  cost: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

# **9.10 creatives/ 資料結構（終版版）**

```
creatives/{creativeId} = {
  jobId: string,
  type: "image|video|lp",
  userId: string,
  url: string,
  model: string,
  resolution: string,
  risk_score: number,
  content: string|map,
  tokens: number,
  createdAt: timestamp
}
```

---

# **9.11 Worker 錯誤類型與行為規則**

Worker 會根據錯誤類型決定行為：

| 錯誤類型             | 說明     | 行為               |
| ---------------- | ------ | ---------------- |
| model_error      | 模型掛掉   | retry            |
| network_error    | API 超時 | retry            |
| invalid_prompt   | 提示詞錯誤  | fail + refund    |
| compliance_block | 內容違規   | fail + refund    |
| banned_word      | 出現禁止字詞 | auto-fix → retry |

---

# **9.12 通知機制（Webhook + Frontend Polling）**

使用者可用下列方式拿到生成結果：

### **1. 前端輪詢（polling）**

```
GET /api/creative/job/{jobId}
```

回傳：pending / processing / success / failed

### **2. Webhook（企業專用）**

```
POST {clientWebhookUrl}
{
  jobId,
  status,
  result
}
```

---

# **9.13 Auto Creative Engine Summary（總結）**

Auto Creative Engine 是整個 NoAI 最重要的營收核心：

### 功能價值：

* 自動扣點
* 自動生成圖片 / 影片
* 自動 retry / refund
* 高轉化素材（圖片、影片）
* 全自動化 pipeline

### 工程價值：

* 具備完整佇列
* 具備 worker 模型調用
* 可擴大到日產數萬素材

---

# 第 9 章：Auto Creative Engine（自動素材引擎：圖片／影片生成 + Queue + Usage）

本章重新完整定義 NoAI V3 的 **Auto Creative Engine**，包含：圖片生成、影片生成、任務佇列、Worker、扣點模型、儲存 creatives、錯誤處理、Webhook 等完整規格。

此章為 **V2.3 / V2.4 / V2.5 的核心章節**，並與 Prompt Engine（第 8 章）與 Usage Engine（第 5 章）完全銜接。

---

# **9.1 Auto Creative Engine 系統架構**

Auto Creative Engine = NoAI 的素材生產流水線，由六大元件組成：

1. **Controller（API 入口）**
2. **PromptEngine（依任務類型生成最終 Prompt）**
3. **UsageEngine（預扣 → 扣點 → 退款）**
4. **Job Queue（非同步任務隊列）**
5. **Worker Engine（實際調用 LLM / Video / Image 模型）**
6. **Creative Save Engine（儲存產出、寫入 ledger）**

完整流程：

```
使用者請求
 → Controller 驗證
 → Usage.start()（預扣點數）
 → 建立 creative_job（pending）
 → Worker 擷取任務
 → 呼叫 Image/Video 模型
 → Usage.finalize()（扣點或退款）
 → creatives/ 儲存素材
 → 返回前端（Polling 或 Webhook）
```

---

# **9.2 任務類型與固定扣點價格（定價不可動）**

| 任務類型             | 固定扣點     | 規格                |
| ---------------- | -------- | ----------------- |
| image（圖片生成）      | **3 點**  | 1080p, 1:1 / 9:16 |
| video（影片生成）      | **10 點** | 720p, 5–15 秒      |
| lp（Landing Page） | **3 點**  | HTML + 自動部署       |

**所有價格須硬編碼，不可被前端或後端更改。**

---

# **9.3 /api/creative/image — 圖片生成 API**

### **Method**

`POST /api/creative/image`

### **Request Body**

```
{
  "prompt": "使用者輸入文字",
  "resolution": "1080p|square|story",
  "style": "realistic|anime|minimal",
  "lang": "zh-hant|en|vi|tl|bn|km"
}
```

### **流程（Controller）**

1. 驗證 JWT
2. 驗證訂閱層級（lite/pro/enterprise）
3. 使用者每日限制（5 / 30 / 無限制）
4. 呼叫 `Usage.start("image", cost=3)` → **預扣點數**
5. 建立 `creative_job`
6. 回傳 `jobId`

### **Response**

```
{ "jobId": "xxxxxx" }
```

---

# **9.4 /api/creative/video — 影片生成 API**

### **Method**

`POST /api/creative/video`

### **Request Body**

```
{
  "prompt": "使用者輸入",
  "duration": 5|10|15,
  "aspect": "9:16|16:9",
  "lang": "zh-hant|en|vi|tl|bn|km"
}
```

### **流程（Controller）**

1. 驗證 JWT
2. 驗證訂閱與每日限制
3. `Usage.start("video", cost=10)`
4. 建立 `creative_job`
5. 回傳 `jobId`

---

# **9.5 creative_jobs（任務佇列結構）**

```
creative_jobs/{jobId} = {
  type: "image|video|lp",
  status: "pending|processing|success|error|failed",
  attempts: 0,
  maxAttempts: 3,
  userId: string,
  input: map,      // 原始請求
  output: map,     // Worker 生成內容
  operationId: string,  // usage_op 連動
  cost: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

# **9.6 Job Queue — 任務擷取邏輯**

Worker 每秒執行一次：

```
SELECT * FROM creative_jobs
WHERE status IN ("pending", "error")
  AND attempts < maxAttempts
ORDER BY createdAt ASC
LIMIT 10;
```

擷取後：

* 將 status 改為 `processing`
* attempts += 1
* 交給 Worker Engine

---

# **9.7 Worker Engine（核心模型呼叫）**

Worker 根據 `job.type` 進行不同流程：

### **(A) Image 任務**

1. `PromptEngine.composeImagePrompt()`
2. 呼叫 Image Model：

   * OpenAI Image
   * Stability
   * NoAI Image（未來）
3. 回傳 `imageBase64` 或 CDN URL

### **(B) Video 任務**

1. `PromptEngine.composeVideoPrompt()`
2. 呼叫 Video Model：

   * Runway
   * Sora 系列
   * KLING
3. 回傳 `videoBase64 / URL`

---

# **9.8 成功流程（Success Flow）**

Worker 成功完成後：

1. `Usage.finalize(operationId, actualCost)` → 正式扣點
2. 寫入 creatives/{creativeId}

```
{
  jobId,
  type,
  userId,
  url,
  model,
  risk_score,
  resolution,
  content,
  tokens,
  createdAt
}
```

3. creative_jobs 改成 `success`
4. credit_ledger 寫入扣點紀錄

---

# **9.9 失敗與 Retry（錯誤處理）**

若 Worker 回傳錯誤：

### **(1) 可重試（attempts < maxAttempts）**

```
status = "error"
→ 不退點
→ 等待下一輪 retry
```

### **(2) 不可重試（attempts == maxAttempts）**

```
Usage.finalize(refund=true)
status = "failed"
```

### **錯誤會寫入 logs/**

包含：model_error / timeout / invalid_prompt / compliance_block

---

# **9.10 creatives（輸出成品資料結構）**

```
creatives/{creativeId} = {
  jobId: string,
  type: "image|video|lp",
  userId: string,
  url: string,
  model: string,
  resolution: string,
  risk_score: number,
  content: string|map,
  tokens: number,
  createdAt: timestamp
}
```

---

# **9.11 Worker 錯誤分類（五大類）**

| 錯誤類型             | 行為               |
| ---------------- | ---------------- |
| model_error      | retry            |
| network_error    | retry            |
| invalid_prompt   | fail + refund    |
| compliance_block | fail + refund    |
| banned_word      | auto-fix → retry |

---

# **9.12 前端取得結果（Polling / Webhook）**

### **Polling（預設）**

```
GET /api/creative/job/{jobId}
```

回傳：pending / processing / success / failed + result

### **Webhook（企業級）**

```
POST clientWebhookUrl
{
  jobId,
  status,
  result
}
```

---

# **9.13 Auto Creative Engine 總結**

Auto Creative Engine 是 NoAI 的核心營收模組：

* 自動扣點
* 自動 Retry / Refund
* 非同步 queue，支援大量任務
* 生成圖片、影片、落地頁
* 與 Prompt Engine、Usage Engine 完整相容

此模組奠定 NoAI 未來自動化素材工廠能力。

---

# 第 10 章：Landing Page Engine（自動子網域產生／Cloudflare Pages 部署）

本章定義完整 Landing Page Engine，由三大模組組成：

1. **LP Generator（內容生成）**
2. **LP Builder（HTML 組合與模板渲染）**
3. **LP Deployer（自動子網域 + Cloudflare Pages 發布）**

此章將 NoAI 的落地頁生成能力與營收邏輯整合（3 點／次），並讓使用者可在 30 秒內自動產生可廣告轉化的落地頁。

---

# **10.1 Landing Page Engine 系統架構**

完整流程：

```
使用者輸入 → LP Generator（AI 文案）
 → LP Builder（HTML）
 → Subdomain Manager（子網域）
 → Cloudflare Pages API（部署）
 → 回傳可直接使用的落地頁 URL
```

三層職責：

* **Generator：**產出文字內容
* **Builder：**套用模板產生最終 HTML
* **Deployer：**建立子網域並推向 Cloudflare Pages

---

# **10.2 /api/landing-page/create（建立落地頁 API）**

### Method

`POST /api/landing-page/create`

### Request Body

```
{
  "brand": "品牌名稱",
  "keywords": ["slot", "bonus", "promo"],
  "lang": "zh-hant|en|vi|tl|bn|km",
  "style": "modern|minimal|gaming",
  "templateId": "default|gaming|casino|crypto"
}
```

### 流程（Controller）

1. 驗證 JWT
2. Subscription / Daily Limit 驗證
3. `Usage.start("lp", cost=3)` 預扣點數
4. 建立 landing_page 任務（pending）
5. 回傳 `pageId`

---

# **10.3 landing_pages（資料結構）**

```
landing_pages/{pageId} = {
  userId: string,
  status: "pending|building|deploying|success|failed",
  brand: string,
  templateId: string,
  lang: string,
  content: map, // AI 文案
  html: string, // 最終 HTML
  url: string,
  operationId: string, // usage_op
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

# **10.4 LP Generator（AI 文案生成）**

Generator 使用 PromptEngine（第 8 章）生成：

* hero section（主標）
* features section（亮點）
* proof（社會證據）
* CTA

格式：

```
{
  "hero": "...",
  "features": [...],
  "proof": [...],
  "cta": "..."
}
```

生成後寫入 landing_pages/{pageId}.content

---

# **10.5 LP Builder（HTML 組合器）**

Builder 將 AI 文案套入模板：

```
/templates/{templateId}/index.html
```

模板支持變數：

* {{hero}}
* {{features}}
* {{cta}}
* {{brand}}
* {{lang}}

組合成完整 HTML：

```
<html>
  <body>
    {{hero}}
    {{features}}
    {{cta}}
  </body>
</html>
```

---

# **10.6 Subdomain Manager（自動產生子網域）**

子網域命名規則：

```
{brand}-{random}.noai.app
```

或專屬客戶：

```
{orgId}.{projectId}.noai.app
```

### 流程

1. 呼叫 Cloudflare API → 建立 CNAME 記錄
2. CNAME 指向 Cloudflare Pages 的 domain

---

# **10.7 LP Deployer（Cloudflare Pages 自動部署）**

### 步驟

1. 產生 artifacts：`/dist/{pageId}/index.html`
2. 上傳至 Cloudflare Pages（API）
3. 綁定子網域（自動）
4. 回傳最終 URL

### 成功回傳格式：

```
{
  "url": "https://brand-xyz.noai.app",
  "status": "success",
  "pageId": "xxxx"
}
```

---

# **10.8 Usage Finalize（扣點 / 退款）**

### 成功

```
Usage.finalize(operationId, actualCost=3)
```

### 失敗

```
Usage.finalize(operationId, refund=true)
```

landing_pages.status 設定為 `failed`

---

# **10.9 錯誤分類與行為規則**

| 錯誤類型              | 行為             |
| ----------------- | -------------- |
| model_error       | retry（AI 文案生成） |
| html_render_error | fail + refund  |
| cloudflare_error  | retry（API 失敗）  |
| dns_error         | retry          |
| invalid_input     | fail + refund  |

---

# **10.10 使用者取得結果（Polling / Webhook）**

### Polling（預設）

```
GET /api/landing-page/{pageId}
```

回傳：status + url

### Webhook（企業）

```
POST clientWebhookUrl
{
  pageId,
  status,
  url
}
```

---

# **10.11 Landing Page Engine Summary**

Landing Page Engine 為 NoAI 的第二大核心營收模組：

* 每次 3 點
* 30 秒產生完整可投廣告 LP
* 自動子網域
* 支援 Cloudflare Pages API
* 可大規模量產（批量 LP）

此模組與圖片、影片生成模組一起構成完整素材生態系。

---

# 第 11 章：Risk Analyzer & Auto-Fix Engine（廣告三平台風險檢測 + 自動修正引擎）

本章定義 NoAI 的「廣告合規安全核心」：
**Risk Analyzer（違規偵測） + Auto-Fix Engine（自動修正文案）**。

此模組確保使用者所生成的素材（文字／圖片／影片／LP）不會違反：

* Meta Ads Policy
* TikTok Ads Policy
* Google Ads Policy

並可自動修正文案，提高過審率，避免用戶濫用導致平台封鎖。

---

# **11.1 Analyzer 系統架構**

Analyzer 引擎由 4 層組成：

1. **Parser（內容解析）**
2. **Policy Checker（規則檢測）**
3. **Risk Scoring（風險量化）**
4. **Fix Engine（自動修正）**

整體流程：

```
使用者輸入 → Analyzer → forbidden/restricted/allowed → risk_score
 → 若 forbidden → Auto-Fix Engine
 → 回傳：可投放版本
```

---

# **11.2 /api/analyze/text（文字風險分析）**

### **Method**

`POST /api/analyze/text`

### **Request Body**

```
{
  "text": "欲檢測之文案",
  "platform": "meta|tiktok|google",
  "lang": "zh-hant|en|tl|vi|bn|km"
}
```

### **輸出結果範例**

```
{
  "status": "restricted",
  "risk_score": 0.62,
  "issues": ["gambling", "cashout"]
}
```

risk_score：0~1（數字越高，越容易被封）

---

# **11.3 /api/analyze/image（圖片風險分析）**

圖片會進行：

* 物件偵測（如：籌碼、鈔票、槍枝）
* 文字 OCR（抓違規文字）
* 人物動作偵測（暴露、暗示性動作）

### **回傳格式**

```
{
  "status": "forbidden",
  "issues": ["money_symbol", "nudity"],
  "risk_score": 0.91
}
```

---

# **11.4 /api/analyze/video（影片風險分析）**

影片會逐格抽樣（每 0.5 秒）：

* 抽取畫面 → Image Analyzer
* 抽取字幕 → Text Analyzer

### **Output**

```
{
  "status": "restricted",
  "risk_score": 0.74,
  "issues": ["fast_money_language", "lucky_spin"]
}
```

---

# **11.5 Analyzer Policy Rules（三平台規則庫）**

規則庫分為三類：

### **1. Forbidden（直接封鎖）**

* 明示賭博（casino, bet, gamble）
* 現金、鈔票、提款（withdraw, cashout, get money）
* 暴力、色情、裸露

### **2. Restricted（可修正）**

* 誇大承諾（win big, guaranteed）
* 催促性 CTA（play NOW, join fast）
* 暗示金錢回饋（reward, bonus）

### **3. Allowed（安全）**

* 遊戲描述、娛樂用途
* 中性語言（join the fun, explore now）

---

# **11.6 Risk Scoring（風險評分模型）**

風險評分基於三大維度：

1. **Policy Weight（違規項目嚴重程度）**
2. **Density（違規字詞出現頻率）**
3. **Context（上下文是否是金流描述）**

最終 risk_score：

```
risk_score = 0.2*policyWeight + 0.3*density + 0.5*contextRisk
```

高於 0.75 → 高風險（需修正）
高於 0.90 → 禁止發布

---

# **11.7 Auto-Fix Engine（自動修正引擎）**

當文案「forbidden」或「risk_score > 0.75」時，啟動 Auto-Fix：

### **Auto-Fix 流程**

```
原文案 → Analyzer → issues → Fix Prompt
 → 生成新版本 → 審核 → 返回安全版本
```

### **修正原則**

* 清除所有 forbidden 字詞
* 改寫 restricted 字詞（cash → reward）
* 遵守平台規則庫
* 保留行銷語氣但降低風險

---

# **11.8 /api/fix（手動觸發修正）**

### Request Body

```
{
  "text": "...",
  "platform": "meta|tiktok|google",
  "issues": [...]
}
```

### Response

```
{
  "fixed_output": "修正後內容",
  "explanation": "修正原因 …"
}
```

---

# **11.9 compliance_fixes（資料結構）**

```
compliance_fixes/{fixId} = {
  userId: string,
  creativeId: string,
  platform: string,
  issues: array,
  fixedOutput: map | string,
  confidence: number,
  createdAt: timestamp
}
```

---

# **11.10 Fix Confidence（信心指標）**

Auto-Fix 必須回傳信心分數（0–1）：

* 0.9 以上 → 可直接使用
* 0.7–0.9 → 建議人工 review
* 0.7 以下 → 判定 fix 失敗 → 提醒用戶重新生成

---

# **11.11 Analyzer 與 Auto-Fix 整合流程**

```
素材生成 → Analyzer
 → 若安全 → 直接發布
 → 若警告（restricted）→ 可選修正
 → 若嚴重（forbidden）→ 強制修正（Auto-Fix）
 → 修正成功 → 回傳安全素材
 → 修正失敗 → 拒絕 + 提醒重新生成
```

---

# **11.12 API 安全規則（避免過度使用）**

為避免用戶濫用 Analyzer：

| tier       | 每日限制 |
| ---------- | ---- |
| lite       | 5 次  |
| pro        | 20 次 |
| enterprise | 無限制  |

---

# **11.13 Analyzer Summary（總結）**

Risk Analyzer & Auto-Fix Engine 提升整個 NoAI 系統「安全性 + 過審率」：

* 自動檢測三平台違規內容
* 內容風險量化（risk_score）
* 違規素材自動修正（Auto-Fix）
* 大幅降低被 Meta/TikTok/Google 封鎖的風險
* 自動寫入 compliance_fixes 供後台稽核

此模組為 NoAI 的「廣告安全與合規大腦」。

---

# 第 12 章：Admin Panel（管理後台：補點／稽核／用戶管理／素材審查）

Admin Panel 是 NoAI 的內部營運核心，用來：

* 補點（手動加點給用戶）
* 審查素材（避免違規內容）
* 查看使用記錄（稽核）
* 管理用戶權限（封鎖／解除封鎖）
* 查看營運數據（總點數流量、任務量、收入預估）

此章定義完整系統界面與 API 能力，使客服、營運、管理員能有效管理全系統。

---

# **12.1 Admin Panel 導覽結構**

Admin Panel 包含六大區域：

1. **Dashboard（總覽）**
2. **Users（用戶管理）**
3. **Credits（補點系統）**
4. **Usage & Ledger（稽核與查帳）**
5. **Creatives Review（素材審查區）**
6. **System Logs（錯誤與排程紀錄）**

---

# **12.2 Admin Dashboard（管理儀表板）**

顯示：

* 今日生成任務量（image / video / lp）
* 今日扣點總量
* 今日新增用戶
* 全站使用量（近 24 小時 Requests）
* Worker 排程狀態

系統需具備：

* 快取 5 分鐘（避免過多讀取）
* 時間分頁（本日 / 本週 / 本月）

---

# **12.3 Users（用戶管理）**

可查看：

* userId
* email
* 訂閱階級（lite/pro/enterprise）
* 剩餘點數
* 用戶狀態（active/banned）
* 註冊時間

## 功能：

### **1. 用戶封鎖**

`POST /api/admin/users/ban`

```
{ "userId": "xxx", "reason": "abuse" }
```

→ 禁止登入與所有 API

### **2. 用戶解封**

`POST /api/admin/users/unban`

### **3. 查看用戶完整歷史紀錄**

* 所有 usage_operations
* 所有 credit_ledger
* 所有 creatives
* 所有 landing_pages

---

# **12.4 Credits（補點工具）**

管理員可手動補點給用戶。

### API：

`POST /api/admin/credits/add`

```
{
  "userId": "xxx",
  "points": 10,
  "reason": "customer_compensation"
}
```

### 系統寫入 credit_ledger：

```
{
  type: "admin_add",
  points: +10,
  userId,
  createdAt
}
```

此功能對客服極度重要，用於：

* 處理抱怨
* 補償 queue 失敗
* 給 VIP 用戶贈點

---

# **12.5 Usage & Ledger（稽核與點數查帳）**

此區能查詢：

* usage_operations（所有扣點事件）
* credit_ledger（所有點數增減）

查詢條件：

* userId
* dateRange
* type（扣點／補點／退款）

此區域為「會計審核」用，需具備 CSV 匯出。

---

# **12.6 Creatives Review（素材審查區）**

必要原因：

* 防止用戶生成違規素材
* 檔住高風險（色情、露骨、暴力）
* 保護 NoAI 與使用者的廣告帳戶

### 顯示內容：

* creativeId
* userId
* type（image/video/lp/text）
* risk_score
* preview（圖片、影片、文案）
* Analyzer issues

### 管理員可做：

* Approve（允許發布）
* Reject（拒絕，提示用戶）
* Fix（手動啟動 Auto-Fix Engine）

### API：

`POST /api/admin/creatives/review`

```
{
  "creativeId": "xxx",
  "action": "approve|reject|fix"
}
```

---

# **12.7 System Logs（系統錯誤／排程紀錄）**

包括：

* Worker 錯誤 stack
* 模型 API 超時
* Retry 過多
* 用戶濫用記錄
* 伺服器例外（exception logs）

管理員可查看：

* error message
* jobId（若適用）
* timestamp
* model（openai/gemini/runway）

---

# **12.8 Admin API 權限規範**

Admin API 僅限：

* user.claims.admin = true 的帳號

需由：

```
/scripts/setAdmin.ts
```

指定管理員權限。

任意非 Admin 角色呼叫 → 直接 403。

---

# **12.9 Admin Panel Summary（總結）**

Admin Panel 是營運成功的核心：

* 能處理客戶問題（補點）
* 能防止違規內容（審查）
* 能維持財務穩定（查帳）
* 能掌握平台狀態（Dashboard）
* 全系統可稽核（logs + ledger）

此模組與 Risk Analyzer、Usage Engine、Creative Engine 深度整合，讓 NoAI 成為可商業化、可控且安全的產品。

---

# 第 12 章：Admin Panel（管理後台：補點／稽核／用戶管理／素材審查）

Admin Panel 是 NoAI 的內部營運核心，用來：

* 補點（手動加點給用戶）
* 審查素材（避免違規內容）
* 查看使用記錄（稽核）
* 管理用戶權限（封鎖／解除封鎖）
* 查看營運數據（總點數流量、任務量、收入預估）

此章定義完整系統界面與 API 能力，使客服、營運、管理員能有效管理全系統。

---

# **12.1 Admin Panel 導覽結構**

Admin Panel 包含六大區域：

1. **Dashboard（總覽）**
2. **Users（用戶管理）**
3. **Credits（補點系統）**
4. **Usage & Ledger（稽核與查帳）**
5. **Creatives Review（素材審查區）**
6. **System Logs（錯誤與排程紀錄）**

---

# **12.2 Admin Dashboard（管理儀表板）**

顯示：

* 今日生成任務量（image / video / lp）
* 今日扣點總量
* 今日新增用戶
* 全站使用量（近 24 小時 Requests）
* Worker 排程狀態

系統需具備：

* 快取 5 分鐘（避免過多讀取）
* 時間分頁（本日 / 本週 / 本月）

---

# **12.3 Users（用戶管理）**

可查看：

* userId
* email
* 訂閱階級（lite/pro/enterprise）
* 剩餘點數
* 用戶狀態（active/banned）
* 註冊時間

## 功能：

### **1. 用戶封鎖**

`POST /api/admin/users/ban`

```
{ "userId": "xxx", "reason": "abuse" }
```

→ 禁止登入與所有 API

### **2. 用戶解封**

`POST /api/admin/users/unban`

### **3. 查看用戶完整歷史紀錄**

* 所有 usage_operations
* 所有 credit_ledger
* 所有 creatives
* 所有 landing_pages

---

# **12.4 Credits（補點工具）**

管理員可手動補點給用戶。

### API：

`POST /api/admin/credits/add`

```
{
  "userId": "xxx",
  "points": 10,
  "reason": "customer_compensation"
}
```

### 系統寫入 credit_ledger：

```
{
  type: "admin_add",
  points: +10,
  userId,
  createdAt
}
```

此功能對客服極度重要，用於：

* 處理抱怨
* 補償 queue 失敗
* 給 VIP 用戶贈點

---

# **12.5 Usage & Ledger（稽核與點數查帳）**

此區能查詢：

* usage_operations（所有扣點事件）
* credit_ledger（所有點數增減）

查詢條件：

* userId
* dateRange
* type（扣點／補點／退款）

此區域為「會計審核」用，需具備 CSV 匯出。

---

# **12.6 Creatives Review（素材審查區）**

必要原因：

* 防止用戶生成違規素材
* 檔住高風險（色情、露骨、暴力）
* 保護 NoAI 與使用者的廣告帳戶

### 顯示內容：

* creativeId
* userId
* type（image/video/lp/text）
* risk_score
* preview（圖片、影片、文案）
* Analyzer issues

### 管理員可做：

* Approve（允許發布）
* Reject（拒絕，提示用戶）
* Fix（手動啟動 Auto-Fix Engine）

### API：

`POST /api/admin/creatives/review`

```
{
  "creativeId": "xxx",
  "action": "approve|reject|fix"
}
```

---

# **12.7 System Logs（系統錯誤／排程紀錄）**

包括：

* Worker 錯誤 stack
* 模型 API 超時
* Retry 過多
* 用戶濫用記錄
* 伺服器例外（exception logs）

管理員可查看：

* error message
* jobId（若適用）
* timestamp
* model（openai/gemini/runway）

---

# **12.8 Admin API 權限規範**

Admin API 僅限：

* user.claims.admin = true 的帳號

需由：

```
/scripts/setAdmin.ts
```

指定管理員權限。

任意非 Admin 角色呼叫 → 直接 403。

---

# **12.9 Admin Panel Summary（總結）**

Admin Panel 是營運成功的核心：

* 能處理客戶問題（補點）
* 能防止違規內容（審查）
* 能維持財務穩定（查帳）
* 能掌握平台狀態（Dashboard）
* 全系統可稽核（logs + ledger）

此模組與 Risk Analyzer、Usage Engine、Creative Engine 深度整合，讓 NoAI 成為可商業化、可控且安全的產品。

---

📌 **第 12 章完成。**
如要繼續：

> **下一章（第 13 章：Enterprise / Org / Team — 企業分層架構與金鑰 BYOK 模式）**

# 第 13 章：Enterprise / Org / Team（企業級架構 + BYOK 金鑰模式）

本章定義 NoAI 的企業版（B2B）能力：

* 企業帳號（Org）
* 團隊架構（Team）
* 專案（Project）
* 權限（Role）
* BYOK（Bring Your Own Key，自帶 API 金鑰）

此章對應 V2.5＋未來的 B2B 擴展，是 NoAI 商業模式的第二層核心。

---

# **13.1 Enterprise 架構概念總覽**

企業架構包含三層：

### **1. Org（企業）**

* 一間公司、一個品牌、一家代理商
* 有獨立的 Billing（訂閱 / 點數 / 金流）

### **2. Team（成員）**

* 公司內的員工 / 操作人員
* 權限分級（Owner → Admin → Member → Viewer）

### **3. Project（專案）**

* 每個專案可綁定：

  * 金鑰（API Keys）
  * 子網域（LP）
  * 素材／廣告活動

此結構讓 NoAI 支援：

* 代理商
* 團隊型行銷公司
* 需要多人協作的大型客戶

---

# **13.2 Org（企業）資料結構**

```
orgs/{orgId} = {
  name: string,
  ownerId: string,
  billingPlan: "enterprise|pro|custom",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

Owner = 最高權限，可新增成員、設定金鑰。

---

# **13.3 Team（企業成員管理）**

每間企業底下可有多人：

```
orgs/{orgId}/members/{userId} = {
  role: "owner|admin|editor|viewer",
  joinedAt: timestamp
}
```

### Role 權限：

| 動作           | owner | admin | editor | viewer |
| ------------ | ----- | ----- | ------ | ------ |
| 管理金鑰         | ✔     | ✔     | ✘      | ✘      |
| 編輯素材         | ✔     | ✔     | ✔      | ✘      |
| 查看素材         | ✔     | ✔     | ✔      | ✔      |
| 新增/移除成員      | ✔     | ✔     | ✘      | ✘      |
| 查看計費         | ✔     | ✔     | ✘      | ✘      |
| 呼叫企業 Webhook | ✔     | ✔     | ✔      | ✘      |

---

# **13.4 Project（專案）資料結構**

```
projects/{projectId} = {
  orgId: string,
  name: string,
  members: [...],
  apiKeys: {...},
  domains: [...],
  createdAt,
  updatedAt
}
```

一個 Org 可有多個 Project。
常見用途：

* A 客戶＝一個 Project
* A 客戶旗下不同平台（Meta/TikTok）各自分專案

---

# **13.5 BYOK（Bring Your Own Key，自帶金鑰）模式**

BYOK 允許企業客戶使用自己的金鑰：

* OpenAI API Key
* Gemini Key
* Meta / TikTok / Google Ads Token
* Cloudflare API Token

金鑰儲存在：

```
projects/{projectId}/apiKeys/{keyId}
```

格式：

```
{
  type: "openai|gemini|meta|tiktok|google|cloudflare",
  value_encrypted: "...",
  createdAt,
  updatedAt
}
```

## 金鑰需加密保存（AES + 秘密金鑰環境變數）。

前端永不暴露原始金鑰。

---

# **13.6 BYOK 調用流程**

Worker 根據 Project 決定：

```
若 project.apiKeys[type] 存在 → 使用客戶金鑰
否則 → 使用預設 NoAI 金鑰（計費）
```

此模式讓企業：

* 分攤成本（用自己的金鑰）
* 享受更高額度（自己的配額）
* 降低 NoAI 成本（減少 token 消耗）

---

# **13.7 Org Billing（企業級計費）**

企業帳單獨立於個人帳戶：

* Org 有統一訂閱方案（Enterprise）
* Org 有專屬點數池（shared pool）

### Data Structure

```
orgs/{orgId}/billing = {
  plan: string,
  credits: number,
  renewDate: timestamp,
  history: [...]
}
```

Team 成員共用同一組點數（扣點＝扣 Org 點數）。

---

# **13.8 Project Webhook（企業專屬 Webhook）**

每個 Project 可設定：

```
projects/{projectId}/webhook = {
  url: "...",
  events: ["creative.success", "lp.success"]
}
```

Worker 在素材或 LP 生成成功後自動通知：

```
POST webhookUrl {
  projectId,
  event,
  data
}
```

---

# **13.9 Project Subdomain（專案子網域）**

每個 Project 可有：

* 獨立子網域
* 多個 landing page 綁定

格式：

```
{projectId}-{pageId}.noai.app
```

或：

```
{customDomain}
```

（企業客戶可綁定自己的網域）

---

# **13.10 Enterprise Admin（企業管理儀表板）**

企業管理頁需顯示：

* Org 訂閱資訊
* 點數池剩餘量
* 成員列表
* 專案列表
* 金鑰使用量
* 本週生成量（圖片 / 影片 / LP）

---

# **13.11 Enterprise Summary（總結）**

企業級架構提供 NoAI 第二層營收（B2B）：

* Org / Team / Project 三層結構
* BYOK（自帶金鑰）降低 NoAI 成本
* Shared Credits（團隊點數共享）
* 專案子網域、Webhook、高度客製化
* 適用於大型行銷公司、代理商、跨國團隊

此章與前面所有引擎（Creative / LP / Analyzer / Admin）無縫整合，使 NoAI 可同時支援 B2C 與 B2B 兩種模式。

---

# 第 14 章：System Health, Retry, Monitoring（系統健康監測／排程重試／安全熔斷）

本章定義 NoAI V3 的「系統穩定性核心」：

1. **Health Check（健康檢查）**
2. **Retry Strategy（重試策略）**
3. **Circuit Breaker（熔斷機制）**
4. **Queue Monitoring（佇列監控）**
5. **Error Tracking（錯誤追蹤）**
6. **Performance Metrics（效能與吞吐量指標）**

此章為確保 NoAI 在高流量下不崩潰、不爆成本、不死 Worker 的必要邏輯。

---

# **14.1 系統健康檢查（System Health Check）**

NoAI 的系統健康包含三層：

* Worker Health（排程／佇列）
* Database Health（Firestore 的讀寫狀況）
* API Health（LLM／Video／Cloudflare）

### API：

`GET /api/health`
回傳：

```
{
  "worker": "ok|stalled",
  "queue": { "pending": 20, "processing": 3, "failed": 1 },
  "db": "ok|slow",
  "llm": "ok|rate_limited",
  "video": "ok|slow",
  "uptime": 192233
}
```

若任一服務異常 → Admin Panel 顯示紅色警示燈號。

---

# **14.2 Retry System（任務重試系統）**

重試邏輯適用於：

* creative_jobs（圖片／影片）
* landing_pages
* analyzer 任務

### Retry 規則：

* 每個 job 預設最多 3 次
* retry 間隔：1s → 3s → 10s（指數回退 Backoff）
* 失敗自動紀錄 logs

### 觸發 Retry 的錯誤類型：

| 錯誤類型             | 行為         |
| ---------------- | ---------- |
| model_error      | retry      |
| network_error    | retry      |
| cloudflare_error | retry      |
| rate_limit       | retry + 延遲 |
| timeout          | retry      |
| invalid_prompt   | fail       |
| forbidden_issue  | fail       |

---

# **14.3 Circuit Breaker（熔斷系統）**

為避免：

* LLM API 爆量
* Worker 無限重跑
* 使用者濫用造成成本暴衝

### 熔斷條件：

1. **LLM API 連續 10 次錯誤**
2. **Queue backlog > 300 筆 pending**
3. **Video API 超時率 > 20%（5 分鐘內）**
4. **Cloudflare 部署持續失敗 5 次**

### 熔斷行為：

```
→ 暫停所有非必要任務（image/video/lp）5 分鐘
→ 僅保留 analyzer API
→ Admin Panel 顯示「系統維護中」
```

解除條件：

* API 錯誤率恢復
* Queue 大小恢復 ≤ 50 筆

---

# **14.4 Queue Monitoring（佇列監控）**

Admin Panel 顯示：

```
pending:  X
processing: Y
error (retryable): Z
failed:  N
```

並提供：

* 重啟 Worker
* 清除卡住的任務

### 卡住判斷：

若 job status = processing 且超過 2 分鐘未更新 → 自動標記為 error 並 retry。

---

# **14.5 Error Tracking（錯誤追蹤）**

所有錯誤寫入 logs：

```
logs/{logId} = {
  type: "worker|api|user|system",
  jobId,
  message,
  model,
  retryCount,
  createdAt
}
```

Dashboard 能：

* 過濾（type / model）
* 匯出 CSV

---

# **14.6 性能監控（Performance Metrics）**

需追蹤以下指標：

### **1. Throughput（吞吐量）**

* 每分鐘可處理任務數
* image: 20/min
* video: 6/min（視影片模型限額）
* lp: 10/min

### **2. API Latency（延遲）**

* LLM 平均延遲 < 1.2s
* Image API < 3s
* Video API < 8s（短片）

### **3. Queue Backlog（佇列量）**

正常值：20–80
高風險：100–150
危險：>150

### **4. Error Rate（錯誤率）**

* 安全值：< 3%
* 警告：3%–10%
* 危險：> 10%

---

# **14.7 Auto-Scaling 設定（Worker 動態擴展）**

若 queue backlog 達：

* > 80 → 新增 1 個 Worker
* > 150 → 再新增 1 個 Worker

若 backlog 清空：

* 3 分鐘後自動縮減 Worker

---

# **14.8 System Health Summary（總結）**

System Health + Retry + Circuit Breaker 組成 NoAI 的穩定性基礎：

* Worker 不會死循環
* 大量任務不會卡住
* API 爆錯時會自動熔斷保護成本
* Queue 量過高會自動擴容
* Admin Panel 能察看所有異常

此章確保 NoAI 能在「日活數千」到「日活上萬」的高流量下仍能穩定運作，不會產生高額損失或系統死亡的風險。

---

# 第 15 章：Cache / CDN / Edge（快取、CDN、邊緣運算最佳化）

本章定義 NoAI 在高流量、高生成量下的 **全域快取策略**：

* Edge Cache（Cloudflare CDN）
* API Cache（LLM / LP / Analyzer 結果快取）
* Firestore Cache（資料快取層）
* Signed URLs（安全快取生成）
* Asset CDN（素材、圖片、影片的全球加速）

此章確保系統在 **大量讀取、全球用戶、重複請求** 的情境下仍能超快回應，並降低成本。

---

# **15.1 Edge Cache（邊緣快取）**

NoAI 使用 Cloudflare Workers / Pages 進行：

* 靜態檔案快取（HTML / CSS / JS）
* LP 產生後的 HTML + Asset
* 圖片 / 影片（需搭配簽章 Signed URL）

### Cloudflare Cache-Control 設定：

```
Cache-Control: public, max-age=86400, s-maxage=604800
```

前端靜態檔案可全 CDN 快取。

### LP（Landing Page）快取：

LP 資料變化頻率低，可 Edge Cache：

```
Cache-Tag: lp-{pageId}
```

更新 LP 時 → 透過 Cloudflare API purge tag。

---

# **15.2 API Cache（計算結果快取）**

以下 API 結果可快取（避免重複扣點）：

* Text Generate（LLM 文案）
* Analyzer（同樣素材、同樣 prompt）
* LP 文案生成（重複 prompt）

### Cache Key 格式：

```
cache:api:{type}:{hash(prompt)}
```

快取有效期：

* LLM：24h
* Analyzer：12h
* LP：48h

避免重複扣點，直接回傳快取內容。

---

# **15.3 Firestore Cache（資料快取）**

Firestore 讀取成本高、延遲長，因此需要：

* Worker 內存 Cache（TTL 10 秒）
* Cloudflare D1（可選）
* KV（Key Value）暫存

### Cache Layer：

```
讀取任務 → 先查 Memory Cache
若無 → 查 KV
若無 → 查 Firestore → 寫入 KV
```

讓 Task Runner、LP Builder、Analyzer 都能高速讀取任務。

---

# **15.4 Signed URL（安全素材快取）**

圖片、影片、資產需要保護，不可公開：

使用 Firebase Storage + Signed URL：

```
url = generateSignedUrl(filePath, { expires: 1h })
```

並在 Cloudflare Cache Edge：

* cache 約 1 小時
* 過期後需重新簽名

安全性：

* URL 具時效性
* 即使被分享也會失效

---

# **15.5 Asset CDN（圖片 / 影片 / 資產加速）**

所有素材（creatives）必須透過 CDN 加速：

* Firebase Hosting（global CDN）
* Cloudflare R2（若檔案巨大，如影片 > 20MB）

### R2 Cache Policy：

```
Cache-Control: public, max-age=2592000
```

最大限度減少素材重複存取。

---

# **15.6 LP Asset Bundling（落地頁資產打包）**

Landing Page 包含：

* HTML
* CSS
* JS
* image banner

全部都應被 Bundle → 上傳至 Pages → 全局 CDN Cache。

Rewrite URL：

```
/{projectId}/{pageId}/index.html
```

自動託管於：

```
https://{subdomain}.noai.app/
```

---

# **15.7 Model Cache（模型結果快取）**

若同一用戶短時間重複生成：

* 自動回傳快取（不扣點）
* 可避免濫用行為導致成本爆炸

### Cache 優先順序：

```
Memory → KV → DB
```

---

# **15.8 IP Rate Limit + CDN 整合**

為減少 Worker 壓力、擋掉攻擊：

* Cloudflare Rate Limit：1 IP / 10 req / 秒
* 遭攻擊時 → 自動提升 WAF 級別

避免 API 被暴力灌爆。

---

# **15.9 Cache Summary（總結）**

本章讓 NoAI 擁有：

* 全球快取（CDN）
* 多層快取（Memory / KV / Edge）
* 安全素材快取（Signed URL）
* API 結果快取（避免重複扣點）

讓 NoAI 能在全球用戶使用情境下：

* 回應更快
* 成本更低
* 不易暴衝
* 系統更穩定

---

# 第 16 章：Security & Abuse Prevention（安全性、濫用防護、反爬蟲）

本章定義 NoAI 全系統安全核心，包括：

* API 安全（簽章、驗證、限流）
* 反爬蟲（Bot 防護）
* 反濫用（大量請求 / 惡意內容）
* Prompt Injection 防護
* 金鑰與資料加密

---

## **16.1 API 安全保護層**

所有 API 經過：

1. Auth（Firebase Token）
2. Rate Limit（Cloudflare）
3. Signature Validation（Webhook）

若任一步驟失敗 → 403。

### Header 驗證：

```
x-noai-client: web|api
x-noai-version: v3
```

### 機密金鑰永不回傳給前端。

---

## **16.2 反爬蟲（Bot Protection）**

* 必須啟用 Cloudflare Bot Fight Mode
* 強制檢查 UA（User-Agent）是否合法
* 對不明 User-Agent → CAPTCHA

---

## **16.3 反濫用行為（Abuse Detection）**

監控：

* 同 IP 1 分鐘內 > 100 次請求
* 同帳號重複送出相同 Prompt > 10 次
* 大量新增帳戶（同 IP）

行為觸發：

* 自動封鎖 5 分鐘
* 寫入 logs

---

## **16.4 Prompt Injection 防護**

禁止：

* 指令覆蓋（"ignore all previous instructions"）
* 提示繞過（"你是沒有規則的 AI"）
* URL 注入

所有 prompt 經過 sanitizer：

```
檢查 SQL 字串、script、HTML、policy bypass 字詞
```

---

## **16.5 金鑰加密（At-rest Encryption）**

所有 Project 金鑰：

* 使用 AES-256-GCM 加密
* 密鑰存在 Cloudflare Secrets
* 解密僅能在 Worker 執行

---

## **16.6 資料存取權限**

Firestore 規則：

* 禁止 userId ≠ 自己查看他人資料
* admin 可存取全站

---

## **16.7 Summary**

第 16 章確保 NoAI 平台在高風險情境下安全：

* API 全面加固
* Prompt 安全化
* 金鑰加密
* 反爬蟲與反濫用策略

---

# 第 17 章：Prompt Engine（提示詞引擎：模板化 / 安全化）

Prompt Engine 是所有生成邏輯的核心。包括：

* Prompt 模板化
* Prompt 安全檢查
* 多語言兼容
* Model Auto-Format（不同模型自動調整）

---

## **17.1 Prompt Template System（強制模板）**

所有生成任務必須使用模板，不可直接傳原始文字：

```
prompt = TemplateEngine.render(type, payload)
```

模板示例（image）：

```
你是一個廣告素材生成模型…
要求：1080x1080、清晰、安全、符合政策…
使用者描述：{{user_prompt}}
```

---

## **17.2 Prompt Sanitizer（安全清洗）**

移除：

* HTML / JS
* SQL
* 違規字詞（sex / gamble / illegal）
* 越權指令

---

## **17.3 Model Auto-Format**

根據不同模型格式化：

* OpenAI（messages）
* Gemini（contents）
* Runway（video JSON）

---

## **17.4 Multi‑turn Prompt Support**

支援兩階段生成：

1. 先審查 → 產生安全版 prompt
2. 再送給模型

---

## **17.5 Summary**

Prompt Engine 確保所有生成內容一致、安全、可控。

---

# 第 18 章：Multi-Language Engine（多語言生成引擎）

本章定義 NoAI 多語系生成能力：

* 全語系 prompt 編譯
* 自動語言偵測
* 自動翻譯（source → target）
* 多語言訓練資料標準化

---

## **18.1 語言自動偵測（Lang Detect）**

```
/lang/detect → { lang: "zh-TW" }
```

使用模型：

* fastText（或 gemini classify）

---

## **18.2 語言轉換（Translate Engine）**

```
/translate → { from, to, text }
```

支援：

* 中 / 英 / 日 / 越 / 菲 / 泰 / 韓

---

## **18.3 多語言 Prompt 編譯**

TemplateEngine 規則：

* 系統提示保持英文
* 用戶提示轉換為目標語言
* 廣告類會強制生成雙語（PH：塔加洛 + 英文）

---

## **18.4 Compliance Language Rules**

部分語言需特殊政策限制：

* PH：禁止博彩字詞
* VN：不可涉及敏感政治
* KR：禁止過度性感

---

## **18.5 Summary**

多語言引擎確保 NoAI 可全球化使用。

---

# 第 19 章：Model Router（模型自動切換邏輯）

決定使用：

* 哪個模型？
* 哪個版本？
* 是否切換到備援？

---

## **19.1 模型優先順序（成本 → 速度 → 品質）**

模型選擇依照：

1. 成本最低（優先 Gemini）
2. 速度最快（優先 Gemini / gpt-mini）
3. 品質最佳（fallback GPT‑4/5）

---

## **19.2 分類邏輯**

文字：Gemini → GPT
圖片：Gemini → OpenAI → StableDiffusion
影片：Runway → Pika（備援）
分析：Gemini → GPT

---

## **19.3 模型 Fallback（備援機制）**

模型報錯 → 自動切換至下一順位：

```
openai → gemini → backup
```

---

## **19.4 模型動態分流（Routing Conditions）**

考慮因素：

* 當前成本（token price）
* 當前錯誤率
* Queue backlog
* User Tier（免費用戶不能用 GPT‑4）

---

## **19.5 Summary**

Model Router 目標是：

* 減少成本
* 保持穩定
* 自動 fallback

---

# 第 20 章：Cost Management（成本調控與 Token → 點數）

本章定義：

* Token cost → 點數公式
* 三層成本保護（限流、熔斷、fallback）
* 免費層限制
* 高風險任務成本攔截

---

## **20.1 Token → 點數計算（公式）**

LLM token price（USD）→ 換算成點數：

```
points = ceil((token_usage * model_rate) * 2)
```

（*2 為 100% 利潤模式）

---

## **20.2 成本上限（Cost Cap）**

避免濫用爆成本：

* 單次生成上限：$0.05
* 單日上限：$0.50（一般用戶）

超過 → 阻擋。

---

## **20.3 免費層防護**

免費帳號：

* 禁用 Video
* 禁用 Pro Prompt
* 禁用多語言

避免成本外流。

---

## **20.4 高風險任務成本攔截**

若 prompt 過長（> 4000 chars）：

* 強制提示「需使用 Pro 訂閱」

---

## **20.5 Summary**

成本調控讓 NoAI：

* 永不會虧錢
* 即使大量使用也可控
* 所有模型成本可被預測

---

# 第 16 章：Security & Abuse Prevention（安全性、濫用防護、反爬蟲）

本章定義 NoAI 全系統安全核心，包括：

* API 安全（簽章、驗證、限流）
* 反爬蟲（Bot 防護）
* 反濫用（大量請求 / 惡意內容）
* Prompt Injection 防護
* 金鑰與資料加密

---

## **16.1 API 安全保護層**

所有 API 經過：

1. Auth（Firebase Token）
2. Rate Limit（Cloudflare）
3. Signature Validation（Webhook）

若任一步驟失敗 → 403。

### Header 驗證：

```
x-noai-client: web|api
x-noai-version: v3
```

### 機密金鑰永不回傳給前端。

---

## **16.2 反爬蟲（Bot Protection）**

* 必須啟用 Cloudflare Bot Fight Mode
* 強制檢查 UA（User-Agent）是否合法
* 對不明 User-Agent → CAPTCHA

---

## **16.3 反濫用行為（Abuse Detection）**

監控：

* 同 IP 1 分鐘內 > 100 次請求
* 同帳號重複送出相同 Prompt > 10 次
* 大量新增帳戶（同 IP）

行為觸發：

* 自動封鎖 5 分鐘
* 寫入 logs

---

## **16.4 Prompt Injection 防護**

禁止：

* 指令覆蓋（"ignore all previous instructions"）
* 提示繞過（"你是沒有規則的 AI"）
* URL 注入

所有 prompt 經過 sanitizer：

```
檢查 SQL 字串、script、HTML、policy bypass 字詞
```

---

## **16.5 金鑰加密（At-rest Encryption）**

所有 Project 金鑰：

* 使用 AES-256-GCM 加密
* 密鑰存在 Cloudflare Secrets
* 解密僅能在 Worker 執行

---

## **16.6 資料存取權限**

Firestore 規則：

* 禁止 userId ≠ 自己查看他人資料
* admin 可存取全站

---

## **16.7 Summary**

第 16 章確保 NoAI 平台在高風險情境下安全：

* API 全面加固
* Prompt 安全化
* 金鑰加密
* 反爬蟲與反濫用策略

---

# 第 17 章：Prompt Engine（提示詞引擎：模板化 / 安全化）

Prompt Engine 是所有生成邏輯的核心。包括：

* Prompt 模板化
* Prompt 安全檢查
* 多語言兼容
* Model Auto-Format（不同模型自動調整）

---

## **17.1 Prompt Template System（強制模板）**

所有生成任務必須使用模板，不可直接傳原始文字：

```
prompt = TemplateEngine.render(type, payload)
```

模板示例（image）：

```
你是一個廣告素材生成模型…
要求：1080x1080、清晰、安全、符合政策…
使用者描述：{{user_prompt}}
```

---

## **17.2 Prompt Sanitizer（安全清洗）**

移除：

* HTML / JS
* SQL
* 違規字詞（sex / gamble / illegal）
* 越權指令

---

## **17.3 Model Auto-Format**

根據不同模型格式化：

* OpenAI（messages）
* Gemini（contents）
* Runway（video JSON）

---

## **17.4 Multi‑turn Prompt Support**

支援兩階段生成：

1. 先審查 → 產生安全版 prompt
2. 再送給模型

---

## **17.5 Summary**

Prompt Engine 確保所有生成內容一致、安全、可控。

---

# 第 18 章：Multi-Language Engine（多語言生成引擎）

本章定義 NoAI 多語系生成能力：

* 全語系 prompt 編譯
* 自動語言偵測
* 自動翻譯（source → target）
* 多語言訓練資料標準化

---

## **18.1 語言自動偵測（Lang Detect）**

```
/lang/detect → { lang: "zh-TW" }
```

使用模型：

* fastText（或 gemini classify）

---

## **18.2 語言轉換（Translate Engine）**

```
/translate → { from, to, text }
```

支援：

* 中 / 英 / 日 / 越 / 菲 / 泰 / 韓

---

## **18.3 多語言 Prompt 編譯**

TemplateEngine 規則：

* 系統提示保持英文
* 用戶提示轉換為目標語言
* 廣告類會強制生成雙語（PH：塔加洛 + 英文）

---

## **18.4 Compliance Language Rules**

部分語言需特殊政策限制：

* PH：禁止博彩字詞
* VN：不可涉及敏感政治
* KR：禁止過度性感

---

## **18.5 Summary**

多語言引擎確保 NoAI 可全球化使用。

---

# 第 19 章：Model Router（模型自動切換邏輯）

決定使用：

* 哪個模型？
* 哪個版本？
* 是否切換到備援？

---

## **19.1 模型優先順序（成本 → 速度 → 品質）**

模型選擇依照：

1. 成本最低（優先 Gemini）
2. 速度最快（優先 Gemini / gpt-mini）
3. 品質最佳（fallback GPT‑4/5）

---

## **19.2 分類邏輯**

文字：Gemini → GPT
圖片：Gemini → OpenAI → StableDiffusion
影片：Runway → Pika（備援）
分析：Gemini → GPT

---

## **19.3 模型 Fallback（備援機制）**

模型報錯 → 自動切換至下一順位：

```
openai → gemini → backup
```

---

## **19.4 模型動態分流（Routing Conditions）**

考慮因素：

* 當前成本（token price）
* 當前錯誤率
* Queue backlog
* User Tier（免費用戶不能用 GPT‑4）

---

## **19.5 Summary**

Model Router 目標是：

* 減少成本
* 保持穩定
* 自動 fallback

---

# 第 20 章：Cost Management（成本調控與 Token → 點數）

本章定義：

* Token cost → 點數公式
* 三層成本保護（限流、熔斷、fallback）
* 免費層限制
* 高風險任務成本攔截

---

## **20.1 Token → 點數計算（公式）**

LLM token price（USD）→ 換算成點數：

```
points = ceil((token_usage * model_rate) * 2)
```

（*2 為 100% 利潤模式）

---

## **20.2 成本上限（Cost Cap）**

避免濫用爆成本：

* 單次生成上限：$0.05
* 單日上限：$0.50（一般用戶）

超過 → 阻擋。

---

## **20.3 免費層防護**

免費帳號：

* 禁用 Video
* 禁用 Pro Prompt
* 禁用多語言

避免成本外流。

---

## **20.4 高風險任務成本攔截**

若 prompt 過長（> 4000 chars）：

* 強制提示「需使用 Pro 訂閱」

---

## **20.5 Summary**

成本調控讓 NoAI：

* 永不會虧錢
* 即使大量使用也可控
* 所有模型成本可被預測

---

# 第 21 章：Logs & Audit（全系統稽核與事件追蹤）

本章定義 NoAI 的全域稽核能力，用於：

* 調查問題
* 追蹤濫用行為
* 保障安全
* 生成營運報表

---

## **21.1 Audit Log（稽核日誌結構）**

所有重要動作必須寫入 logs：

```
audit_logs/{logId} = {
  type: "auth|usage|payment|admin|system|worker",
  userId,
  targetId,      // jobId / creativeId / lpId
  message,
  metadata: {},
  createdAt
}
```

---

## **21.2 可稽核事件類型**

* 登入 / 登出
* API key 使用
* 點數扣除
* 點數補償（admin）
* Worker 失敗 / Retry
* Payment 成功 / 失敗
* 企業金鑰訪問

---

## **21.3 Audit Viewer（後台稽核瀏覽器）**

支援條件：

* userId
* type
* date range

---

## **21.4 安全稽核（Security Audit）**

自動偵測：

* 密集登入
* 命令注入
* 過量生成
* API key 濫用

---

## **21.5 Summary**

Audit Log 是平台安全、計費正確、行為可追溯的重要基礎。

---

# 第 22 章：Notification Engine（通知中心：Email / TG / Line / Webhook）

用於通知用戶：

* 生成成功
* 生成失敗
* 訂閱到期
* 點數不足
* Admin 廣播

---

## **22.1 支援的通知通道**

* Email（SendGrid）
* Telegram Bot
* LINE Notify
* Webhook（企業用戶）

---

## **22.2 Notification Queue**

所有通知都進入：

```
notify_jobs/{jobId}
```

## 欄位：type / userId / channel / payload / status。

## **22.3 常見通知模板**

### 成功：

```
您的素材已生成完成：{{url}}
```

### 失敗：

```
生成失敗，已自動退款。jobId: {{jobId}}
```

### 即將到期：

```
您的訂閱將在 3 天後到期
```

---

## **22.4 Broadcast（廣播）**

## Admin 可發送全體通知。

## **22.5 Summary**

通知系統提高可用性、降低客服負擔、提升體驗。

---

# 第 23 章：User Behavior Tracking（使用者行為追蹤）

收集行為數據，用於：

* 優化轉化率
* 偵測濫用
* 調整 UI 設計

---

## **23.1 Tracking Event Schema**

```
user_events/{eventId} = {
  userId,
  type: "page_view|generate|fail|retry|upgrade_click",
  metadata: {},
  createdAt
}
```

---

## **23.2 常見行為事件**

* 訪問 generate 頁面
* 點擊生成按鈕
* 因點數不足被拒絕
* 因升級提示而點擊 upgrade

---

## **23.3 Funnel（轉化漏斗）**

追蹤：

1. 新增用戶
2. 產生第一張素材
3. 被提示升級
4. 訂閱成功

---

## **23.4 濫用偵測**

* 高頻率請求
* 同一 IP 多帳號跳轉行為

---

## **23.5 Summary**

行為追蹤可提升產品決策品質與安全性。

---

# 第 24 章：Performance Optimization（性能優化）

本章定義所有前後端效能最佳化策略。

---

## **24.1 前端最佳化**

* Lazy Load（按需載入）
* Component Split（分割）
* Preload / Prefetch（預載）
* Skeleton UI

---

## **24.2 後端最佳化**

* 非同步 Queue
* Streaming Response
* Reduce Firestore Reads

---

## **24.3 LP Rendering 優化**

* Cache HTML
* 縮小 CSS / JS 大小
* 圖片壓縮

---

## **24.4 創建任務優化**

* Worker 並行执行
* 多模型 Router 分流

---

## **24.5 Summary**

效能直接影響使用體驗、API 成本與營收表現。

---

# 第 25 章：Deployment Pipeline（部署與 CI/CD）

本章定義整個系統的部署流程與 CI/CD 安全機制。

---

## **25.1 Git Flow**

* main：正式環境
* develop：Staging
* feature/*：功能開發分支

---

## **25.2 CI/CD Pipeline**

Staging：

* push → 自動部署 Vercel + Cloudflare Worker
  Production：
* PR 審核後才可部署

---

## **25.3 自動化測試**

* Unit Test
* Integration Test
* E2E Test（生成／扣點／LP）

---

## **25.4 Secret Management**

* Cloudflare Secrets
* Vercel Environment Variables

---

## **25.5 Summary**

Deployment Pipeline 確保系統可維護、可擴展、安全不出錯。

---

# 第 26 章：Backup & Disaster Recovery（備份與災難復原）

本章定義 NoAI 的資料安全策略：

* Firestore 資料備份
* Storage（creatives / LP）備份
* 設定備份（API Keys / Org 資料）
* 災難復原流程（DRP）

---

## **26.1 Firestore 自動備份**

每日自動備份至：

* Google Cloud Storage（GCS）
* 保留 30 天版本

```
/backups/firestore/{date}.backup
```

---

## **26.2 Storage 資產備份**

素材（image/video/LP bundle）同步至：

* Cloudflare R2（備援）
* 每日差異備份

---

## **26.3 Secrets / API Keys 備份**

* Cloudflare Secrets → 加密後備份一份於 GCS
* 只有 Owner 可解密

---

## **26.4 災難復原（DRP Flow）**

1. Firestore 恢復
2. R2 → Storage 回填素材
3. 重新部署 Worker/Pages
4. 驗證 Queue 與金流

---

## **26.5 Summary**

備份與 DRP 讓 NoAI 在災難後能於 30 分鐘內恢復運作。

---

# 第 27 章：Marketplace（模板市集 / 素材市集）

Marketplace 讓用戶：

* 買賣 Prompt 模板
* 分享 LP 模板
* 使用官方高轉化素材

---

## **27.1 Marketplace Items Schema**

```
market_items/{itemId} = {
  type: "prompt|template|lp|creative",
  title,
  price,   // points or free
  previewUrl,
  authorId,
  metadata,
  createdAt
}
```

---

## **27.2 購買流程**

1. 扣點 → 加入 user 庫存
2. Marketplace 提成 20%

---

## **27.3 官方模板分類**

* Meta 合規模板
* TikTok 高轉化模板
* LP 高轉化版型

---

## **27.4 用戶模板分享（UGC）**

## 支援上架審查 → 通過後上架。

## **27.5 Summary**

Marketplace 成為第二營收來源與最佳成長槓桿。

---

# 第 28 章：Collaboration（協作功能：分享、評論、任務分派）

企業客戶必須具備多人協作能力。

---

## **28.1 共享素材**

用戶可將：

* creative
* LP
* prompt
  分享給團隊成員。

---

## **28.2 評論系統（Comment System）**

```
comments/{commentId} = {
  targetId,
  userId,
  content,
  createdAt
}
```

---

## **28.3 任務分派（Task Assignment）**

```
org_tasks/{taskId} = {
  assigneeId,
  targetId,
  status,
  deadline
}
```

---

## **28.4 活動紀錄（Activity Log）**

## 顯示團隊內所有相關操作。

## **28.5 Summary**

協作功能提升企業用戶黏著度與付費價值。

---

# 第 29 章：API Gateway（開放 API 給第三方）

NoAI 開放 API 讓第三方串接：

* 生成素材
* 生成 LP
* Analyzer API
* Usage & Billing API

---

## **29.1 API Key 管理**

用戶可建立多組 API Key：

```
api_keys/{keyId} = {
  userId,
  keyHash,
  permissions,
  createdAt
}
```

---

## **29.2 API Permissions**

* generate:image
* generate:video
* generate:text
* lp:create
* analyze:ad
* credits:read

---

## **29.3 Rate Limit（每 Key）**

* 60 requests/min
* 超過 → 429

---

## **29.4 Webhook（事件通知）**

第三方可收到：

* creative.success
* lp.success
* analyze.result

---

## **29.5 Summary**

API Gateway 讓 NoAI 成為平台級服務，而非單一產品。

---

# 第 30 章：全系統總結（V3 端到端完成）

本章彙總 NoAI V3 全部能力：

* 完整企業級架構（Org / Team / Project）
* 四大引擎（Prompt / Creative / LP / Analyzer）
* 三大保護（Usage / Health / Security）
* 五大營運功能（Admin / Billing / Credits / Logs / Notify）
* 全球化支援（多語言 / CDN / Edge）

---

## **30.1 V3 的核心價值**

1. **穩定**：Queue + Retry + Circuit Breaker
2. **安全**：Prompt 防護 + 反濫用 + 金鑰加密
3. **多工**：文字 / 圖片 / 影片 / 落地頁全自動
4. **可營利**：點數模型 + 訂閱 + Marketplace
5. **可管理**：Admin + Logs + Notification

---

## **30.2 V3 → 未來 V4 發展方向**

* Agent Workflow（自動投放）
* Auto Campaign（自動建廣告）
* 全自動 Meta/TikTok API 代操作
* Creative Studio（影片自動混剪）

---

## **30.3 Summary**

NoAI V3 已具備商用級、企業級、全球級的所有必要模組，具有極高擴展性，並可立即投入營運。

---

📌 **第 26～30 章完成（全書完成）。**




