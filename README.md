# Keyword Dictionary Notes

![product-header](https://github.com/wantZzz/Keyword-Dictionary-Notes/blob/main/__assets__/readme-header.png)

## 一個瀏覽器上的跨網頁筆記擴充功能

本擴充功能運作於 Chrome、edge 瀏覽器上，旨在為使用者解決:

- 頻繁切換筆記軟體與網頁瀏覽器畫面的操作
- 找不到網頁中提到而自己曾記錄過的資訊、筆記
- 臨時想不起一個名詞的意思或一件事的過程 (如果你有寫下來的話)
- 上一次打開這網頁在做什麼 (如果你有寫下來的話)

你可以在 [這裡](https://github.com/wantZzz/Keyword-Dictionary-Notes/releases/latest) 找到最新版本並以載入未封裝項目安裝本擴充功能

### 以關鍵字與網址為索引的筆記

![readme-content-1](https://github.com/wantZzz/Keyword-Dictionary-Notes/blob/main/__assets__/readme-content-1.png)

Keyword Dictionary Notes 採用 **關鍵字** 與 **網址** 作為每筆筆記的索引

當使用者瀏覽到特定網頁或關鍵字，側邊欄與擴充功能在網頁中插入的懸浮視窗將顯示使用者關於該索引下使用者曾做過的筆記

### 快速建立、查找關鍵字筆記

![readme-content-2](https://github.com/wantZzz/Keyword-Dictionary-Notes/blob/main/__assets__/readme-content-2.png)

支持 **快速框選網頁關鍵字並開啟功能表建立筆記**，並透過側邊欄建立新筆記

打開側邊欄會顯示最近十個查看常用的關鍵字筆記並提供搜尋功能查找已記錄的關鍵字

### 同時搜尋網頁上多個關鍵字位置

![readme-content-3](https://github.com/wantZzz/Keyword-Dictionary-Notes/blob/main/__assets__/readme-content-3.png)

不同於 Chrome 瀏覽器 Ctrl+F 只能搜尋網頁中一個關鍵字

Keyword Dictionary Notes 能 **同時搜尋多個關鍵字並標記** 出來，即便同一位置有多個關鍵字存在也能分辨並展示其筆記

### 在各個影片或討論區獨立索引

![readme-content-4](https://github.com/wantZzz/Keyword-Dictionary-Notes/blob/main/__assets__/readme-content-4.png)

專對不同主流網站進行分類，並 **依其性質與特色為其建立獨立網址索引與主頁區分**

目前支持 Google (搜尋)、Youtube (影片)、Twitch (頻道)、巴哈姆特 (哈拉區與用戶小屋)、Bing (搜尋)，未來使用者可自訂規則為其長瀏覽網站進行分類

## 快速安裝擴充功能

> [!IMPORTANT]
> 由於 Chrome 的資安政策不允許使用者自行安裝未列在 Chrome 線上應用程式商店 中的擴充功能，故請以 __載入未封裝項目__ 方式安裝本擴充功能

1. 開啟 Chrome 管理擴充功能
2. 開啟 開發人員模式
3. 載入未封裝項目並選取解壓縮完的資料夾
4. Have Fun!

## 擴充功能權限

> [!CAUTION]
> 本擴充功能 **預設要求可讀取網頁為所有 http/https 協定下的網頁** 
> 你可以於 [chrome 擴充功能設定頁](chrome://extensions/) 中設定本擴充功能的網站存取權

詳細權限可從 [chrome developer](https://developer.chrome.com/docs/extensions/reference/permissions-list) 查看各權限授予本擴充功能可運用的範圍

| 要求權限         | 用途與說明  			           | 對應權限名稱    |
| -------------- | --------------------------------- | ------------ |
| 插入指令碼與樣式  | 用於搜尋網頁中的關鍵字與插入懸浮視窗     | "scripting" |
| 讀取網頁內容     | 用於搜尋網頁中的關鍵字				  | "activeTab" |
| 顯示通知         | 用於反饋與確認使用者操作		       | "notifications" |
| 儲存            | 用於存儲筆記資料(存於chrome)	     | "storage" |
| 側邊欄使用       | 用於顯示筆記資料			        | "sidePanel" |
| 功能表使用       | 用於快速建立關鍵字索引			      | "contextMenus" |
| 快速鍵          | 建立搜尋與開啟側邊欄的快速鍵		      | "commands" |

## 第三方開源程式

- 本插件使用了 [CKSource Holding sp.](https://cksource.com/) 的 Ckeditor 5 的客製化編輯器用於輸入筆記內容
