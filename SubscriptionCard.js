/******************************
脚本名称: SubscriptionCard
Version : v5.0.0
更新时间: 2026-06-27
平台: Egern
功能: 机场流量用量查询
脚本作者：Nullwhy
UI 设计：QClaw
部分代码参考@iBL3ND

使用说明:
1. 添加到Egern脚本
2. 主界面右上角添加小组件
3. 分别添加环境变量 NAME 值为机场名称、URL 值为订阅链接、RESET 值为重置日期；大号组件支持多机场显示，分别添加 NAME1、URL1、RESET1、NAME2、URL2、RESET2、NAME3、URL3、RESET3
4. 适配中小、中、大号组件，大号件支持最多3个机场同时显示；小号和中号单机场环境变量可写为 NAME、URL、RESET
5. 组件右侧热力图彩色为已用流量，灰色为未用流量；缓存为30分钟，刷新时间为组件刷新时间

v5.0.0 UI 重构：
- GitHub Contribution 风格热力图
- 数据卡片网格布局
- iOS 原生小组件视觉语言
- 保留全部原有功能不变
**********************************/

export default async function (ctx) {
  const url = (ctx.env.URL || ctx.env.URL1 || '').trim();
  const name = (ctx.env.NAME || ctx.env.NAME1 || '').trim() || 'SUBSCRIPTION';
  const rawReset = (ctx.env.RESET || ctx.env.RESET1 || '').trim();
  const resetDay = /^\d+$/.test(rawReset) ? Number(rawReset) : null;

  // GitHub Contribution 配色系统
  const C = {
    bg: { light: '#F2F2F7', dark: '#000000' },
    card: { light: '#FFFFFF', dark: '#1C1C1E' },
    cardAlt: { light: '#F7F7F9', dark: '#2C2C2E' },
    text: { light: '#1D1D1F', dark: '#F5F5F7' },
    sub: { light: '#6E6E73', dark: '#98989D' },
    weak: { light: '#AEAEB2', dark: '#636366' },
    
    // GitHub Contribution 绿
    contrib: {
      empty: { light: '#EBEDF0', dark: '#161B22' },
      L1: { light: '#9BE9A7', dark: '#0E4429' },
      L2: { light: '#40C463', dark: '#006D32' },
      L3: { light: '#30A14E', dark: '#26A641' },
      L4: { light: '#216E39', dark: '#39D353' },
    },
    
    // 状态色
    green: { light: '#34C759', dark: '#30D158' },
    yellow: { light: '#FFD60A', dark: '#FFD60A' },
    orange: { light: '#FF9F0A', dark: '#FF9F0A' },
    red: { light: '#FF453A', dark: '#FF453A' },
  };

  if (ctx.widgetFamily === 'systemLarge') {
    const largeSlots = collectLargeSlots(ctx.env);
    if (largeSlots.length > 1) {
      const infos = await Promise.all(largeSlots.map(slot => fetchInfo(ctx, slot)));
      return buildLargeMultiWidget(C, infos);
    }
  }

  if (!url) return emptyWidget(C);

  const info = await fetchInfo(ctx, { url, name, resetDay });
  if (info.error) return errorWidget(C, name);

  const used = info.used || 0;
  const total = info.totalBytes || 0;
  const remain = Math.max(total - used, 0);
  const percent = total > 0 ? Math.min(Math.max((used / total) * 100, 0), 100) : 0;
  const remainPercent = 100 - percent;

  let statusColor = C.green;
  if (remainPercent <= 5) {
    statusColor = C.red;
  } else if (remainPercent <= 20) {
    statusColor = C.orange;
  } else if (remainPercent <= 40) {
    statusColor = C.yellow;
  }

  const expireText = getExpireText(info.expire, info.remainDays);
  const daysText = info.remainDays != null ? `${info.remainDays} 天` : null;
  const now = new Date();
  const refreshText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (ctx.widgetFamily === 'systemSmall') {
    return buildSmallWidget(C, { name, percent, remainPercent, statusColor, remain, daysText });
  }

  return buildMediumWidget(C, { name, percent, remainPercent, statusColor, remain, total, used, expireText, daysText, refreshText });
}

