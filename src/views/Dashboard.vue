<script setup lang="ts">
import { NCard, NStatistic, NGrid, NGridItem, NTag } from 'naive-ui'
</script>

<template>
  <NCard title="欢迎使用 WorkYunxi">
    <NGrid :cols="3" :x-gap="16" :y-gap="16">
      <NGridItem>
        <NCard size="small">
          <NStatistic label="Hermes 状态" value="未连接" />
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard size="small">
          <NStatistic label="版本" value="v0.1.0 (Phase 0)" />
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard size="small">
          <NStatistic label="协议" value="BSL 1.1" />
        </NCard>
      </NGridItem>
    </NGrid>
    <div style="margin-top: 16px">
      <NTag>Phase 0 技术验证通过</NTag>
    </div>
  </NCard>
</template>
