/******************************
脚本名称: SubscriptionCard
Version : v4.0.0
更新时间: 2026-06-27
平台: Egern
功能: 机场流量监控小组件
作者：Nullwhy
UI 设计：QClaw

UI 设计理念：
- GitHub Contribution 风格贡献图
- iOS 原生小组件视觉语言
- 数据卡片网格布局
- 专业监控仪表盘美学
**********************************/

export default async function (ctx) {
  const url = (ctx.env.URL || ctx.env.URL1 || '').trim();
  const name = (ctx.env.NAME || ctx.env.NAME1 || '').trim() || 'SUBSCRIPTION';
  const rawReset = (ctx.env.RESET || ctx.env.RESET1 || '').trim();
  const resetDay = /^\d+$/.test(rawReset) ? Number(rawReset) : null;

  const C = {
    bg: { light: '#F2F2F7', dark: '#000000' },
    card: { light: '#FFFFFF', dark: '#1C1C1E' },
    text: { light: '#000000', dark: '#FFFFFF' },
    textSecondary: { light: '#3C3C43', dark: '#8E8E93' },
    textTertiary: { light: '#6C6C70', dark: '#636366' },
    
    // GitHub Contribution 配色
    contrib: {
      none: { light: '#EBEDF0', dark: '#161B22' },
      L1: { light: '#9BE9A7', dark: '#0E4429' },
      L2: { light: '#40C463', dark: '#006D32' },
      L3: { light: '#30A14E', dark: '#26A641' },
      L4: { light: '#216E39', dark: '#39D353' },
    },
    
    // 状态色
    green: { light: '#34C759', dark: '#30D158' },
    yellow: { light: '#FFCC00', dark: '#FFD60A' },
    orange: { light: '#FF9500', dark: '#FF9F0A' },
    red: { light: '#FF3B30', dark: '#FF453A' },
    gray: { light: '#8E8E93', dark: '#8E8E93' },
  };

  // 大号组件多机场
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

  // 状态判断
  let statusColor = C.green;
  let statusText = '正常';
  if (remainPercent <= 5) {
    statusColor = C.red;
    statusText = '紧急';
  } else if (remainPercent <= 15) {
    statusColor = C.red;
    statusText = '不足';
  } else if (remainPercent <= 30) {
    statusColor = C.orange;
    statusText = '偏低';
  } else if (remainPercent <= 50) {
    statusColor = C.yellow;
    statusText = '预警';
  }

  const expireText = getExpireText(info.expire, info.remainDays);
  const daysText = info.remainDays != null ? info.remainDays : null;
  const now = new Date();
  const refreshText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (ctx.widgetFamily === 'systemSmall') {
    return buildSmallWidget(C, { name, percent, remainPercent, statusColor, statusText, remain, daysText });
  }

  return buildMediumWidget(C, { name, percent, remainPercent, statusColor, statusText, remain, total, expireText, daysText, refreshText });
}

// ==================== 小号组件 ====================
function buildSmallWidget(C, data) {
  const { name, percent, remainPercent, statusColor, statusText, remain, daysText } = data;
  
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [14, 14],
    children: [
      // 顶部行
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        children: [
          { type: 'stack', width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor, children: [] },
          { type: 'spacer', width: 6 },
          { type: 'text', text: name.substring(0, 6), font: { size: 11, weight: 'semibold' }, textColor: C.textSecondary, maxLines: 1 }
        ]
      },
      
      // 主数字
      {
        type: 'stack',
        direction: 'column',
        alignItems: 'center',
        children: [
          {
            type: 'text',
            text: formatBytesSmall(remain),
            font: { size: 22, weight: 'bold' },
            textColor: C.text,
            maxLines: 1
          },
          { type: 'text', text: `${Math.round(remainPercent)}%`, font: { size: 13, weight: 'semibold' }, textColor: statusColor, maxLines: 1 }
        ]
      },
      
      // GitHub 贡献图
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
          { type: 'text', text: statusText, font: { size: 10, weight: 'medium' }, textColor: statusColor, maxLines: 1 },
          { type: 'spacer' },
          { type: 'text', text: daysText != null ? `${daysText}d` : '∞', font: { size: 10 }, textColor: C.textTertiary, maxLines: 1 }
        ]
      }
    ]
  };
}

