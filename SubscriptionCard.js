/******************************
脚本名称: SubscriptionCard
Version : v3.0.0
更新时间: 2026-06-27
平台: Egern
功能: 机场流量监控面板（旗舰质感版）
灵感来源: Apple Dashboard · V2ray Board · 霓虹美学
脚本作者：Nullwhy
优化改进：QClaw

v3.0.0 旗舰质感设计：
- 赛博朋克霓虹美学
- 全深色玻璃拟态卡片
- 多维度数据可视化
- 动态发光状态指示
- 实时时钟 + 刷新状态
- 机场性能指标展示
**********************************/

export default async function (ctx) {
  const url = (ctx.env.URL || ctx.env.URL1 || '').trim();
  const name = (ctx.env.NAME || ctx.env.NAME1 || '').trim() || 'SUBSCRIPTION';
  const rawReset = (ctx.env.RESET || ctx.env.RESET1 || '').trim();
  const resetDay = /^\d+$/.test(rawReset) ? Number(rawReset) : null;

  // 旗舰级配色系统
  const C = {
    // 深邃渐变背景
    bg: { light: '#0F0F23', dark: '#0A0A14' },
    bgOverlay: { light: 'rgba(15,15,35,0.95)', dark: 'rgba(10,10,20,0.98)' },
    
    // 玻璃拟态卡片
    glass: { light: 'rgba(255,255,255,0.03)', dark: 'rgba(255,255,255,0.02)' },
    glassBorder: { light: 'rgba(255,255,255,0.08)', dark: 'rgba(255,255,255,0.06)' },
    glassHighlight: { light: 'rgba(255,255,255,0.12)', dark: 'rgba(255,255,255,0.08)' },
    
    // 霓虹配色
    neonCyan: { light: '#00D4FF', dark: '#00D4FF' },
    neonGreen: { light: '#00FF88', dark: '#00FF88' },
    neonPurple: { light: '#A855F7', dark: '#A855F7' },
    neonPink: { light: '#FF006E', dark: '#FF006E' },
    neonOrange: { light: '#FF8C00', dark: '#FF8C00' },
    neonRed: { light: '#FF3366', dark: '#FF3366' },
    neonYellow: { light: '#FFD700', dark: '#FFD700' },
    
    // 文字层级
    textPrimary: { light: '#FFFFFF', dark: '#FFFFFF' },
    textSecondary: { light: '#A0A0B8', dark: '#8888A0' },
    textTertiary: { light: '#6B6B8A', dark: '#5A5A78' },
    textDim: { light: '#3D3D5C', dark: '#2D2D4A' },
    
    // 状态色（霓虹风格）
    statusOk: { light: '#00FF88', dark: '#00FF88', glow: 'rgba(0,255,136,0.3)' },
    statusWarn: { light: '#FFD700', dark: '#FFD700', glow: 'rgba(255,215,0,0.3)' },
    statusDanger: { light: '#FF3366', dark: '#FF3366', glow: 'rgba(255,51,102,0.3)' },
    statusOffline: { light: '#6B6B8A', dark: '#5A5A78', glow: 'rgba(107,107,138,0.2)' },
    
    // GitHub Contribution 霓虹绿
    contrib: [
      { light: '#1A1A2E', dark: '#16161D' }, // 0 空
      { light: '#0D4D3A', dark: '#0D4D3A' }, // 1 低
      { light: '#00A86B', dark: '#00A86B' }, // 2 中
      { light: '#00D4AA', dark: '#00D4AA' }, // 3 高
      { light: '#00FFAA', dark: '#00FFAA' }, // 4 满
    ],
  };

  // 大号组件多机场模式
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

  // 状态判断（霓虹风格）
  let status = C.statusOk;
  let statusLabel = '正常';
  let statusIcon = '●';
  if (remainPercent <= 5) {
    status = C.statusDanger;
    statusLabel = '紧急';
    statusIcon = '◉';
  } else if (remainPercent <= 15) {
    status = C.statusDanger;
    statusLabel = '不足';
    statusIcon = '◈';
  } else if (remainPercent <= 30) {
    status = C.statusWarn;
    statusLabel = '偏低';
    statusIcon = '◇';
  }

  const expireText = getExpireText(info.expire, info.remainDays);
  const daysText = info.remainDays != null ? info.remainDays : null;
  const now = new Date();
  const refreshText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const dateText = `${now.getMonth() + 1}/${now.getDate()}`;

  if (ctx.widgetFamily === 'systemSmall') {
    return buildSmallWidget(C, { name, percent, remainPercent, status, statusLabel, statusIcon, remain, daysText, refreshText });
  }

  return buildMediumWidget(C, { name, percent, remainPercent, status, statusLabel, statusIcon, remain, total, expireText, daysText, refreshText, dateText });
}

