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
      <PerfectVirtualScroll
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
      </PerfectVirtualScroll>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { PerfectVirtualScroll, prepare, layout } from '../src/index';

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

// 我们增加一个缓存池。很多极度相似或重复的话只需 prepare 一次！非常节约内存和算力
const preparedCache = new Map();

// 生成随机大数据：为了保证主线程不被 5 万次循环阻塞 (长任务 Long Task)
// 这里我们引入了前端极致性能优化的两大手段：时间分片 (Time Slicing) + 缓存。
onMounted(() => {
  const data: Message[] = [];
  const baseTexts = [
    "简短的对话。",
    "这是一句长一点的消息，可以覆盖多半行的空间区域测试。",
    "现在是一段由于超过容器宽度而肯定会折行的句子。传统虚拟列表在面对这种文本时，极容易产生回弹、底部跳屏等抖动问题！",
    "性能测试2：不接触 DOM 进行排版的魅力！",
    "更长的文本：如果你面对十万级的长短信聊天框，每一次重调整或屏幕翻转都会使得全部视图被毁。使用 Pretext 后计算会非常优雅。"
  ];
  
  const TOTAL_COUNT = 50000;
  const CHUNK_SIZE = 1000; // 每帧处理 1000 条，把主线程及时归还给浏览器渲染 UI
  let currentIndex = 0;

  const processChunk = () => {
    const end = Math.min(currentIndex + CHUNK_SIZE, TOTAL_COUNT);
    for (let i = currentIndex; i < end; i++) {
      let content = baseTexts[Math.floor(Math.random() * baseTexts.length)];
      if (i % 7 === 0) content += " " + content;
      if (i % 20 === 0) content += " " + content + " " + content;

      // 前端渲染高阶技巧：针对同样的大段字符串进行复用，免去多余 Canvas 开销
      let preparedText = preparedCache.get(content);
      if (!preparedText) {
        preparedText = prepare(content, FONT);
        preparedCache.set(content, preparedText);
      }
      
      data.push({
        id: i,
        text: content,
        preparedText
      });
    }
    currentIndex = end;

    if (currentIndex < TOTAL_COUNT) {
      // 关键：把下一个大算力块扔到下一帧，保证 Loading 动画或滚动条有喘息和绘制的机会
      requestAnimationFrame(processChunk);
    } else {
      messages.value = data;
      loading.value = false;
    }
  };

  // 启动分片任务
  requestAnimationFrame(processChunk);
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