// ==================== 中号组件 ====================
function buildMediumWidget(C, data) {
  const { name, percent, remainPercent, statusColor, statusText, remain, total, expireText, daysText, refreshText } = data;
  
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [14, 16],
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
              { type: 'text', text: name, font: { size: 14, weight: 'semibold' }, textColor: C.text, maxLines: 1 }
            ]
          },
          { type: 'spacer' },
          // 右：状态
          {
            type: 'stack',
            padding: [4, 10],
            backgroundColor: statusColor,
            borderRadius: 12,
            children: [
              { type: 'text', text: statusText, font: { size: 11, weight: 'semibold' }, textColor: '#FFFFFF', maxLines: 1 }
            ]
          }
        ]
      },
      
      // 主数据区
      {
        type: 'stack',
        direction: 'row',
        gap: 12,
        children: [
          // 左侧：数据卡片
          {
            type: 'stack',
            direction: 'column',
            gap: 10,
            flex: 1,
            children: [
              // 剩余流量大数字
              {
                type: 'text',
                text: formatBytesMedium(remain),
                font: { size: 28, weight: 'bold' },
                textColor: C.text,
                maxLines: 1
              },
              { type: 'text', text: '剩余流量', font: { size: 11 }, textColor: C.textSecondary, maxLines: 1 },
              
              // 进度条
              {
                type: 'stack',
                width: '100%',
                height: 6,
                borderRadius: 3,
                backgroundColor: C.contrib.none,
                children: [
                  { type: 'stack', width: `${percent}%`, height: 6, borderRadius: 3, backgroundColor: statusColor, children: [] }
                ]
              },
              
              // 数据网格
              {
                type: 'stack',
                direction: 'row',
                children: [
                  { type: 'stack', direction: 'column', gap: 6, flex: 1, children: [
                    buildDataCard(C, '套餐总量', formatBytesSmall(total)),
                    buildDataCard(C, '到期时间', expireText.replace('到期 ', '')),
                  ]},
                  { type: 'spacer', width: 12 },
                  { type: 'stack', direction: 'column', gap: 6, flex: 1, children: [
                    buildDataCard(C, '已用流量', formatBytesSmall(used)),
                    buildDataCard(C, '剩余天数', daysText != null ? `${daysText} 天` : '永久'),
                  ]}
                ]
              }
            ]
          },
          
          // 右侧：GitHub 贡献图
          {
            type: 'stack',
            alignItems: 'center',
            justifyContent: 'center',
            padding: [8, 8],
            backgroundColor: C.card,
            borderRadius: 10,
            children: [
              buildContribGrid(C, percent, 7, 5, 12, 4)
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
          { type: 'text', text: `更新于 ${refreshText}`, font: { size: 10 }, textColor: C.textTertiary, maxLines: 1 }
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
    padding: [12, 14],
    children: [
      {
        type: 'stack',
        direction: 'column',
        gap: 8,
        children: [
          // 标题
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              { type: 'text', text: '📡 订阅监控', font: { size: 12, weight: 'semibold' }, textColor: C.text, maxLines: 1 },
              { type: 'spacer' },
              { type: 'text', text: `${infos.length} 个订阅`, font: { size: 11 }, textColor: C.textSecondary, maxLines: 1 }
            ]
          },
          // 机场卡片
          ...infos.map(info => buildLargeAirportCard(C, info))
        ]
      }
    ]
  };
}