// ==================== 小号组件 ====================
function buildSmallWidget(C, data) {
  const { name, percent, remainPercent, status, statusLabel, statusIcon, remain, daysText, refreshText } = data;
  
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [14, 14],
    children: [
      // 顶部：状态 + 名称
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        children: [
          // 霓虹状态点
          { type: 'stack', width: 8, height: 8, borderRadius: 4, backgroundColor: status, children: [] },
          { type: 'spacer', width: 6 },
          { type: 'text', text: name.substring(0, 7), font: { size: 10, weight: 'semibold' }, textColor: C.textSecondary, maxLines: 1 }
        ]
      },
      
      // 主体：流量数字
      {
        type: 'stack',
        direction: 'column',
        alignItems: 'center',
        children: [
          // 主数字
          {
            type: 'text',
            text: formatBytesHero(remain),
            font: { size: 24, weight: 'bold' },
            textColor: C.textPrimary,
            maxLines: 1
          },
          { type: 'spacer', height: 2 },
          // 百分比
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            gap: 4,
            children: [
              { type: 'text', text: statusIcon, font: { size: 10 }, textColor: status, maxLines: 1 },
              { type: 'text', text: `${Math.round(remainPercent)}%`, font: { size: 12, weight: 'semibold' }, textColor: status, maxLines: 1 }
            ]
          }
        ]
      },
      
      // GitHub 格子
      {
        type: 'stack',
        alignItems: 'center',
        children: [
          buildContribGrid(C, percent, status, 7, 4, 9, 2)
        ]
      },
      
      // 底部：天数 + 时间
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        children: [
          { type: 'text', text: daysText != null ? `${daysText}d` : '∞', font: { size: 10 }, textColor: C.textTertiary, maxLines: 1 },
          { type: 'spacer' },
          { type: 'text', text: refreshText, font: { size: 9, design: 'monospaced' }, textColor: C.textDim, maxLines: 1 }
        ]
      }
    ]
  };
}

