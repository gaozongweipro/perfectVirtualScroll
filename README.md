# 🚀 perfect-virtual-scroll：极速无感虚拟列表

基于最近非常火热的高性能文字排版无 DOM 测量库 [@chenglou/pretext](https://github.com/chenglou/pretext) 打造出的一款 **完美且极致流畅的长列表虚拟滚动通用组件 (Vue3)**。

此项目立足于解决以往所有动态高度虚拟列表（依赖于“预估高度”方案，并在渲染真实 DOM 后重新测算的高度塌陷）引发的性能回流、滚动条抖屏、底部重绘导致视窗回跳等核心痛点。

---

## ✨ 核心特性

- ⚡️ **纯数学算力超越 DOM 瓶颈**：不依赖元素渲染去测绘高度，纯数学结合 Canvas API 毫秒级排版运算，计算十万条节点高度。
- 🧊 **滚动条极度稳定**：所有数据落点绝对精准，即便长短不一的聊天记录，往下滚动或跳转锚点时，**滚动条绝对不会存在闪烁或跳动**。
- 🔥 **Vue3 Composition API**：极简 `<script setup>` 语法，使用 `shallowRef` & `Float64Array` 压榨 JavaScript 引擎遍历极速。
- 🧩 **高通用且纯粹**：完全解耦测算逻辑与模板样式，即插即用，满足市面上绝大部分复杂滚动场景。

---

## 📦 安装与配置 (Installation)

由于本库以 NPM 标准库形式发布，您可以在任何 Vue 3 项目中轻松快捷地集成：

### 1. 安装核心依赖包
通过 npm、yarn 或 pnpm 安装本组件库以及核心前置测绘算法库：

```bash
npm install perfect-virtual-scroll @chenglou/pretext
```

*(说明：`@chenglou/pretext` 是核心计算引擎包，用于纯数学级别的文字预检与排版长宽计算，为虚拟列表提供不可或缺的高效测数基石。)*

### 2. 页面中引入并注册
在使用该虚拟滚动的业务组件页中（或作为全局组件）进行导入：

```ts
import { PerfectVirtualScroll } from 'perfect-virtual-scroll';
// 如果有独立样式的需要，请通过这种方式引入预编译的 css（大部分纯净组件不需要）
// import 'perfect-virtual-scroll/dist/style.css'; 
```

---

## 🔨 快速上手指南 (Quick Start)

以下代码展示了在一套真实业务环境（譬如拥有极高数量级长短不一的文本卡片列阵）中调用本库的**最佳极简形态**：

```vue
<template>
  <div class="list-container" style="height: 600px; width: 100%;">
    <!-- 父容器必须拥有固定的或者相对弹性的高度边界，方能触发展示限制 -->
    
    <PerfectVirtualScroll
      :data="messages"
      keyField="id"
      :measureItem="measureMessage"
      :buffer="10"
      v-slot="{ item }"
    >
      <!-- 下面放置您完全自定义的 UI 卡片或插槽内容 -->
      <div class="message-card">
        <div class="header">用户消息 #{{ item.id }}</div>
        <div class="body" v-text="item.text"></div>
      </div>
    </PerfectVirtualScroll>
    
  </div>
</template>

<script setup lang="ts">
import { PerfectVirtualScroll } from 'perfect-virtual-scroll';
import { prepare, layout } from '@chenglou/pretext';

// ----------------------------------------------------
// 1. 常量测绘准备
// 非常关键：必须保证这里的 FONT 和 LINE_HEIGHT 与下方由于 CSS 赋予 .body 的样式属性完全一致！
// ----------------------------------------------------
const FONT = '14px "Inter", Arial, sans-serif'; 
const LINE_HEIGHT = 20;


// ----------------------------------------------------
// 2. 模拟请求回来的后台数据并预演排版
// ----------------------------------------------------
const messages = [
  /* { id: 1, text: "极长或者极短的不可预测高度的聊天内容..." } */
];

// 非常推荐：在拉取接口数据后立即缓存 prepare，避免同一长字符串在滚动时被重复解析 Canvas 造成卡顿
messages.forEach(msg => {
  msg.preparedText = prepare(msg.text, FONT);
});


// ----------------------------------------------------
// 3. 高度前置打标计算钩子 (重点方法)
// 该函数在容器尺寸变更、挂载以及数据涌入时瞬间被底层抛出调用
// ----------------------------------------------------
const measureMessage = (item, containerWidth) => {
  // PADDING_Y = 您的 .message-card 上下边距 + .header 高度等任何会占用 Y 轴排版的其他非文本区域高度
  const PADDING_Y = 45; 
  // 抛弃容器由于 margin/padding 等带来的内容文字流收缩空隙
  const textAvailableWidth = containerWidth - 32; 

  // 用 pretext 的内置算法瞬间拿到仅属于纯文本占用的有效物理高度
  const { height } = layout(item.preparedText, Math.max(0, textAvailableWidth), LINE_HEIGHT);
  
  // 返还给 PerfectVirtualScroll 此处索引元素的确切相加后高度
  return height + PADDING_Y;
};
</script>

<style scoped>
/* 此部分 CSS 定义的高度边界参数，必须直接参与上方的 measureMessage 运算 */
.message-card {
  padding: 12px 16px; /* 抽离了 32px 的可用宽度 */
  border-bottom: 1px solid #eee;
}
.header {
  height: 20px; /* 并合进了 45px 的 Y轴干扰项 */
  margin-bottom: 8px; /* 间接并合 */
}
.body {
  font-family: "Inter", Arial, sans-serif;
  font-size: 14px;
  line-height: 20px;
}
</style>
```

---

## ⚙️ 核心 Props (API)

| 参数属性    | 类型 | 说明 |
| ----------- | ----------- | ----------- |
| `data`      | `Array<any>` | **必须**。海量长数据源。强烈要求：外部不要使用 `reactive` 或复杂的 `Proxy` 深层包裹十万级数据引发响应式开销灾难，最佳实践为业务层外部声明 `shallowRef` 包裹。 |
| `keyField`  | `string \| Function` | **必须**。节点追踪唯一键值，或返回键值的方法回调：`'id'` 或 `(item) => item.id`。 |
| `measureItem`| `(item: any, width: number) => number` | **必须**。节点高度探测函数：向外暴露对应列表项与所在容器的实时物理宽度，强迫您前置返回具体物理像素高度。 |
| `buffer`    | `number` | **可选** (默认 `6`)。指定在上下可视区域边界之外继续保持激活的节点数量。用于缓冲快速、猛烈滑动造成的白屏延迟与渲染穿透现象。 |


## 📖 开发异常避免与调优准则
如果在开发前沿技术时遇到了长片段 Task 性能耗光、卡顿、高度落差抖动、列表内容不更新等反常现象，切记首读：

👉 [**error.md 性能优化与避坑指南**](./error.md)

---
*Developed with the principle of minimal mutations, elegant code structures, and ultimate web performance!*
