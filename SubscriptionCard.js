/******************************
脚本名称: SubscriptionCard
Version : v2.0.0
更新时间: 2026-06-27
平台: Egern
功能: 机场流量用量查询（高端质感版）
灵感来源: Apple Fitness · GitHub Contribution · 机场仪表盘
脚本作者：Nullwhy
优化改进：QClaw

v2.0.0 高端质感设计理念：
- Apple Fitness 风格的渐变 + 圆形环
- GitHub Contribution 风格的流量热力图
- 机场仪表盘风格的科技感数据展示
- 深邃渐变背景 + 玻璃拟态卡片
- 大字体数字 + 精致图标
- 流畅的视觉层次
**********************************/

export default async function (ctx) {
  const url = (ctx.env.URL || ctx.env.URL1 || '').trim();
  const name = (ctx.env.NAME || ctx.env.NAME1 || '').trim() || 'SUBSCRIPTION';
  const rawReset = (ctx.env.RESET || ctx.env.RESET1 || '').trim();
  const resetDay = /^\d+$/.test(rawReset) ? Number(rawReset) : null;

  // 高端配色系统
  const C = {
    // 渐变背景
    bgGradient: { 
      light: ['#F8F9FA', '#E9ECEF'], 
      dark: ['#1A1A2E', '#16213E'] 
    },
    bg: { light: '#F8F9FA', dark: '#1A1A2E' },
    
    // 玻璃拟态卡片
    glass: { light: 'rgba(255,255,255,0.72)', dark: 'rgba(30,30,46,0.85)' },
    card: { light: '#FFFFFF', dark: '#252542' },
    cardBorder: { light: 'rgba(255,255,255,0.5)', dark: 'rgba(255,255,255,0.08)' },
    
    // 文字层级
    textPrimary: { light: '#1A1A2E', dark: '#FFFFFF' },
    textSecondary: { light: '#6C757D', dark: '#A0A0B8' },
    textTertiary: { light: '#ADB5BD', dark: '#6B6B8A' },
    
    // 状态色系
    statusGreen: { light: '#10B981', dark: '#34D399' },
    statusGreenGlow: { light: '#10B98130', dark: '#34D39930' },
    statusYellow: { light: '#F59E0B', dark: '#FBBF24' },
    statusYellowGlow: { light: '#F59E0B30', dark: '#FBBF2430' },
    statusOrange: { light: '#F97316', dark: '#FB923C' },
    statusOrangeGlow: { light: '#F9731630', dark: '#FB923C30' },
    statusRed: { light: '#EF4444', dark: '#F87171' },
    statusRedGlow: { light: '#EF444430', dark: '#F8717130' },
    
    // GitHub Contribution 绿
    contribLevel: [
      { light: '#EBEDF0', dark: '#161B22' }, // 0 无
      { light: '#9BE9A7', dark: '#0E4429' }, // 1 低
      { light: '#40C463', dark: '#006D32' }, // 2 中
      { light: '#30A14E', dark: '#26A641' }, // 3 高
      { light: '#216E39', dark: '#39D353' }, // 4 满
    ],
    
    // 渐变色
    gradientBlue: { light: ['#667EEA', '#764BA2'], dark: ['#667EEA', '#764BA2'] },
    gradientGreen: { light: ['#11998E', '#38EF7D'], dark: ['#11998E', '#38EF7D'] },
    gradientPurple: { light: ['#8E2DE2', '#4A00E0'], dark: ['#A855F7', '#6366F1'] },
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

  // 状态判断
  let statusColor = C.statusGreen;
  let statusGlow = C.statusGreenGlow;
  let statusText = '健康';
  if (remainPercent <= 5) {
    statusColor = C.statusRed;
    statusGlow = C.statusRedGlow;
    statusText = '紧急';
  } else if (remainPercent <= 15) {
    statusColor = C.statusOrange;
    statusGlow = C.statusOrangeGlow;
    statusText = '不足';
  } else if (remainPercent <= 30) {
    statusColor = C.statusYellow;
    statusGlow = C.statusYellowGlow;
    statusText = '偏低';
  }

  const expireText = getExpireText(info.expire, info.remainDays);
  const daysText = info.remainDays != null ? info.remainDays : null;
  const now = new Date();
  const refreshText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (ctx.widgetFamily === 'systemSmall') {
    return buildSmallWidget(C, { name, percent, remainPercent, statusColor, statusGlow, statusText, remain, daysText });
  }

  return buildMediumWidget(C, { name, percent, remainPercent, statusColor, statusGlow, statusText, remain, total, expireText, daysText, refreshText });
}

function buildSmallWidget(C, data) {
  const { name, percent, remainPercent, statusColor, statusGlow, statusText, remain, daysText } = data;
  
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [16, 16],
    children: [
      {
        type: 'stack',
        direction: 'column',
        gap: 10,
        children: [
          // 顶部：机场名 + 状态
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              {
                type: 'stack',
                direction: 'row',
                alignItems: 'center',
                gap: 5,
                children: [
                  { type: 'stack', width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor, children: [] },
                  { type: 'text', text: name.substring(0, 6), font: { size: 10, weight: 'semibold' }, textColor: C.textSecondary, maxLines: 1 }
                ]
              },
              { type: 'spacer' },
              { type: 'text', text: statusText, font: { size: 10, weight: 'bold' }, textColor: statusColor, maxLines: 1 }
            ]
          },
          
          // 中间：GitHub 风格流量格子
          {
            type: 'stack',
            alignItems: 'center',
            children: [
              buildContribGrid(C, percent, statusColor, 7, 7, 10, 3)
            ]
          },
          
          // 底部：数据
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              { type: 'text', text: formatBytesCompact(remain), font: { size: 16, weight: 'bold' }, textColor: C.textPrimary, maxLines: 1 },
              { type: 'spacer' },
              { type: 'text', text: `${Math.round(remainPercent)}%`, font: { size: 14, weight: 'semibold' }, textColor: statusColor, maxLines: 1 }
            ]
          }
        ]
      }
    ]
  };
}