// ==================== 小号组件 ====================
function buildSmallWidget(C, data) {
  const { name, percent, remainPercent, statusColor, remain, daysText } = data;
  
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [12, 12],
    children: [
      // 顶部行
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        children: [
          { type: 'stack', width: 10, height: 10, borderRadius: 2, backgroundColor: C.contrib.L4, children: [] },
          { type: 'spacer', width: 6 },
          { type: 'text', text: name.substring(0, 6).toUpperCase(), font: { size: 10, weight: 'bold' }, textColor: C.sub, maxLines: 1 }
        ]
      },
      
      // 主数字
      {
        type: 'stack',
        direction: 'column',
        alignItems: 'center',
        children: [
          { type: 'text', text: formatBytes(remain), font: { size: 20, weight: 'bold' }, textColor: C.text, maxLines: 1 },
          { type: 'text', text: `${Math.round(remainPercent)}%`, font: { size: 12, weight: 'semibold' }, textColor: statusColor, maxLines: 1 }
        ]
      },
      
      // GitHub 风格热力图
      {
        type: 'stack',
        alignItems: 'center',
        children: [
          buildContribGrid(C, percent, 7, 3, 10, 3)
        ]
      },
      
      // 底部
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        children: [
          { type: 'text', text: statusTextZh(percent), font: { size: 10, weight: 'medium' }, textColor: statusColor, maxLines: 1 },
          { type: 'spacer' },
          { type: 'text', text: daysText != null ? daysText : '∞', font: { size: 10 }, textColor: C.sub, maxLines: 1 }
        ]
      }
    ]
  };
}

// ==================== 中号组件 ====================
function buildMediumWidget(C, data) {
  const { name, percent, remainPercent, statusColor, remain, total, used, expireText, daysText, refreshText } = data;
  
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [12, 14],
    children: [
      // 标题栏
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        children: [
          // 左：图标 + 名称
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            gap: 8,
            children: [
              { type: 'stack', width: 28, height: 28, borderRadius: 6, backgroundColor: C.contrib.L4, alignItems: 'center', justifyContent: 'center', children: [
                { type: 'text', text: '✈', font: { size: 14 } }
              ]},
              { type: 'text', text: name, font: { size: 13, weight: 'semibold' }, textColor: C.text, maxLines: 1 }
            ]
          },
          { type: 'spacer' },
          // 右：状态标签
          {
            type: 'stack',
            padding: [4, 10],
            backgroundColor: statusColor,
            borderRadius: 12,
            children: [
              { type: 'text', text: statusTextZh(percent), font: { size: 11, weight: 'semibold' }, textColor: '#FFFFFF', maxLines: 1 }
            ]
          }
        ]
      },
      
      // 主数据区
      {
        type: 'stack',
        direction: 'row',
        gap: 10,
        children: [
          // 左侧：数据卡片
          {
            type: 'stack',
            direction: 'column',
            gap: 8,
            flex: 1,
            children: [
              // 剩余流量大数字
              {
                type: 'text',
                text: formatBytes(remain),
                font: { size: 26, weight: 'bold' },
                textColor: C.text,
                maxLines: 1
              },
              { type: 'text', text: '剩余流量', font: { size: 10 }, textColor: C.sub, maxLines: 1 },
              
              // 进度条
              {
                type: 'stack',
                width: '100%',
                height: 6,
                borderRadius: 3,
                backgroundColor: C.contrib.empty,
                children: [
                  { type: 'stack', width: `${percent}%`, height: 6, borderRadius: 3, backgroundColor: statusColor, children: [] }
                ]
              },
              
              // 数据卡片网格
              {
                type: 'stack',
                direction: 'row',
                children: [
                  { type: 'stack', direction: 'column', gap: 5, flex: 1, children: [
                    buildDataCard(C, '套餐总量', formatBytes(total)),
                    buildDataCard(C, '到期时间', formatExpireValue(expireText)),
                  ]},
                  { type: 'spacer', width: 8 },
                  { type: 'stack', direction: 'column', gap: 5, flex: 1, children: [
                    buildDataCard(C, '已用流量', formatBytes(used)),
                    buildDataCard(C, '剩余天数', daysText != null ? daysText : '永久'),
                  ]}
                ]
              }
            ]
          },
          
          // 右侧：GitHub 热力图
          {
            type: 'stack',
            alignItems: 'center',
            justifyContent: 'center',
            padding: [8, 8],
            backgroundColor: C.card,
            borderRadius: 10,
            children: [
              buildContribGrid(C, percent, 7, 5, 11, 3)
            ]
          }
        ]
      },
      
      // 底部
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        children: [
          { type: 'spacer' },
          { type: 'text', text: `更新于 ${refreshText}`, font: { size: 10 }, textColor: C.weak, maxLines: 1 }
        ]
      }
    ]
  };
}

