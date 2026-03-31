<template>
  <!-- 中文注释：虚拟列表容器，监听滚动事件，设置 relative 用于内部绝对定位 -->
  <div
    class="virtual-list-container"
    ref="containerRef"
    @scroll.passive="handleScroll"
    :style="{ overflowY: 'auto', position: 'relative', width: '100%', height: '100%' }"
  >
    <!-- 中文注释：内部滚动撑开区域，高度等于所有项布局高度的总和 -->
    <div
      class="virtual-list-scroller"
      :style="{ height: layoutData.totalHeight + 'px', position: 'relative', width: '100%' }"
    >
      <!-- 中文注释：仅渲染可视区域内的项目，利用 translateY 进行纯粹的绝对定位偏移 -->
      <div
        v-for="item in visibleItems"
        :key="item.key"
        class="virtual-list-item"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          transform: `translateY(${item.offset}px)`
        }"
      >
        <slot :item="item.data" :index="item.index"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, shallowRef } from 'vue';

// 中文注释：极简优雅的属性配置，要求外部提供预先计算每个item高度的方法，以及唯一键
interface Props {
  data: any[];
  keyField: string | ((item: any) => string | number);
  measureItem: (item: any, width: number) => number;
  buffer?: number;
}

const props = withDefaults(defineProps<Props>(), {
  buffer: 6 // 默认在可视区上下多渲染6条以降低快速滚动时的白屏率
});

const containerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
const viewportHeight = ref(0);
const scrollTop = ref(0);

// 中文注释：使用 shallowRef 并且使用 TypedArray 以极大节省大数组的内存占用和响应式性能开销
const layoutData = shallowRef({
  heights: new Float64Array(),
  offsets: new Float64Array(),
  totalHeight: 0
});

// 解析项的 key
const getKey = (item: any): string | number => {
  if (typeof props.keyField === 'function') {
    return props.keyField(item);
  }
  return item[props.keyField];
};

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === containerRef.value) {
          containerWidth.value = entry.contentRect.width;
          viewportHeight.value = entry.contentRect.height;
        }
      }
    });
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  scrollTop.value = target.scrollTop;
};

// 中文注释：利用 Pretext 的强大之处，当宽改变或数据变动时瞬间重排十万级数据的高低落点而无卡顿
watch([() => props.data, containerWidth], ([newData, newWidth]) => {
  if (!newWidth || newData.length === 0) {
    layoutData.value = {
      heights: new Float64Array(),
      offsets: new Float64Array(),
      totalHeight: 0
    };
    return;
  }
  
  const len = newData.length;
  // 中文注释：通过预分配一块确切的内存来做最高效的数组遍历操作
  const newHeights = new Float64Array(len);
  const newOffsets = new Float64Array(len + 1);
  
  let currentOffset = 0;
  for (let i = 0; i < len; i++) {
    // 调用基于 Pretext 等高度测量实现
    const h = props.measureItem(newData[i], newWidth);
    newHeights[i] = h;
    newOffsets[i] = currentOffset;
    currentOffset += h;
  }
  newOffsets[len] = currentOffset;
  
  layoutData.value = {
    heights: newHeights,
    offsets: newOffsets,
    totalHeight: currentOffset
  };
}, { immediate: true, deep: false });

// 二分查找寻找首个处于可视区域元素
const findStartIndex = (scrollTop: number, offsetsArray: Float64Array, len: number) => {
  let left = 0;
  let right = len - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (offsetsArray[mid] === scrollTop) {
      return mid;
    } else if (offsetsArray[mid] < scrollTop) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return right > 0 ? right : 0;
};

// 中文注释：计算目前视口应渲染出的真实DOM节点
const visibleItems = computed(() => {
  const dataLen = props.data.length;
  const offsets = layoutData.value.offsets;
  if (dataLen === 0 || offsets.length === 0 || viewportHeight.value === 0) return [];
  
  const startIndex = findStartIndex(scrollTop.value, offsets, dataLen);
  let endIndex = startIndex;
  
  const targetOffset = scrollTop.value + viewportHeight.value;
  while (endIndex < dataLen && offsets[endIndex] < targetOffset) {
    endIndex++;
  }
  
  const start = Math.max(0, startIndex - props.buffer);
  const end = Math.min(dataLen - 1, endIndex + props.buffer);
  
  const result = [];
  for (let i = start; i <= end; i++) {
    result.push({
      data: props.data[i],
      index: i,
      offset: offsets[i],
      key: getKey(props.data[i])
    });
  }
  
  return result;
});
</script>

<style scoped>
.virtual-list-container {
  overflow-y: auto;
  will-change: scroll-position;
  -webkit-overflow-scrolling: touch; /* iOS 滚动的弹性效果 */
}
.virtual-list-item {
  box-sizing: border-box;
}
</style>