// ==================== 中号组件 ====================
function buildMediumWidget(C, data) {
  const { name, percent, remainPercent, status, statusLabel, statusIcon, remain, total, expireText, daysText, refreshText, dateText } = data;
  
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [16, 16],
    children: [
      // === 第一层：标题栏 ===
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
            gap: 10,
            children: [
              // 霓虹渐变图标
              {
                type: 'stack',
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: C.neonCyan,
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
                  { type: 'text', text: name, font: { size: 14, weight: 'bold' }, textColor: C.textPrimary, maxLines: 1 }
                ]
              }
            ]
          },
          
          { type: 'spacer' },
          
          // 右：状态标签
          {
            type: 'stack',
            padding: [5, 12],
            backgroundColor: status.glow,
            borderRadius: 20,
            children: [
              { 
                type: 'stack',
                direction: 'row',
                alignItems: 'center',
                gap: 5,
                children: [
                  { type: 'text', text: statusIcon, font: { size: 10 }, textColor: status, maxLines: 1 },
                  { type: 'text', text: statusLabel, font: { size: 12, weight: 'bold' }, textColor: status, maxLines: 1 }
                ]
              }
            ]
          }
        ]
      },
      
      // === 第二层：主数据区 ===
      {
        type: 'stack',
        direction: 'row',
        gap: 14,
        children: [
          // 左：数据面板
          {
            type: 'stack',
            direction: 'column',
            gap: 10,
            flex: 1,
            children: [
              // 剩余流量（大数字）
              {
                type: 'stack',
                direction: 'column',
                gap: 2,
                children: [
                  {
                    type: 'text',
                    text: formatBytesHero(remain),
                    font: { size: 36, weight: 'bold' },
                    textColor: C.textPrimary,
                    maxLines: 1
                  },
                  {
                    type: 'stack',
                    direction: 'row',
                    alignItems: 'center',
                    gap: 6,
                    children: [
                      { type: 'text', text: 'REMAINING', font: { size: 9, weight: 'semibold' }, textColor: C.textTertiary, maxLines: 1 },
                      { type: 'text', text: `${Math.round(remainPercent)}%`, font: { size: 11, weight: 'bold' }, textColor: status, maxLines: 1 }
                    ]
                  }
                ]
              },
              
              // 进度条
              {
                type: 'stack',
                width: '100%',
                height: 8,
                borderRadius: 4,
                backgroundColor: C.contrib[0],
                children: [
                  {
                    type: 'stack',
                    width: `${percent}%`,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: status,
                    children: []
                  }
                ]
              },
              
              // 详细数据网格
              {
                type: 'stack',
                direction: 'row',
                children: [
                  {
                    type: 'stack',
                    direction: 'column',
                    gap: 8,
                    flex: 1,
                    children: [
                      buildMetricItem(C, 'TOTAL', formatBytesCompact(total), C.textSecondary),
                      buildMetricItem(C, 'EXPIRE', expireText.split(' ')[1] || '-', C.textSecondary),
                    ]
                  },
                  {
                    type: 'stack',
                    direction: 'column',
                    gap: 8,
                    flex: 1,
                    children: [
                      buildMetricItem(C, 'DAYS', daysText != null ? `${daysText}` : '∞', daysText != null && daysText <= 7 ? C.statusWarn : C.textSecondary),
                      buildMetricItem(C, 'USED', formatBytesCompact(used), C.textSecondary),
                    ]
                  }
                ]
              }
            ]
          },
          
          // 右：GitHub 贡献图
          {
            type: 'stack',
            alignItems: 'center',
            justifyContent: 'center',
            padding: [8, 8],
            backgroundColor: C.glass,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.glassBorder,
            children: [
              buildContribGrid(C, percent, status, 7, 5, 11, 3)
            ]
          }
        ]
      },
      
      // === 第三层：底部状态栏 ===
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        padding: [6, 0, 0, 0],
        borderTopWidth: 1,
        borderColor: C.glassBorder,
        children: [
          // 实时时钟
          { 
            type: 'text', 
            text: `● LIVE ${refreshText}`, 
            font: { size: 9, design: 'monospaced' }, 
            textColor: C.neonCyan, 
            maxLines: 1 
          },
          { type: 'spacer' },
          { 
            type: 'text', 
            text: `${dateText}`, 
            font: { size: 9, design: 'monospaced' }, 
            textColor: C.textTertiary, 
            maxLines: 1 
          }
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
    padding: [14, 16],
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
              { type: 'text', text: '◈ AIRPORT MONITOR', font: { size: 10, weight: 'bold' }, textColor: C.neonCyan, maxLines: 1 },
              { type: 'spacer' },
              { type: 'text', text: `${infos.length} NODES`, font: { size: 10 }, textColor: C.textTertiary, maxLines: 1 }
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
      backgroundColor: C.glass,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.glassBorder,
      children: [
        { type: 'stack', width: 8, height: 8, borderRadius: 4, backgroundColor: C.statusOffline, children: [] },
        { type: 'spacer', width: 8 },
        { type: 'text', text: `${info.name} OFFLINE`, font: { size: 12, weight: 'semibold' }, textColor: C.textTertiary, maxLines: 1 }
      ]
    };
  }

  const used = info.used || 0;
  const total = info.totalBytes || 0;
  const remain = Math.max(total - used, 0);
  const percent = total > 0 ? Math.min(Math.max((used / total) * 100, 0), 100) : 0;
  const remainPercent = 100 - percent;
  
  let status = C.statusOk;
  let statusLabel = '正常';
  if (remainPercent <= 5) { status = C.statusDanger; statusLabel = '紧急'; }
  else if (remainPercent <= 15) { status = C.statusDanger; statusLabel = '不足'; }
  else if (remainPercent <= 30) { status = C.statusWarn; statusLabel = '偏低'; }
  
  const daysText = info.remainDays != null ? info.remainDays : null;
  const expireText = getExpireText(info.expire, info.remainDays);

  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 12,
    padding: [10, 12],
    backgroundColor: C.glass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.glassBorder,
    children: [
      // 左侧：百分比 + 状态
      {
        type: 'stack',
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: status.glow,
        alignItems: 'center',
        justifyContent: 'center',
        children: [
          { type: 'text', text: `${Math.round(remainPercent)}%`, font: { size: 16, weight: 'bold' }, textColor: status, maxLines: 1 }
        ]
      },
      
      // 中间：信息
      {
        type: 'stack',
        direction: 'column',
        gap: 5,
        flex: 1,
        children: [
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            gap: 8,
            children: [
              { type: 'text', text: info.name, font: { size: 13, weight: 'bold' }, textColor: C.textPrimary, maxLines: 1 },
              {
                type: 'stack',
                padding: [2, 8],
                backgroundColor: status.glow,
                borderRadius: 8,
                children: [
                  { type: 'text', text: statusLabel, font: { size: 10, weight: 'bold' }, textColor: status, maxLines: 1 }
                ]
              }
            ]
          },
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            gap: 12,
            children: [
              { type: 'text', text: formatBytesCompact(remain), font: { size: 12, weight: 'semibold' }, textColor: C.textSecondary, maxLines: 1 },
              { type: 'text', text: '/', font: { size: 10 }, textColor: C.textDim, maxLines: 1 },
              { type: 'text', text: formatBytesCompact(total), font: { size: 11 }, textColor: C.textTertiary, maxLines: 1 },
              { type: 'text', text: '·', font: { size: 10 }, textColor: C.textDim, maxLines: 1 },
              { type: 'text', text: daysText != null ? `${daysText}d` : '永久', font: { size: 10 }, textColor: C.textTertiary, maxLines: 1 }
            ]
          },
          // 进度条
          {
            type: 'stack',
            width: '100%',
            height: 4,
            borderRadius: 2,
            backgroundColor: C.contrib[0],
            children: [
              {
                type: 'stack',
                width: `${percent}%`,
                height: 4,
                borderRadius: 2,
                backgroundColor: status,
                children: []
              }
            ]
          }
        ]
      },
      
      // 右侧：GitHub 格子
      {
        type: 'stack',
        children: [
          buildContribGrid(C, percent, status, 5, 3, 7, 2)
        ]
      }
    ]
  };
}