// ==================== 大号多机场组件 ====================
function buildLargeMultiWidget(C, infos) {
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [10, 12],
    children: [
      {
        type: 'stack',
        direction: 'column',
        gap: 6,
        justifyContent: 'center',
        children: [
          // 标题
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              { type: 'text', text: '📡 订阅监控', font: { size: 11, weight: 'semibold' }, textColor: C.text, maxLines: 1 },
              { type: 'spacer' },
              { type: 'text', text: `${infos.length} 个订阅`, font: { size: 10 }, textColor: C.sub, maxLines: 1 }
            ]
          },
          // 机场卡片列表
          ...infos.slice(0, 3).map(info => buildLargeAirportCard(C, info))
        ]
      }
    ]
  };
}

function buildLargeAirportCard(C, info) {
  if (info.error) {
    return {
      type: 'stack',
      direction: 'column',
      padding: [10, 12],
      backgroundColor: C.card,
      borderRadius: 14,
      children: [{ type: 'text', text: `${info.name} 获取失败`, font: { size: 13, weight: 'bold' }, textColor: C.red, maxLines: 1 }]
    };
  }

  const used = info.used || 0;
  const total = info.totalBytes || 0;
  const remain = Math.max(total - used, 0);
  const percent = total > 0 ? Math.min(Math.max((used / total) * 100, 0), 100) : 0;
  const remainPercent = 100 - percent;
  
  let statusColor = C.green;
  if (remainPercent <= 5) statusColor = C.red;
  else if (remainPercent <= 20) statusColor = C.orange;
  else if (remainPercent <= 40) statusColor = C.yellow;
  
  const expireText = getExpireText(info.expire, info.remainDays);
  const daysText = info.remainDays != null ? `${info.remainDays} 天` : null;

  return {
    type: 'stack',
    direction: 'column',
    padding: [8, 12],
    backgroundColor: C.card,
    borderRadius: 14,
    children: [
      // 顶部行
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        children: [
          { type: 'stack', width: 10, height: 10, borderRadius: 2, backgroundColor: C.contrib.L4, children: [] },
          { type: 'spacer', width: 6 },
          { type: 'text', text: info.name.toUpperCase(), font: { size: 11, weight: 'bold' }, textColor: C.sub, maxLines: 1 },
          { type: 'spacer' },
          { type: 'stack', padding: [3, 8], backgroundColor: statusColor, borderRadius: 10, children: [
            { type: 'text', text: `${Math.round(remainPercent)}%`, font: { size: 10, weight: 'bold' }, textColor: '#FFFFFF', maxLines: 1 }
          ]}
        ]
      },
      
      // 数据行
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 10,
        children: [
          // 左侧：数据
          {
            type: 'stack',
            direction: 'column',
            gap: 3,
            flex: 1,
            children: [
              {
                type: 'stack',
                direction: 'row',
                alignItems: 'center',
                children: [
                  { type: 'text', text: formatBytes(remain), font: { size: 14, weight: 'bold' }, textColor: C.text, maxLines: 1 },
                  { type: 'spacer' },
                  { type: 'text', text: statusTextZh(percent), font: { size: 10, weight: 'medium' }, textColor: statusColor, maxLines: 1 }
                ]
              },
              { type: 'text', text: `到期：${formatExpireValue(expireText)}${daysText ? ' · ' + daysText : ''}`, font: { size: 9 }, textColor: C.sub, maxLines: 1 },
              // 进度条
              {
                type: 'stack',
                width: '100%',
                height: 4,
                borderRadius: 2,
                backgroundColor: C.contrib.empty,
                children: [
                  { type: 'stack', width: `${percent}%`, height: 4, borderRadius: 2, backgroundColor: statusColor, children: [] }
                ]
              }
            ]
          },
          
          // 右侧：热力图
          {
            type: 'stack',
            children: [
              buildContribGrid(C, percent, 5, 3, 8, 2)
            ]
          }
        ]
      }
    ]
  };
}

