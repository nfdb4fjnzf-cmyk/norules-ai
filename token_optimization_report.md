# Token Reduction & Optimization Report

## 1. 現狀分析 (Current Status)

目前的提示詞 (Prompt) 採用「一體適用 (One-size-fits-all)」的結構，無論是生成文案、圖片還是影片，都會包含所有的欄位指令。

**現有問題：**
1.  **冗餘資訊**：生成「文案 (Copy)」時，卻包含了「長寬比 (Aspect Ratio)」、「視覺風格 (Visual Style)」、「畫面元素 (Elements)」、「解析度 (Resolution)」等與文字無關的指令。
2.  **Token 浪費**：這些無效指令佔用了約 40% - 60% 的系統預設 Token 消耗。
3.  **干擾模型**：過多的視覺描述可能會讓 LLM 困惑，導致生成的文案包含不必要的視覺描述文字。

**當前 Prompt 結構 (約 150-200 Tokens + 用戶輸入)：**
```text
Act as a professional creative generator...
Key Selling Points...
Creative Details:
- Aspect Ratio: ... (文案不需要)
- Visual Style: ... (文案不需要)
- Elements: ... (文案不需要)
Special Instructions:
- If Image, resolution... (文案不需要)
- If Video, resolution... (文案不需要)
```

---

## 2. 優化方案：動態提示詞組裝 (Dynamic Prompt Assembly)

我們將根據 `creativeType` (素材類型) 動態構建提示詞，將 Token 消耗降至最低。目標是針對「文案生成」場景減少 90% 的**系統指令 Token**。

### 策略 A：針對「文案生成」的極簡模式 (Text-Only Mode)
**適用類型**：Social Post, Ad Headline, Product Description, Script
**優化邏輯**：
*   移除所有視覺相關參數 (Ratio, Style, Elements, Resolution)。
*   移除 Output Format (PNG/MP4)。
*   精簡角色設定與欄位標籤。

**優化後 Prompt 範例 (約 20-30 Tokens + 用戶輸入)：**
```text
Role: [Platform] Copywriter.
Task: Write [Format] for [Brand] [Product].
Goal: [Goal]. Audience: [Audience]. Tone: [Tone].
Points: [Key Selling Points].
Lang: [Language].
Compliance: [Compliance Mode].
```

### 策略 B：針對「視覺生成」的詳細模式 (Visual Mode)
**適用類型**：Image, Video, Banner
**優化邏輯**：
*   保留視覺參數，但移除純文案相關的冗長敘述。
*   專注於畫面描述 (Visual Description)。

---

## 3. 預期成效 (Estimated Savings)

以生成一篇 Facebook 貼文為例：

| 項目 | 原始方案 (Original) | 優化方案 (Optimized) | 節省幅度 |
| :--- | :--- | :--- | :--- |
| **系統指令 (System Instructions)** | ~120 Tokens | ~15 Tokens | **-87.5%** |
| **無效參數 (Irrelevant Params)** | ~50 Tokens | 0 Tokens | **-100%** |
| **總計 (Total Overhead)** | **~170 Tokens** | **~15 Tokens** | **~91%** |

*(註：用戶輸入的內容長度無法控制，但系統指令部分可達到約 90% 的縮減)*

## 4. 執行計畫 (Implementation Plan)

1.  **重構 `handleSubmit`**：
    *   引入 `buildTextPrompt()` 與 `buildVisualPrompt()` 兩個獨立函數。
    *   根據 `isVisual` 變數決定呼叫哪一個函數。
2.  **實作極簡模板**：
    *   使用縮寫標籤 (e.g., "Target Audience" -> "Audience")。
    *   移除所有 "If Image...", "Visual Style..." 等條件句。

此方案將在不影響生成品質的前提下，顯著降低 Token 成本並提升生成速度。