// ==================== 辅助函数 ====================

// GitHub 贡献图霓虹版
function buildContribGrid(C, percent, status, cols, rows, cellSize, cellGap) {
  const total = cols * rows;
  const filled = Math.max(1, Math.round((percent / 100) * total));
  const gridRows = [];
  
  for (let row = 0; row < rows; row++) {
    const cells = [];
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const isFilled = index < filled;
      const intensity = isFilled ? Math.min(4, Math.ceil((index + 1) / Math.max(1, filled / 4))) : 0;
      
      cells.push({
        type: 'stack',
        width: cellSize,
        height: cellSize,
        borderRadius: cellSize > 8 ? 2 : 1,
        backgroundColor: isFilled ? C.contrib[intensity] : C.contrib[0],
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

// 数据指标项
function buildMetricItem(C, label, value, color) {
  return {
    type: 'stack',
    direction: 'column',
    gap: 2,
    children: [
      { type: 'text', text: label, font: { size: 9, weight: 'semibold' }, textColor: C.textTertiary, maxLines: 1 },
      { type: 'text', text: value, font: { size: 13, weight: 'bold' }, textColor: color, maxLines: 1 }
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
          { type: 'text', text: '✈', font: { size: 48 } },
          { type: 'spacer', height: 16 },
          { type: 'text', text: '未配置订阅', font: { size: 18, weight: 'bold' }, textColor: C.textPrimary },
          { type: 'spacer', height: 8 },
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
          { type: 'text', text: '⚠', font: { size: 48 } },
          { type: 'spacer', height: 16 },
          { type: 'text', text: `${name}`, font: { size: 18, weight: 'bold' }, textColor: C.statusDanger },
          { type: 'spacer', height: 8 },
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

// 英雄数字（用于大字体显示）
function formatBytesHero(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 GB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  if (index >= 3) {
    return `${value.toFixed(1)} ${units[index]}`;
  }
  return `${Math.round(value)} ${units[index]}`;
}

// 紧凑数字
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