// ==================== 辅助函数 ====================

// GitHub Contribution 风格热力图
function buildContribGrid(C, percent, cols, rows, cellSize, cellGap) {
  const total = cols * rows;
  const filled = Math.max(1, Math.round((percent / 100) * total));
  const gridRows = [];
  
  for (let row = 0; row < rows; row++) {
    const cells = [];
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const isFilled = index < filled;
      let level;
      if (!isFilled) {
        level = C.contrib.empty;
      } else {
        const progress = (index + 1) / filled;
        if (progress <= 0.25) level = C.contrib.L1;
        else if (progress <= 0.5) level = C.contrib.L2;
        else if (progress <= 0.75) level = C.contrib.L3;
        else level = C.contrib.L4;
      }
      cells.push({
        type: 'stack',
        width: cellSize,
        height: cellSize,
        borderRadius: cellSize > 8 ? 2 : 1,
        backgroundColor: level,
        children: []
      });
    }
    gridRows.push({
      type: 'stack',
      direction: 'row',
      gap: cellGap,
      children: cells
    });
  }
  
  return {
    type: 'stack',
    direction: 'column',
    gap: cellGap,
    children: gridRows
  };
}

// 数据卡片
function buildDataCard(C, label, value) {
  return {
    type: 'stack',
    direction: 'column',
    gap: 2,
    padding: [6, 8],
    backgroundColor: C.cardAlt,
    borderRadius: 8,
    children: [
      { type: 'text', text: label, font: { size: 9, weight: 'medium' }, textColor: C.sub, maxLines: 1 },
      { type: 'text', text: value, font: { size: 12, weight: 'semibold' }, textColor: C.text, maxLines: 1 }
    ]
  };
}

function collectLargeSlots(env) {
  const slots = [];
  for (let index = 1; index <= 3; index++) {
    const url = (env[`URL${index}`] || '').trim();
    if (!url) continue;
    const rawReset = (env[`RESET${index}`] || '').trim();
    slots.push({
      url,
      name: (env[`NAME${index}`] || '').trim() || `SUBSCRIPTION ${index}`,
      resetDay: /^\d+$/.test(rawReset) ? Number(rawReset) : null
    });
  }
  return slots;
}

const CACHE_TIME = 30 * 60 * 1000;
const UA_LIST = [
  { 'User-Agent': 'Quantumult%20X/1.5.2' },
  { 'User-Agent': 'clash-verge-rev/2.3.1', Accept: 'application/x-yaml,text/plain,*/*' },
  { 'User-Agent': 'mihomo/1.19.3', Accept: 'application/x-yaml,text/plain,*/*' }
];

async function fetchInfo(ctx, slot) {
  const cacheKey = `sub_cache_${slot.url}`;
  const cache = await ctx.storage.get(cacheKey);
  if (cache) {
    try {
      const parsed = JSON.parse(cache);
      if (Date.now() - parsed.time < CACHE_TIME) {
        return { ...parsed.data, name: slot.name, remainDays: slot.resetDay ? getRemainingDays(slot.resetDay) : null };
      }
    } catch {}
  }

  for (const method of ['head', 'get']) {
    for (const requestUrl of buildVariants(slot.url)) {
      for (const headers of UA_LIST) {
        try {
          const resp = await ctx.http[method](requestUrl, { headers });
          const raw = resp.headers.get('subscription-userinfo') || '';
          const info = parseUserInfo(raw);
          if (!info) continue;
          const result = {
            error: null,
            used: (info.upload || 0) + (info.download || 0),
            totalBytes: info.total || 0,
            expire: info.expire || null,
            remainDays: slot.resetDay ? getRemainingDays(slot.resetDay) : null
          };
          await ctx.storage.set(cacheKey, JSON.stringify({ time: Date.now(), data: result }));
          return { ...result, name: slot.name };
        } catch {}
      }
    }
  }
  return { name: slot.name, error: true };
}