function buildMediumWidget(C, data) {
  const { name, percent, remainPercent, statusColor, statusGlow, statusText, remain, total, expireText, daysText, refreshText } = data;
  
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [16, 18],
    children: [
      {
        type: 'stack',
        direction: 'column',
        gap: 14,
        children: [
          // 第一行：标题栏
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              // 左侧：图标 + 名称
              {
                type: 'stack',
                direction: 'row',
                alignItems: 'center',
                gap: 10,
                children: [
                  // 渐变圆角图标
                  {
                    type: 'stack',
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: { light: '#667EEA', dark: '#667EEA' },
                    alignItems: 'center',
                    justifyContent: 'center',
                    children: [
                      { type: 'text', text: '✈', font: { size: 18 } }
                    ]
                  },
                  {
                    type: 'stack',
                    direction: 'column',
                    gap: 2,
                    children: [
                      { type: 'text', text: name, font: { size: 15, weight: 'semibold' }, textColor: C.textPrimary, maxLines: 1 }
                    ]
                  }
                ]
              },
              
              { type: 'spacer' },
              
              // 右侧：状态标签
              {
                type: 'stack',
                padding: [5, 12],
                backgroundColor: statusGlow,
                borderRadius: 20,
                children: [
                  { 
                    type: 'text', 
                    text: statusText, 
                    font: { size: 12, weight: 'bold' }, 
                    textColor: statusColor, 
                    maxLines: 1 
                  }
                ]
              }
            ]
          },
          
          // 第二行：主数据区
          {
            type: 'stack',
            direction: 'row',
            gap: 16,
            children: [
              // 左侧：剩余流量大数字
              {
                type: 'stack',
                direction: 'column',
                gap: 4,
                flex: 1,
                children: [
                  {
                    type: 'text',
                    text: formatBytesLarge(remain),
                    font: { size: 32, weight: 'bold' },
                    textColor: C.textPrimary,
                    maxLines: 1
                  },
                  {
                    type: 'text',
                    text: '剩余流量',
                    font: { size: 12 },
                    textColor: C.textSecondary,
                    maxLines: 1
                  },
                  { type: 'spacer' },
                  // 进度条
                  buildProgressBar(C, percent, statusColor),
                  { type: 'spacer' },
                  // 详情
                  {
                    type: 'stack',
                    direction: 'column',
                    gap: 6,
                    children: [
                      buildDetailRow(C, '套餐总量', formatBytesCompact(total), true),
                      buildDetailRow(C, '到期时间', expireText.replace('到期 ', ''), true),
                      buildDetailRow(C, '剩余天数', daysText != null ? `${daysText} 天` : '永久', daysText != null && daysText <= 7),
                    ]
                  }
                ]
              },
              
              // 右侧：GitHub Contribution 风格流量格子
              {
                type: 'stack',
                alignItems: 'center',
                justifyContent: 'center',
                children: [
                  buildContribGrid(C, percent, statusColor, 7, 5, 12, 4)
                ]
              }
            ]
          },
          
          // 第三行：底部信息
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              { type: 'spacer' },
              { 
                type: 'text', 
                text: `刷新 ${refreshText}`, 
                font: { size: 10 }, 
                textColor: C.textTertiary, 
                maxLines: 1 
              }
            ]
          }
        ]
      }
    ]
  };
}