function buildLargeAirportCard(C, info) {
  if (info.error) {
    return {
      type: 'stack',
      direction: 'row',
      alignItems: 'center',
      gap: 10,
      padding: [10, 12],
      backgroundColor: C.card,
      borderRadius: 12,
      children: [
        { type: 'stack', width: 10, height: 10, borderRadius: 5, backgroundColor: C.gray, children: [] },
        { type: 'spacer', width: 8 },
        { type: 'text', text: `${info.name} 获取失败`, font: { size: 13, weight: 'medium' }, textColor: C.text, maxLines: 1 }
      ]
    };
  }

  const used = info.used || 0;
  const total = info.totalBytes || 0;
  const remain = Math.max(total - used, 0);
  const percent = total > 0 ? Math.min(Math.max((used / total) * 100, 0), 100) : 0;
  const remainPercent = 100 - percent;
  
  let statusColor = C.green;
  let statusText = '正常';
  if (remainPercent <= 5) { statusColor = C.red; statusText = '紧急'; }
  else if (remainPercent <= 15) { statusColor = C.red; statusText = '不足'; }
  else if (remainPercent <= 30) { statusColor = C.orange; statusText = '偏低'; }
  else if (remainPercent <= 50) { statusColor = C.yellow; statusText = '预警'; }
  
  const daysText = info.remainDays != null ? info.remainDays : null;
  const expireText = getExpireText(info.expire, info.remainDays);

  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 12,
    padding: [10, 12],
    backgroundColor: C.card,
    borderRadius: 12,
    children: [
      // 左：百分比圆
      {
        type: 'stack',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: statusColor,
        alignItems: 'center',
        justifyContent: 'center',
        children: [
          { type: 'text', text: `${Math.round(remainPercent)}%`, font: { size: 13, weight: 'bold' }, textColor: '#FFFFFF', maxLines: 1 }
        ]
      },
      
      // 中：信息
      {
        type: 'stack',
        direction: 'column',
        gap: 4,
        flex: 1,
        children: [
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            gap: 8,
            children: [
              { type: 'text', text: info.name, font: { size: 13, weight: 'semibold' }, textColor: C.text, maxLines: 1 },
              { type: 'text', text: statusText, font: { size: 10, weight: 'medium' }, textColor: statusColor, maxLines: 1 }
            ]
          },
          { type: 'text', text: `剩余 ${formatBytesSmall(remain)} · ${expireText.replace('到期 ', '')}`, font: { size: 11 }, textColor: C.textSecondary, maxLines: 1 },
          // 进度条
          {
            type: 'stack',
            width: '100%',
            height: 4,
            borderRadius: 2,
            backgroundColor: C.contrib.none,
            children: [
              { type: 'stack', width: `${percent}%`, height: 4, borderRadius: 2, backgroundColor: statusColor, children: [] }
            ]
          }
        ]
      },
      
      // 右：贡献图
      {
        type: 'stack',
        children: [
          buildContribGrid(C, percent, 5, 3, 8, 2)
        ]
      }
    ]
  };
}

// ==================== 辅助函数 ====================

// GitHub 贡献图
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
        level = C.contrib.none;
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
    backgroundColor: C.card,
    borderRadius: 8,
    children: [
      { type: 'text', text: label, font: { size: 9, weight: 'medium' }, textColor: C.textTertiary, maxLines: 1 },
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
      name: (env[`NAME${index}`] || '').trim() || `订阅 ${index}`,
      resetDay: /^\d+$/.test(rawReset) ? Number(rawReset) : null
    });
  }
  return slots;
}

const CACHE_TIME = 30 * 60 * 1000;
const UA_LIST = [
  { 'User-Agent': 'Quantumult%20X/1.5.2' },
  { 'User-Agent': 'clash-verge-rev/2.3.1', Accept: 'application/x-yaml,text/plain,*/*' },
  { 'User-Agent': 'mihomo/1.19.3', Accept: 'application/x-yaml,text/plain,*/*' },
  { 'User-Agent': 'ClashX/1.118.0', Accept: 'application/x-yaml,text/plain,*/*' },
  { 'User-Agent': 'Shadowrocket/2.2.45' },
  { 'User-Agent': 'Surge/5.8.0' }
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

function emptyWidget(C) {
  return { 
    type: 'widget', 
    backgroundColor: C.bg, 
    padding: 24, 
    children: [
      { type: 'spacer' },
      { type: 'text', text: '📡', font: { size: 40 } },
      { type: 'spacer', height: 12 },
      { type: 'text', text: '未配置订阅', font: { size: 16, weight: 'semibold' }, textColor: C.text },
      { type: 'spacer', height: 4 },
      { type: 'text', text: '请添加 URL 环境变量', font: { size: 12 }, textColor: C.textSecondary },
      { type: 'spacer' }
    ] 
  };
}

function errorWidget(C, name) {
  return { 
    type: 'widget', 
    backgroundColor: C.bg, 
    padding: 24, 
    children: [
      { type: 'spacer' },
      { type: 'text', text: '⚠️', font: { size: 40 } },
      { type: 'spacer', height: 12 },
      { type: 'text', text: `${name}`, font: { size: 16, weight: 'semibold' }, textColor: C.text },
      { type: 'spacer', height: 4 },
      { type: 'text', text: '获取失败', font: { size: 12 }, textColor: C.red },
      { type: 'spacer' }
    ] 
  };
}

function buildVariants(url) {
  const seen = new Set();
  const out = [];
  const add = (value) => { if (value && !seen.has(value)) { seen.add(value); out.push(value); } };
  add(url);
  add(withParam(url, 'flag', 'clash'));
  add(withParam(url, 'flag', 'meta'));
  add(withParam(url, 'list', 'true'));
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

function formatBytesSmall(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(1)}${units[index]}`;
}

function formatBytesMedium(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 GB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  if (index >= 3) return `${value.toFixed(1)} ${units[index]}`;
  return `${Math.round(value)} ${units[index]}`;
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