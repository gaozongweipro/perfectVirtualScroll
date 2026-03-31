<template>
  <div class="app-wrapper">
    <h1>基于 Pretext 的完美虚拟列表</h1>
    <p class="subtitle">极致性能：展示高达 50,000 条高度完全不确定的数据，无滚动跳屏、零闪动计算。</p>
    
    <!-- 加载中遮罩 -->
    <div v-if="loading" class="loading-state">
      正在利用 Pretext 和 Canvas 进行预备测算（10万数量级大约耗时半秒...）
    </div>

    <!-- 中文注释：我们的通用虚拟列表组件 -->
    <div v-else class="list-wrapper">
      <VirtualList
        :data="messages"
        keyField="id"
        :measureItem="measureMessage"
        :buffer="10"
        v-slot="{ item }"
      >
        <div class="message-card">
          <div class="message-header">消息序号 #{{ item.id }}</div>
          <div class="message-body" v-text="item.text"></div>
        </div>
      </VirtualList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import VirtualList from './components/VirtualList.vue';
import { prepare, layout } from '@chenglou/pretext';

// 数据实体限定
interface Message {
  id: number;
  text: string;
  preparedText: any; // 用于暂存 prepare 输出的数据，以供后续 layout
}

const messages = ref<Message[]>([]);
const loading = ref(true);

// 字体与行高常量：这非常关键，一定要和下面的 CSS 内容样式保持一致
const FONT = '14px "Inter", Arial, sans-serif'; 
const LINE_HEIGHT = 20;

/* 
 * 动态高度的像素偏差计算 (非常严谨):
 * 卡片上下 padding: 12px + 12px = 24px
 * 头部占用与下边距边框综合:
 * message-header 字体 12px + mb 8px = 20px
 * border-bottom = 1px
 * 总额外偏离值: 45px
 */
const ITEM_PADDING_Y = 45; 

// 生成随机大数据
onMounted(() => {
  // 为了不阻塞页面初始渲染，我们将其延迟执行
  setTimeout(() => {
    const data: Message[] = [];
    const baseTexts = [
      "简短的对话。",
      "这是一句长一点的消息，可以覆盖多半行的空间区域测试。",
      "现在是一段由于超过容器宽度而肯定会折行的句子。传统虚拟列表在面对这种文本时，如果采用推算预估的方式，极容易产生回弹、底部跳屏等抖动问题！而借助于 Pretext 无与伦比的数学排版计算预获取策略，DOM没有参与任何测量流程。",
      "性能测试2：不接触 DOM 进行排版的魅力！",
      "更长的文本：如果你面对十万级的长短信聊天框，每一次重调整或屏幕翻转都会使得全部视图被毁。使用 Pretext 后所有的字形边界与路由将提前计算完毕，再交给我们的 VirtualList 来完成渲染工作。这代表了现今前端最科学、最低开销的文本测量架构之一！"
    ];
    
    for(let i = 0; i < 50000; i++) {
        let content = baseTexts[Math.floor(Math.random() * baseTexts.length)];
        // 刻意制造超长文本
        if (i % 7 === 0) content = content + " " + content;
        if (i % 20 === 0) content = content + " " + content + " " + content;
        
        // 关键调用：文字测算的准备工作。
        // （在此处预热，实际上也可选择在 VirtualList 每次算高函数内进行按需懒计算后缓存）
        const preparedText = prepare(content, FONT);
        
        data.push({
          id: i,
          text: content,
          preparedText
        });
    }
    messages.value = data;
    loading.value = false;
  }, 100);
});

// 计算项高度函数
const measureMessage = (item: Message, containerWidth: number) => {
  // 假定我们的父级 padding 和自身内阴影等会缩减可用文字流的宽度
  // .message-card 的内左右 padding 是 16px + 16px = 32px
  const textAvailableWidth = containerWidth - 32; 
  
  // 这句代码由 Pretext 提供，性能恐怖的好
  const { height } = layout(item.preparedText, Math.max(0, textAvailableWidth), LINE_HEIGHT);
  
  return height + ITEM_PADDING_Y;
};
</script>

<style>
/* 抹平原生和默认边距 */
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #0f172a; /* 现代的夜间模式蓝灰色 */
  color: #f8fafc;
  font-family: "Inter", Arial, sans-serif;
}

.app-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  font-size: 1.5rem;
  margin-bottom: 8px;
  margin-top: 0;
  text-align: center;
  color: #38bdf8;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.subtitle {
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
  margin-bottom: 24px;
  margin-top: 0;
}

.loading-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #38bdf8;
  font-size: 14px;
  border-radius: 12px;
  background-color: rgba(30, 41, 59, 0.5);
  border: 1px dashed #334155;
}

.list-wrapper {
  flex: 1;
  background-color: #1e293b;
  border-radius: 12px;
  border: 1px solid #334155;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  /* 使得由于组件内使用了 absolute 和 translateY 时，边距不会错乱 */
  position: relative; 
}

/* 消息卡片定制 */
.message-card {
  padding: 12px 16px;
  border-bottom: 1px solid #334155;
  box-sizing: border-box;
}

.message-header {
  font-weight: 600;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px; /* 需与 ITEM_PADDING_Y 偏离保持一致 */
  height: 12px;
  line-height: 12px;
}

.message-body {
  font-size: 14px; 
  line-height: 20px; 
  color: #e2e8f0;
  word-break: break-all;
  white-space: pre-wrap;
}
</style>