function dataLine(text, C) {
  return {
    type: 'text',
    text,
    width: 150,
    font: { size: 11, weight: 'bold', design: 'rounded' },
    textColor: C.text,
    maxLines: 1
  };
}

function statusTextZh(percent) {
  if (percent >= 95) return '告急';
  if (percent >= 80) return '偏低';
  return '充足';
}

function formatExpireValue(text) {
  return String(text || '').replace(/^到期\s*/, '');
}

function usageCellColor(index, active, C) {
  if (active <= 0) return C.green;
  const ratio = (index + 1) / active;
  if (ratio <= 0.25) return { light: '#9BE7B0', dark: '#2ECC71' };
  if (ratio <= 0.5) return { light: '#5FD37D', dark: '#5FFFB0' };
  if (ratio <= 0.75) return { light: '#FFB946', dark: '#FFC670' };
  if (ratio <= 0.9) return { light: '#FF8A4C', dark: '#FF9E64' };
  return { light: '#FF6B6B', dark: '#FF8787' };
}

function buildUsageGrid(C, percent, activeColor, cellSize = 14, cellGap = 5) {
  const total = 35;
  const active = Math.max(0, Math.min(total, Math.round((percent / 100) * total)));
  const rows = [];
  for (let row = 0; row < 5; row++) {
    const cells = [];
    for (let col = 0; col < 7; col++) {
      const index = row * 7 + col;
      cells.push({
        type: 'stack',
        width: cellSize,
        height: cellSize,
        borderRadius: Math.max(3, Math.round(cellSize / 3)),
        backgroundColor: index < active ? usageCellColor(index, active, C) : C.contrib.empty,
        children: []
      });
    }
    rows.push({
      type: 'stack',
      direction: 'row',
      gap: cellGap,
      children: cells
    });
  }
  return {
    type: 'stack',
    direction: 'column',
    gap: 3,
    padding: [4, 0],
    children: rows
  };
}

function emptyWidget(C) {
  return { type: 'widget', backgroundColor: C.bg, padding: 16, children: [{ type: 'text', text: '未配置订阅', font: { size: 16, weight: 'bold' }, textColor: C.text }] };
}

function errorWidget(C, name) {
  return { type: 'widget', backgroundColor: C.bg, padding: 16, children: [{ type: 'text', text: `${name} 获取失败`, font: { size: 16, weight: 'bold' }, textColor: C.red }] };
}

function buildVariants(url) {
  const seen = new Set();
  const out = [];
  const add = (value) => { if (value && !seen.has(value)) { seen.add(value); out.push(value); } };
  add(url);
  add(withParam(url, 'flag', 'clash'));
  add(withParam(url, 'flag', 'meta'));
  return out;
}

function withParam(url, key, value) {
  return `${url}${url.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}`;
}

function parseUserInfo(header) {
  const pairs = header.match(/\w+=[\d.eE+-]+/g) || [];
  if (!pairs.length) return null;
  return Object.fromEntries(pairs.map(pair => {
    const [key, value] = pair.split('=');
    return [key, Number(value)];
  }));
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 GB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(1)} ${units[index]}`;
}

function getExpireText(expire, remainDays) {
  if (remainDays != null) {
    const date = new Date();
    date.setDate(date.getDate() + remainDays);
    return `到期 ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  if (expire && Number(expire) > 0) {
    let ts = Number(expire);
    if (ts < 1e12) ts *= 1000;
    const date = new Date(ts);
    return `到期 ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  return '到期 永久有效';
}

function getRemainingDays(resetDay) {
  const now = new Date();
  const maxDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(resetDay, maxDay);
  let next = new Date(now.getFullYear(), now.getMonth(), safeDay);
  if (now.getDate() >= safeDay) {
    const nextMonthMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
    next = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(resetDay, nextMonthMax));
  }
  return Math.max(0, Math.ceil((next - now) / 86400000));
}