// GitHub Contribution 风格的流量格子图
function buildContribGrid(C, percent, statusColor, cols, rows, cellSize, cellGap) {
  const total = cols * rows;
  const filled = Math.max(1, Math.round((percent / 100) * total));
  const gridRows = [];
  
  for (let row = 0; row < rows; row++) {
    const cells = [];
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const isFilled = index < filled;
      const intensity = isFilled ? Math.min(4, Math.ceil((index + 1) / (filled / 4))) : 0;
      
      cells.push({
        type: 'stack',
        width: cellSize,
        height: cellSize,
        borderRadius: cellSize > 10 ? 3 : 2,
        backgroundColor: isFilled ? C.contribLevel[intensity] : C.contribLevel[0],
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

// Apple Fitness 风格的进度条
function buildProgressBar(C, percent, statusColor) {
  return {
    type: 'stack',
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: C.contribLevel[0],
    children: [
      {
        type: 'stack',
        width: `${percent}%`,
        height: 6,
        borderRadius: 3,
        backgroundColor: statusColor,
        children: []
      }
    ]
  };
}

// 详情行
function buildDetailRow(C, label, value, isWarning) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    children: [
      { type: 'text', text: label, font: { size: 11 }, textColor: C.textSecondary, maxLines: 1 },
      { type: 'spacer' },
      { type: 'text', text: value, font: { size: 11, weight: 'medium' }, textColor: isWarning ? C.statusOrange : C.textPrimary, maxLines: 1 }
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
      name: (env[`NAME${index}`] || '').trim() || `机场 ${index}`,
      resetDay: /^\d+$/.test(rawReset) ? Number(rawReset) : null
    });
  }
  return slots;
}

function buildLargeMultiWidget(C, infos) {
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [14, 16],
    children: [
      {
        type: 'stack',
        direction: 'column',
        gap: 8,
        children: infos.slice(0, 3).map(info => buildLargeAirportCard(C, info))
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
      padding: [12, 14],
      backgroundColor: C.card,
      borderRadius: 14,
      children: [
        { type: 'stack', width: 10, height: 10, borderRadius: 5, backgroundColor: C.statusRed, children: [] },
        { type: 'spacer', width: 8 },
        { type: 'text', text: `${info.name} 获取失败`, font: { size: 13, weight: 'medium' }, textColor: C.textPrimary, maxLines: 1 }
      ]
    };
  }

  const used = info.used || 0;
  const total = info.totalBytes || 0;
  const remain = Math.max(total - used, 0);
  const percent = total > 0 ? Math.min(Math.max((used / total) * 100, 0), 100) : 0;
  const remainPercent = 100 - percent;
  
  let statusColor = C.statusGreen;
  let statusGlow = C.statusGreenGlow;
  let statusText = '健康';
  if (remainPercent <= 5) {
    statusColor = C.statusRed;
    statusGlow = C.statusRedGlow;
    statusText = '紧急';
  } else if (remainPercent <= 15) {
    statusColor = C.statusOrange;
    statusGlow = C.statusOrangeGlow;
    statusText = '不足';
  } else if (remainPercent <= 30) {
    statusColor = C.statusYellow;
    statusGlow = C.statusYellowGlow;
    statusText = '偏低';
  }
  
  const expireText = getExpireText(info.expire, info.remainDays);
  const daysText = info.remainDays != null ? info.remainDays : null;

  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 12,
    padding: [10, 14],
    backgroundColor: C.card,
    borderRadius: 14,
    children: [
      // 左侧：状态指示
      {
        type: 'stack',
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: statusGlow,
        alignItems: 'center',
        justifyContent: 'center',
        children: [
          { type: 'text', text: `${Math.round(remainPercent)}%`, font: { size: 12, weight: 'bold' }, textColor: statusColor, maxLines: 1 }
        ]
      },
      
      // 中间：信息
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
              { type: 'text', text: info.name, font: { size: 13, weight: 'semibold' }, textColor: C.textPrimary, maxLines: 1 },
              {
                type: 'stack',
                padding: [2, 6],
                backgroundColor: statusGlow,
                borderRadius: 8,
                children: [
                  { type: 'text', text: statusText, font: { size: 10, weight: 'bold' }, textColor: statusColor, maxLines: 1 }
                ]
              }
            ]
          },
          {
            type: 'text',
            text: `剩余 ${formatBytesCompact(remain)} · ${expireText.replace('到期 ', '')}`,
            font: { size: 11 },
            textColor: C.textSecondary,
            maxLines: 1
          },
          // 进度条
          buildProgressBar(C, percent, statusColor)
        ]
      },
      
      // 右侧：GitHub 格子
      {
        type: 'stack',
        children: [
          buildContribGrid(C, percent, statusColor, 5, 3, 8, 2)
        ]
      }
    ]
  };
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
      {
        type: 'stack',
        direction: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        children: [
          { type: 'spacer' },
          { type: 'text', text: '📡', font: { size: 40 } },
          { type: 'spacer' },
          { type: 'text', text: '未配置订阅', font: { size: 18, weight: 'semibold' }, textColor: C.textPrimary },
          { type: 'spacer', height: 6 },
          { type: 'text', text: '请添加 URL 环境变量', font: { size: 12 }, textColor: C.textSecondary },
          { type: 'spacer' }
        ]
      }
    ] 
  };
}

function errorWidget(C, name) {
  return { 
    type: 'widget', 
    backgroundColor: C.bg, 
    padding: 24, 
    children: [
      {
        type: 'stack',
        direction: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        children: [
          { type: 'spacer' },
          { type: 'text', text: '⚠️', font: { size: 40 } },
          { type: 'spacer' },
          { type: 'text', text: `${name}`, font: { size: 18, weight: 'semibold' }, textColor: C.textPrimary },
          { type: 'spacer', height: 6 },
          { type: 'text', text: '获取失败 · 请检查网络', font: { size: 12 }, textColor: C.textSecondary },
          { type: 'spacer' }
        ]
      }
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

function formatBytesLarge(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 GB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  if (index >= 3) {
    return `${value.toFixed(1)} ${units[index]}`;
  }
  return `${Math.round(value)} ${units[index]}`;
}

function formatBytesCompact(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  if (value >= 100) {
    return `${Math.round(value)}${units[index]}`;
  }
  return `${value.toFixed(1)}${units[index]}`;
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