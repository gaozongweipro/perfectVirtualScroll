# 🚀 PerfectVirtualScroll：极速无感虚拟列表

基于最近非常火热的高性能文字排版无 DOM 测量库 [@chenglou/pretext](https://github.com/chenglou/pretext) 打造出的一款 **完美且极致流畅的长列表虚拟滚动通用组件**。

此项目立足于解决以往所有动态高度虚拟列表（依赖于给一个“预估高度”，并在渲染真 DOM 后重新进行 `getBoundingClientRect()` 测算的方案）引发的灾难级性能回流、滚动条抖屏、底部重绘导致视窗回跳等核心痛点。

---

## ✨ 核心特性

- ⚡️ **纯数学算力超越 DOM 瓶颈**：不依赖元素渲染去测绘高度，改用 Pretext 纯数学结合 Canvas API 做毫秒级的十万条文本矩阵排版运算计算节点高度。
- 🧊 **滚动条极度稳定**：因为一旦计算完毕，所有十万条数据的高度落点均绝对精准，即使是长短不一的聊天记录和大数据排版，往下滚动或跳转锚点时滚动条都**绝对不会存在任何闪烁变化或跳动**。
- 🔥 **Vue3 Composition API 构建**：全部采用最新的 `<script setup>` 极简语法，内存处理利用了 `shallowRef` 和 `Float64Array` 定型化数组在 JS 引擎中拉满遍历执行速度。
- 🧩 **高通用且纯粹**：将数据的测算逻辑与模板样式剥离，本组件本身不产生任何多余封装，你仅需注入数组与对应的高度测量函数，即插即用，满足市面上绝大部分的滚动场景。

## 📦 项目安装与启动

本项目基于 **Vite + Vue3 (TypeScript)** 构建。请确保你的环境中安装有 Node.js。

```bash
# 1. 安装项目依赖（含核心依赖 @chenglou/pretext）
npm install

# 2. 启动本地测试环境
npm run dev

# 3. 生产环境构建 NPM Component Library
npm run build
```

## 💡 如何使用 `PerfectVirtualScroll` 通用组件？

本项目已将核心虚拟滚动逻辑抽离封装至 `src/components/PerfectVirtualScroll.vue` 中，你只需要像如下这般引入并定义对应的计算函数即可使用。

### 1. 基础调用与 Props 规范

```vue
<template>
  <PerfectVirtualScroll
    :data="messages"
    keyField="id"
    :measureItem="measureMessage"
    :buffer="10"
    v-slot="{ item }"
  >
    <!-- 这里放置你完全自定义的卡片或DOM结构 -->
    <div class="message-card">
      <div class="header">序号 #{{ item.id }}</div>
      <div class="body" v-text="item.text"></div>
    </div>
  </PerfectVirtualScroll>
</template>
```

| 参数属性    | 类型 | 说明 |
| ----------- | ----------- | ----------- |
| `data`      | `Array<any>` | 必须。海量的长列表数据源（建议不要使用嵌套过深的响应式 Proxy 对象包裹十万数据，推荐用浅引用 `shallowRef`）。 |
| `keyField`  | `string \| Function` | 必须。数据的唯一键值字段名，或返回键值的函数，例如 `'id'` 或 `(item) => item.id` 以稳定 Vue 节点复用。 |
| `measureItem`| `(item: any, width: number) => number` | 必须。高度预打标函数：接收该节点的数据与所在容器当前的真实宽度，利用 `pretext` 算得并返回实际需要的高度像素值。 |
| `buffer`    | `number` | 可选（默认 6）。在可视区域上、下边缘需要多预渲染几个列表项的缓存量，以防止快速滑动时的白屏漏缝。 |

### 2. 利用 Pretext 的算力实现测绘

当需要处理**高度不可预测**的内容块时，你需要配合使用 `@chenglou/pretext` 测量其中的文字流高度（具体实现可参照 `App.vue`）：

```ts
import { prepare, layout } from '@chenglou/pretext';

// 你必须保证与界面实际使用的 CSS 字体和行高严格匹配
const FONT = '14px "Inter", Arial, sans-serif'; 
const LINE_HEIGHT = 20;
// 其他附加留白或边距产生的高度
const ITEM_PADDING_Y = 45; 

// 1. 在获取数据的阶段，就使用 prepare 进行解析（通常很耗时，可以用异步）
const preparedText = prepare(content, FONT);

// 2. 传递给 VirtualList 的 measureItem 方法执行 Layout
const measureMessage = (item, containerWidth) => {
  // 假定外部 Padding 扣减后可用排版的净文字宽度
  const textAvailableWidth = containerWidth - 32; 
  // 超高速算得所需多行或者单行文本的具体高度
  const { height } = layout(item.preparedText, Math.max(0, textAvailableWidth), LINE_HEIGHT);
  // 返还给虚拟列表组件记录该节点的总高度
  return height + ITEM_PADDING_Y;
};
```

## 📖 开发常见问题及避坑指南
如果在开发虚拟列表场景时遇到滚动错乱、卡顿、白屏不更新情况，在排查代码逻辑之前，强烈建议先阅读根目录下梳理的：

👉 [**error.md 开发避坑指南**](./error.md)

## 🚀 在其他项目中复用本组件的两种方案

### 方案 A：源码级引入（最轻量且灵活・强烈推荐）
由于本组件以追求极简为目标开发（单文件无额外冗余状态），在企业级应用中，最有效率的方案即拷贝。

1. **直接复制**：复制 `src/components/PerfectVirtualScroll.vue` 到新项目的组件目录下。
2. **安装测绘依赖**：在你的新项目中安装 `pretext` 核心算法库：
   ```bash
   npm install @chenglou/pretext
   ```
3. 在新项目中参照本仓库中 `App.vue` 传递测绘函数的方法引入即可！

### 方案 B：作为 NPM 库管理
本库已遵循 NPM 分发标准打包策略进行构建，你可以直接引用打包产物：

1. **利用包管理器依赖**：在新项目中修改 `package.json` 直接指派到此路径关联：
   ```json
   {
     "dependencies": {
       "perfect-virtual-scroll": "file:../相对路径/finalVirtualScroll"
     }
   }
   ```
2. 运行 `npm install` 后，即可像使用第三方 UI 库相同的方式 `import { PerfectVirtualScroll } from 'perfect-virtual-scroll'` 进行消费。

---
*Developed with the principle of minimal mutations, elegant code structures, and ultimate web performance!*
